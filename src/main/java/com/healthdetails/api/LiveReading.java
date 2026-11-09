package com.healthdetails.api;

public record LiveReading(
        String deviceId,
        String ts,
        Integer hr,
        Integer spo2,
        Integer bpSys,
        Integer bpDia
) {
}
