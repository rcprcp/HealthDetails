package com.healthdetails.api;

public record MonitorStatus(
        String interval,
        String label,
        String cron,
        boolean active,
        String lastRun,
        String nextRun,
        String message
) {
}
