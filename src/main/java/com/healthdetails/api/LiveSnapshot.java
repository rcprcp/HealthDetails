package com.healthdetails.api;

public record LiveSnapshot(
        String deviceId,
        MetricValue hr,
        MetricValue spo2,
        MetricValue bpSys,
        MetricValue bpDia
) {

    public record MetricValue(Integer value, String ts) {
    }
}
