package com.healthdetails.service;

import com.healthdetails.api.BatteryStatus;
import com.healthdetails.api.ColumnInfo;
import com.healthdetails.api.LiveReading;
import com.healthdetails.api.LiveSnapshot;
import com.healthdetails.api.TableData;
import com.healthdetails.catalog.TableCatalog;
import com.healthdetails.catalog.TableDefinition;
import com.healthdetails.util.SqlIdentifiers;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@ApplicationScoped
public class SchemaService {

    public static final int MAX_LIMIT = 5000;

    private final DataSource dataSource;
    private final TableCatalog catalog;
    private final String schema;

    @Inject
    public SchemaService(
            DataSource dataSource,
            TableCatalog catalog,
            @ConfigProperty(name = "healthdetails.schema", defaultValue = "j2208") String schema) {
        this.dataSource = dataSource;
        this.catalog = catalog;
        this.schema = SqlIdentifiers.requireValid(schema);
    }

    public TableData fetch(String name, int requestedLimit, int requestedOffset) {
        TableDefinition definition = catalog.require(name);
        int limit = Math.min(MAX_LIMIT, Math.max(1, requestedLimit));
        int offset = Math.max(0, requestedOffset);
        String relation = SqlIdentifiers.quote(schema) + "." + SqlIdentifiers.quote(definition.relation());
        String from = relation
                + (definition.filter().isBlank() ? "" : " WHERE " + definition.filter());
        String sql = "SELECT " + definition.projection() + " FROM " + from
                + " ORDER BY " + SqlIdentifiers.quote(definition.sortColumn())
                + (definition.descending() ? " DESC" : " ASC")
                + " NULLS LAST LIMIT ? OFFSET ?";

        try (Connection connection = dataSource.getConnection()) {
            long total = count(connection, from);
            try (PreparedStatement statement = connection.prepareStatement(sql)) {
                statement.setInt(1, limit);
                statement.setInt(2, offset);
                try (ResultSet resultSet = statement.executeQuery()) {
                    ResultSetMetaData metadata = resultSet.getMetaData();
                    List<ColumnInfo> columns = readColumns(metadata);
                    List<Map<String, Object>> rows = readRows(resultSet, metadata);
                    return new TableData(
                            definition.name(),
                            definition.label(),
                            definition.kind(),
                            definition.description(),
                            columns,
                            rows,
                            total,
                            limit,
                            offset,
                            definition.chart());
                }
            }
        } catch (SQLException e) {
            throw new IllegalStateException("Could not read " + relation, e);
        }
    }

