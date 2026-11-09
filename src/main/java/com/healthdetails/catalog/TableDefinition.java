package com.healthdetails.catalog;

/**
 * A read-only relation that the UI is allowed to query. The catalog doubles as
 * an allow-list so relation names never come straight from the request.
 *
 * <p>{@code relation} is the quoted SQL relation to read. {@code projection} is
 * the trusted column list, which lets a tab expose only the columns it needs and
 * derive values such as pulse pressure. {@code filter} is an optional trusted
 * SQL predicate; an empty string means no filter.</p>
 */
public record TableDefinition(
        String name,
        String label,
        String kind,
        String description,
        String sortColumn,
        boolean descending,
        ChartSpec chart,
        String relation,
        String projection,
        String filter
) {
    public TableDefinition(
            String name,
            String label,
            String kind,
            String description,
            String sortColumn,
            boolean descending,
            ChartSpec chart) {
        this(name, label, kind, description, sortColumn, descending, chart, name, "*", "");
    }

    public boolean hasChart() {
        return chart != null;
    }
}
