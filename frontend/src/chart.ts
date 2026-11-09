import type { TableData } from './types';

export interface ChartPoint {
  x: string;
  value: number;
  average?: number;
  movingAverage?: number;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildChartPoints(data: TableData): ChartPoint[] {
  const chart = data.chart;
  if (!chart) {
    return [];
  }

  const rawPoints = data.rows
    .map((row) => ({
      x: String(row[chart.xKey] ?? ''),
      value: Number(row[chart.yKey]),
    }))
    .filter((point) => point.x !== '' && Number.isFinite(point.value))
    .sort((left, right) => left.x.localeCompare(right.x));

  if (rawPoints.length === 0) {
    return [];
  }

  const overallAverage = chart.averageLine
    ? rawPoints.reduce((sum, point) => sum + point.value, 0) / rawPoints.length
    : undefined;
  const period = chart.movingAveragePeriod;

  return rawPoints.map((point, index) => {
    const enriched: ChartPoint = { ...point };

    if (overallAverage !== undefined) {
      enriched.average = round(overallAverage);
    }

    if (period > 1) {
      const window = rawPoints.slice(Math.max(0, index - period + 1), index + 1);
      enriched.movingAverage = round(
        window.reduce((sum, item) => sum + item.value, 0) / window.length,
      );
    }

    return enriched;
  });
}
