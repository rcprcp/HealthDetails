package com.healthdetails.catalog;

import jakarta.ws.rs.NotFoundException;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TableCatalogTest {

    private final TableCatalog catalog = new TableCatalog();

    @Test
    void exposesEveryJsonBackedViewInDisplayOrder() {
        List<String> names = catalog.all().stream().map(TableDefinition::name).toList();

        assertEquals(
                List.of("v_hr", "v_spo2", "v_hrv", "v_temp", "v_steps", "v_sleep", "v_total"),
                names);
    }

    @Test
    void heartrateSpo2HrvTemperatureAndSleepHaveCharts() {
        Set<String> charted = catalog.all().stream()
                .filter(TableDefinition::hasChart)
                .map(TableDefinition::name)
                .collect(Collectors.toSet());

        assertEquals(Set.of("v_hr", "v_spo2", "v_hrv", "v_temp", "v_sleep"), charted);
    }

    @Test
    void chartKeysPointAtTheProjectedColumns() {
        TableDefinition heartrate = catalog.require("v_hr");
        assertEquals("device_time", heartrate.chart().xKey());
        assertEquals("bpm", heartrate.chart().series().getFirst().key());

        TableDefinition spo2 = catalog.require("v_spo2");
        assertEquals("device_time", spo2.chart().xKey());
        assertEquals("percent", spo2.chart().series().getFirst().key());

        TableDefinition hrv = catalog.require("v_hrv");
        assertEquals("device_time", hrv.chart().xKey());
        assertEquals("hrv", hrv.chart().series().getFirst().key());
        assertTrue(hrv.chart().averageLine());
        assertEquals(5, hrv.chart().movingAveragePeriod());

        TableDefinition temperature = catalog.require("v_temp");
        assertEquals("device_time", temperature.chart().xKey());
        assertEquals("temp_c", temperature.chart().series().getFirst().key());
        assertTrue(temperature.chart().averageLine());
        assertEquals(5, temperature.chart().movingAveragePeriod());

        TableDefinition sleep = catalog.require("v_sleep");
        assertEquals("step", sleep.chart().type());
        assertEquals("device_time", sleep.chart().xKey());
        assertEquals("stages", sleep.chart().stageKey());
        assertEquals("stage", sleep.chart().series().getFirst().key());
        assertEquals(
                List.of(1, 2, 3, 5),
                sleep.chart().stages().stream().map(ChartStage::code).toList());
        assertEquals(
                List.of("Deep", "Light", "REM", "Awake"),
                sleep.chart().stages().stream().map(ChartStage::label).toList());
        assertFalse(sleep.chart().averageLine());
        assertEquals(0, sleep.chart().movingAveragePeriod());

        assertFalse(heartrate.chart().averageLine());
        assertEquals(0, heartrate.chart().movingAveragePeriod());
        assertTrue(spo2.chart().averageLine());
        assertEquals(5, spo2.chart().movingAveragePeriod());
    }

    @Test
    void rejectsRelationsOutsideTheAllowList() {
        assertThrows(NotFoundException.class, () -> catalog.require("history"));
        assertThrows(NotFoundException.class, () -> catalog.require("devices; drop table devices"));
    }
}
