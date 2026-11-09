package com.healthdetails.catalog;

/**
 * One sleep-stage code used by the band's per-minute stage series.
 *
 * @param code  raw byte from {@code history.payload.stages}
 * @param label display label
 * @param level y-axis level, with higher levels drawn above lower ones
 * @param color Mantine color used for the stage legend
 */
public record ChartStage(
        int code,
        String label,
        int level,
        String color
) {
}
