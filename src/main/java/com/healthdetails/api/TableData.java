package com.healthdetails.api;

import com.healthdetails.catalog.ChartSpec;

import java.util.List;
import java.util.Map;

public record TableData(
        String name,
        String label,
        String kind,
        String description,
        List<ColumnInfo> columns,
        List<Map<String, Object>> rows,
        long total,
        int limit,
        int offset,
        ChartSpec chart
) {
}