    public BatteryStatus latestBattery() {
        String relation = SqlIdentifiers.quote(schema) + "." + SqlIdentifiers.quote("battery");
        String sql = "SELECT device_id, ts, pct, mode FROM " + relation + " ORDER BY ts DESC LIMIT 1";

        try (Connection connection = dataSource.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql);
             ResultSet resultSet = statement.executeQuery()) {
            if (!resultSet.next()) {
                return null;
            }
            return new BatteryStatus(
                    resultSet.getString("device_id"),
                    resultSet.getInt("pct"),
                    resultSet.getObject("ts", OffsetDateTime.class).toString(),
                    resultSet.getString("mode"));
        } catch (SQLException e) {
            throw new IllegalStateException("Could not read " + relation, e);
        }
    }

    public LiveReading latestLive() {
        String live = SqlIdentifiers.quote(schema) + "." + SqlIdentifiers.quote("live");
        String devices = SqlIdentifiers.quote(schema) + "." + SqlIdentifiers.quote("devices");
        String sql = "SELECT device_id, ts, hr, spo2, bp_sys, bp_dia FROM " + live
                + " WHERE device_id = (SELECT device_id FROM " + devices
                + " ORDER BY last_seen DESC LIMIT 1)"
                + " ORDER BY ts DESC LIMIT 1";

        try (Connection connection = dataSource.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql);
             ResultSet resultSet = statement.executeQuery()) {
            if (!resultSet.next()) {
                return null;
            }
            return liveReading(resultSet);
        } catch (SQLException e) {
            throw new IllegalStateException("Could not read " + live, e);
        }
    }

    public LiveSnapshot latestSnapshot() {
        String live = SqlIdentifiers.quote(schema) + "." + SqlIdentifiers.quote("live");
        String devices = SqlIdentifiers.quote(schema) + "." + SqlIdentifiers.quote("devices");
        String sql = "SELECT device_id,"
                + " max(ts) FILTER (WHERE hr <> 0) AS hr_ts,"
                + " (array_agg(hr ORDER BY ts DESC) FILTER (WHERE hr <> 0))[1] AS hr,"
                + " max(ts) FILTER (WHERE spo2 <> 0) AS spo2_ts,"
                + " (array_agg(spo2 ORDER BY ts DESC) FILTER (WHERE spo2 <> 0))[1] AS spo2,"
                + " max(ts) FILTER (WHERE bp_sys <> 0) AS bp_sys_ts,"
                + " (array_agg(bp_sys ORDER BY ts DESC) FILTER (WHERE bp_sys <> 0))[1] AS bp_sys,"
                + " max(ts) FILTER (WHERE bp_dia <> 0) AS bp_dia_ts,"
                + " (array_agg(bp_dia ORDER BY ts DESC) FILTER (WHERE bp_dia <> 0))[1] AS bp_dia"
                + " FROM " + live
                + " WHERE device_id = (SELECT device_id FROM " + devices
                + " ORDER BY last_seen DESC LIMIT 1)"
                + " GROUP BY device_id";

        try (Connection connection = dataSource.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql);
             ResultSet resultSet = statement.executeQuery()) {
            if (!resultSet.next()) {
                return null;
            }
            return new LiveSnapshot(
                    resultSet.getString("device_id"),
                    metric(resultSet, "hr", "hr_ts"),
                    metric(resultSet, "spo2", "spo2_ts"),
                    metric(resultSet, "bp_sys", "bp_sys_ts"),
                    metric(resultSet, "bp_dia", "bp_dia_ts"));
        } catch (SQLException e) {
            throw new IllegalStateException("Could not read " + live, e);
        }
    }

    private static LiveSnapshot.MetricValue metric(ResultSet resultSet, String valueColumn, String tsColumn)
            throws SQLException {
        Integer value = nullableInt(resultSet, valueColumn);
        if (value == null) {
            return null;
        }
        return new LiveSnapshot.MetricValue(
                value, resultSet.getObject(tsColumn, OffsetDateTime.class).toString());
    }

    public List<LiveReading> recentLive(int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 500));
        String live = SqlIdentifiers.quote(schema) + "." + SqlIdentifiers.quote("live");
        String devices = SqlIdentifiers.quote(schema) + "." + SqlIdentifiers.quote("devices");
        String sql = "SELECT device_id, ts, hr, spo2, bp_sys, bp_dia FROM " + live
                + " WHERE device_id = (SELECT device_id FROM " + devices
                + " ORDER BY last_seen DESC LIMIT 1)"
                + " ORDER BY ts DESC LIMIT ?";

        List<LiveReading> readings = new ArrayList<>();
        try (Connection connection = dataSource.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setInt(1, safeLimit);
            try (ResultSet resultSet = statement.executeQuery()) {
                while (resultSet.next()) {
                    readings.add(liveReading(resultSet));
                }
            }
        } catch (SQLException e) {
            throw new IllegalStateException("Could not read " + live, e);
        }
        return readings;
    }

    private static LiveReading liveReading(ResultSet resultSet) throws SQLException {
        return new LiveReading(
                resultSet.getString("device_id"),
                resultSet.getObject("ts", OffsetDateTime.class).toString(),
                nullableInt(resultSet, "hr"),
                nullableInt(resultSet, "spo2"),
                nullableInt(resultSet, "bp_sys"),
                nullableInt(resultSet, "bp_dia"));
    }

    private static Integer nullableInt(ResultSet resultSet, String column) throws SQLException {
        Object value = resultSet.getObject(column);
        return value == null ? null : ((Number) value).intValue();
    }

    private static long count(Connection connection, String from) throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet resultSet = statement.executeQuery("SELECT count(*) FROM " + from)) {
            resultSet.next();
            return resultSet.getLong(1);
        }
    }

    private static List<ColumnInfo> readColumns(ResultSetMetaData metadata) throws SQLException {
        List<ColumnInfo> columns = new ArrayList<>(metadata.getColumnCount());
        for (int i = 1; i <= metadata.getColumnCount(); i++) {
            columns.add(new ColumnInfo(
                    metadata.getColumnLabel(i),
                    metadata.getColumnTypeName(i),
                    metadata.isNullable(i) != ResultSetMetaData.columnNoNulls));
        }
        return List.copyOf(columns);
    }

    private static List<Map<String, Object>> readRows(ResultSet resultSet, ResultSetMetaData metadata)
            throws SQLException {
        List<Map<String, Object>> rows = new ArrayList<>();
        while (resultSet.next()) {
            Map<String, Object> row = new LinkedHashMap<>();
            for (int i = 1; i <= metadata.getColumnCount(); i++) {
                row.put(
                        metadata.getColumnLabel(i),
                        ValueFormatter.toJsonValue(
                                resultSet,
                                i,
                                metadata.getColumnType(i),
                                metadata.getColumnTypeName(i)));
            }
            rows.add(row);
        }
        return List.copyOf(rows);
    }
}
