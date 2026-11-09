package com.healthdetails.catalog;

/**
 * One line in a chart. The key is the projected view column, for example
 * {@code deep_min} or {@code percent}.
 */
public record ChartSeries(
        String key,
        String label,
        String color,
        String unit
) {
}
