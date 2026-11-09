package com.healthdetails.catalog;

import java.util.List;

/**
 * Describes how the UI should chart a view.
 *
 * @param type                 chart type understood by the frontend ("line" or "step")
 * @param xKey                 column used for the time/category axis
 * @param series               one or more lines to draw
 * @param averageLine          draw a horizontal line at the mean of every series
 * @param movingAveragePeriod  trailing moving-average window, or 0 to disable
 * @param stageKey             per-minute stage array column for hypnogram charts, or null
 * @param stages               stage-code mapping for hypnogram charts
 */
public record ChartSpec(
        String type,
        String xKey,
        List<ChartSeries> series,
        boolean averageLine,
        int movingAveragePeriod,
        String stageKey,
        List<ChartStage> stages
) {
    public ChartSpec {
        series = List.copyOf(series);
        stages = stages == null ? List.of() : List.copyOf(stages);
    }

    public ChartSpec(
            String type,
            String xKey,
            List<ChartSeries> series,
            boolean averageLine,
            int movingAveragePeriod) {
        this(type, xKey, series, averageLine, movingAveragePeriod, null, List.of());
    }
}
