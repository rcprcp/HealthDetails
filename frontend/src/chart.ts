import type { TableData } from './types';

export type ChartPoint = {
  x: string;
} & Record<string, string | number | undefined>;

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function toNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function mean(values: number[]): number {
  return round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function buildChartPoints(data: TableData): ChartPoint[] {
  const chart = data.chart;
  if (!chart) {
    return [];
  }

  const rawPoints = data.rows
    .map((row) => {
      const point: ChartPoint = { x: String(row[chart.xKey] ?? '') };

      for (const series of chart.series) {
        point[series.key] = toNumber(row[series.key]);
      }

      return point;
    })
    .filter(
      (point) =>
        point.x !== '' &&
        chart.series.some((series) => typeof point[series.key] === 'number'),
    )
    .sort((left, right) => left.x.localeCompare(right.x));

  if (rawPoints.length === 0) {
    return [];
  }

  const points = rawPoints.map((point) => ({ ...point }));

  for (const series of chart.series) {
    const values = rawPoints
      .map((point) => point[series.key])
      .filter((value): value is number => typeof value === 'number');

    if (values.length === 0) {
      continue;
    }

    if (chart.averageLine) {
      const average = mean(values);
      for (const point of points) {
        point[`${series.key}_average`] = average;
      }
    }

    if (chart.movingAveragePeriod > 1) {
      const period = chart.movingAveragePeriod;
      for (let index = 0; index < points.length; index += 1) {
        const window = rawPoints
          .slice(Math.max(0, index - period + 1), index + 1)
          .map((point) => point[series.key])
          .filter((value): value is number => typeof value === 'number');

        if (window.length > 0) {
          points[index][`${series.key}_movingAverage`] = mean(window);
        }
      }
    }
  }

  return points;
}
