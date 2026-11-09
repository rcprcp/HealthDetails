package com.healthdetails.catalog;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.NotFoundException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * The typed views that project fields out of {@code j2208.history.payload}.
 * Keeping this list explicit is both a feature (stable navigation order and
 * friendly labels) and a security boundary (no arbitrary SQL identifiers).
 */
@ApplicationScoped
public class TableCatalog {

    private static final List<TableDefinition> DEFINITIONS = List.of(
            new TableDefinition(
                    "v_hr",
                    "Heartrate",
                    "view",
                    "Heart-rate samples decoded from history.payload (type = 'hr').",
                    "device_time",
                    true,
                    new ChartSpec(
                            "line",
                            "device_time",
                            List.of(new ChartSeries("bpm", "Heart rate", "red.6", "bpm")),
                            false,
                            0)),
            new TableDefinition(
                    "v_spo2",
                    "SpO2",
                    "view",
                    "Blood-oxygen saturation samples decoded from history.payload (type = 'spo2_auto').",
                    "device_time",
                    true,
                    new ChartSpec(
                            "line",
                            "device_time",
                            List.of(new ChartSeries("percent", "SpO2", "blue.6", "%")),
                            true,
                            5)),
            new TableDefinition(
                    "v_hrv",
                    "HRV",
                    "view",
                    "HRV, stress and blood-pressure readings decoded from history.payload (type = 'hrv').",
                    "device_time",
                    true,
                    new ChartSpec(
                            "line",
                            "device_time",
                            List.of(new ChartSeries("hrv", "HRV", "teal.6", "ms")),
                            true,
                            5)),
            new TableDefinition(
                    "v_temp",
                    "Temperature",
                    "view",
                    "Axillary temperature samples decoded from history.payload (type = 'temp_axil').",
                    "device_time",
                    true,
                    new ChartSpec(
                            "line",
                            "device_time",
                            List.of(new ChartSeries("temp_c", "Temperature", "cyan.6", "°C")),
                            true,
                            5)),
            new TableDefinition(
                    "v_steps",
                    "Steps",
                    "view",
                    "Step, calorie and distance buckets decoded from history.payload (type = 'steps').",
                    "device_time",
                    true,
                    new ChartSpec(
                            "line",
                            "device_time",
                            List.of(
                                    new ChartSeries("steps", "Steps", "teal.6", ""),
                                    new ChartSeries(
                                            "calories_kcal",
                                            "Calories",
                                            "orange.6",
                                            "kcal",
                                            "right")),
                            false,
                            0,
                            null,
                            List.of(),
                            true)),
            new TableDefinition(
                    "v_sleep",
                    "Sleep",
                    "view",
                    "Sleep-stage totals and stage series decoded from history.payload (type = 'sleep').",
                    "device_time",
                    true,
                    new ChartSpec(
                            "step",
                            "device_time",
                            List.of(new ChartSeries("stage", "Sleep stage", "teal.6", "")),
                            false,
                            0,
                            "stages",
                            List.of(
                                    new ChartStage(1, "Deep", 1, "purple.6"),
                                    new ChartStage(2, "Light", 2, "blue.6"),
                                    new ChartStage(3, "REM", 3, "green.6"),
                                    new ChartStage(5, "Awake", 4, "orange.6")))),
            new TableDefinition(
                    "v_total",
                    "Totals",
                    "view",
                    "Daily activity totals decoded from history.payload (type = 'total').",
                    "device_time",
                    true,
                    null)
    );

    private static final Map<String, TableDefinition> BY_NAME = index(DEFINITIONS);

    public List<TableDefinition> all() {
        return DEFINITIONS;
    }

    public TableDefinition require(String name) {
        TableDefinition definition = BY_NAME.get(name);
        if (definition == null) {
            throw new NotFoundException("Unknown schema view: " + name);
        }
        return definition;
    }

    private static Map<String, TableDefinition> index(List<TableDefinition> definitions) {
        Map<String, TableDefinition> indexed = new LinkedHashMap<>();
        for (TableDefinition definition : definitions) {
            indexed.put(definition.name(), definition);
        }
        return Map.copyOf(indexed);
    }
}
