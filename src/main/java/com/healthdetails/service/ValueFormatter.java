package com.healthdetails.service;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.OffsetTime;
import java.util.Locale;

/**
 * Converts JDBC values into JSON-friendly values without leaking driver
 * objects into Jackson.
 */
public final class ValueFormatter {

    private ValueFormatter() {
    }

    public static Object toJsonValue(ResultSet resultSet, int index, int sqlType, String typeName)
            throws SQLException {
        String type = typeName == null ? "" : typeName.toLowerCase(Locale.ROOT);

        return switch (type) {
            case "timestamptz", "timestamp with time zone" ->
                    text(resultSet.getObject(index, OffsetDateTime.class));
            case "timestamp" -> text(resultSet.getObject(index, LocalDateTime.class));
            case "date" -> text(resultSet.getObject(index, LocalDate.class));
            case "time" -> text(resultSet.getObject(index, LocalTime.class));
            case "timetz", "time with time zone" -> text(resultSet.getObject(index, OffsetTime.class));
            case "bytea" -> binary(resultSet.getBytes(index));
            default -> switch (sqlType) {
                case Types.BINARY, Types.VARBINARY, Types.LONGVARBINARY -> binary(resultSet.getBytes(index));
                case Types.ARRAY -> array(resultSet.getArray(index));
                case Types.OTHER -> resultSet.getString(index); // jsonb, uuid, ...
                default -> primitiveOrText(resultSet.getObject(index));
            };
        };
    }

    private static Object text(Object value) {
        return value == null ? null : value.toString();
    }

    private static Object binary(byte[] value) {
        return value == null ? null : "<binary " + value.length + " bytes>";
    }

    private static Object array(java.sql.Array value) throws SQLException {
        if (value == null) {
            return null;
        }
        try {
            return value.toString();
        } finally {
            value.free();
        }
    }

    private static Object primitiveOrText(Object value) {
        if (value == null
                || value instanceof Number
                || value instanceof Boolean
                || value instanceof String) {
            return value;
        }
        return value.toString();
    }
}
