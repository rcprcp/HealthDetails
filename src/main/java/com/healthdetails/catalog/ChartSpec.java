package com.healthdetails.catalog;

import java.util.List;

/**
 * Describes how the UI should chart a view.
 *
 * @param type                 chart type understood by the frontend (currently only "line")
 * @param xKey                 column used for the time/category axis
 * @param series               one or more lines to draw
 * @param averageLine          draw a horizontal line at the mean of every series
 * @param movingAveragePeriod  trailing moving-average window, or 0 to disable
 */
public record ChartSpec(
        String type,
        String xKey,
        List<ChartSeries> series,
        boolean averageLine,
        int movingAveragePeriod
) {
    public ChartSpec {
        series = List.copyOf(series);
    }
}
