package com.healthdetails.monitor;

import jakarta.ws.rs.BadRequestException;

public enum MonitorInterval {
    ONE_MINUTE("1m", "1 minute", "0 * * * * ?"),
    TWO_HOURS("2h", "2 hours", "0 0 */2 * * ?");

    private final String value;
    private final String label;
    private final String cron;

    MonitorInterval(String value, String label, String cron) {
        this.value = value;
        this.label = label;
        this.cron = cron;
    }

    public String value() {
        return value;
    }

    public String label() {
        return label;
    }

    public String cron() {
        return cron;
    }

    public static MonitorInterval fromValue(String value) {
        if (value == null || value.isBlank()) {
            throw new BadRequestException("interval is required");
        }

        for (MonitorInterval interval : values()) {
            if (interval.value.equalsIgnoreCase(value) || interval.name().equalsIgnoreCase(value)) {
                return interval;
            }
        }

        throw new BadRequestException("Unknown monitor interval: " + value);
    }
}
