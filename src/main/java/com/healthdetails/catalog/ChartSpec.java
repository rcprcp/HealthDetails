package com.healthdetails.catalog;

/**
 * Describes how the UI should chart a view.
 *
 * @param type                 chart type understood by the frontend (currently only "line")
 * @param xKey                 column used for the time/category axis
 * @param yKey                 column used for the numeric series
 * @param label                human readable series label
 * @param unit                 unit suffix, for example "bpm" or "%"
 * @param color                Mantine series color, for example "red.6"
 * @param averageLine          draw a horizontal line at the mean of all points
 * @param movingAveragePeriod  trailing moving-average window, or 0 to disable
 */
public record ChartSpec(
        String type,
        String xKey,
        String yKey,
        String label,
        String unit,
        String color,
        boolean averageLine,
        int movingAveragePeriod
) {
}
