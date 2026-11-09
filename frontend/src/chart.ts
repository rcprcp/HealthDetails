import type { TableData } from './types';

export interface ChartPoint {
  x: string;
  value: number;
}

export function buildChartPoints(data: TableData): ChartPoint[] {
  const chart = data.chart;
  if (!chart) {
    return [];
  }

  return data.rows
    .map((row) => ({
      x: String(row[chart.xKey] ?? ''),
      value: Number(row[chart.yKey]),
    }))
    .filter((point) => point.x !== '' && Number.isFinite(point.value))
    .sort((left, right) => left.x.localeCompare(right.x));
}
