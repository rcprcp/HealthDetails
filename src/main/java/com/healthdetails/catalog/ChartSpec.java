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
 * @param cumulative           accumulate each series over time
 * @param yMax                 optional hard maximum for the y-axis, or null
 * @param yMinPadding          optional padding below the lowest value, or null
 * @param yPadding             optional symmetric padding above and below the data, or null
 */
public record ChartSpec(
        String type,
        String xKey,
        List<ChartSeries> series,
        boolean averageLine,
        int movingAveragePeriod,
        String stageKey,
        List<ChartStage> stages,
        boolean cumulative,
        Double yMax,
        Integer yMinPadding,
        Double yPadding
) {
    public ChartSpec {
        series = List.copyOf(series);
        stages = stages == null ? List.of() : List.copyOf(stages);
        if (yMax != null && (!Double.isFinite(yMax) || yMax <= 0)) {
            throw new IllegalArgumentException("yMax must be positive and finite");
        }
        if (yMinPadding != null && yMinPadding < 0) {
            throw new IllegalArgumentException("yMinPadding must be non-negative");
        }
        if (yPadding != null && (!Double.isFinite(yPadding) || yPadding < 0)) {
            throw new IllegalArgumentException("yPadding must be non-negative and finite");
        }
    }

    public ChartSpec(
            String type,
            String xKey,
            List<ChartSeries> series,
            boolean averageLine,
            int movingAveragePeriod) {
        this(type, xKey, series, averageLine, movingAveragePeriod, null, List.of(),
                false, null, null, null);
    }

    public ChartSpec(
            String type,
            String xKey,
            List<ChartSeries> series,
            boolean averageLine,
            int movingAveragePeriod,
            String stageKey,
            List<ChartStage> stages) {
        this(type, xKey, series, averageLine, movingAveragePeriod, stageKey, stages,
                false, null, null, null);
    }

    public ChartSpec(
            String type,
            String xKey,
            List<ChartSeries> series,
            boolean averageLine,
            int movingAveragePeriod,
            String stageKey,
            List<ChartStage> stages,
            boolean cumulative) {
        this(type, xKey, series, averageLine, movingAveragePeriod, stageKey, stages,
                cumulative, null, null, null);
    }

    public ChartSpec(
            String type,
            String xKey,
            List<ChartSeries> series,
            boolean averageLine,
            int movingAveragePeriod,
            boolean cumulative,
            Double yMax,
            Integer yMinPadding) {
        this(type, xKey, series, averageLine, movingAveragePeriod, null, List.of(),
                cumulative, yMax, yMinPadding, null);
    }

    public ChartSpec(
            String type,
            String xKey,
            List<ChartSeries> series,
            boolean averageLine,
            int movingAveragePeriod,
            Double yPadding) {
        this(type, xKey, series, averageLine, movingAveragePeriod, null, List.of(),
                false, null, null, yPadding);
    }
}
