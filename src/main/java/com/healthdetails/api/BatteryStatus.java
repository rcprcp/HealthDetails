package com.healthdetails.api;

public record BatteryStatus(
        String deviceId,
        int percent,
        String ts,
        String mode
) {
}
