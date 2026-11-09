package com.healthdetails.catalog;

/**
 * A read-only relation that the UI is allowed to query. The catalog doubles as
 * an allow-list so relation names never come straight from the request.
 */
public record TableDefinition(
        String name,
        String label,
        String kind,
        String description,
        String sortColumn,
        boolean descending,
        ChartSpec chart
) {
    public boolean hasChart() {
        return chart != null;
    }
}
