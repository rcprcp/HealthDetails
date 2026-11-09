import type { ChartSpec, TableData } from './types';

export type ChartPoint = {
  x: string;
} & Record<string, string | number | null | undefined>;

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

function addMinutes(iso: string, minutes: number): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setMinutes(date.getMinutes() + minutes);
  const pad = (value: number) => String(value).padStart(2, '0');

  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
  ].join('T');
}

function parseStages(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value.map(Number).filter((code) => Number.isFinite(code));
  }

  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.map(Number).filter((code) => Number.isFinite(code))
        : [];
    } catch {
      return [];
    }
  }

  return [];
}

function buildStagePoints(data: TableData, chart: ChartSpec): ChartPoint[] {
  const stageKey = chart.stageKey;
  if (!stageKey) {
    return [];
  }

  const stageByCode = new Map(chart.stages.map((stage) => [stage.code, stage]));
  const records = data.rows
    .map((row) => ({
      start: String(row[chart.xKey] ?? ''),
      stages: parseStages(row[stageKey]),
    }))
    .filter((record) => record.start !== '' && record.stages.length > 0)
    .sort((left, right) => left.start.localeCompare(right.start));

  const pointsByTime = new Map<string, ChartPoint>();

  records.forEach((record, recordIndex) => {
    record.stages.forEach((code, minute) => {
      const stage = stageByCode.get(code);
      if (!stage) {
        return;
      }

      const x = addMinutes(record.start, minute);
      if (!x) {
        return;
      }

      pointsByTime.set(x, { x, stage: stage.level, stageLabel: stage.label });
    });

    const lastCode = record.stages[record.stages.length - 1];
    const lastStage = stageByCode.get(lastCode);
    const end = addMinutes(record.start, record.stages.length);

    if (lastStage && end) {
      pointsByTime.set(end, { x: end, stage: lastStage.level, stageLabel: lastStage.label });
    }

    const next = records[recordIndex + 1];
    if (next && end && next.start > end) {
      const breakAt = addMinutes(end, 1);
      if (breakAt && breakAt < next.start) {
        pointsByTime.set(breakAt, { x: breakAt, stage: null });
      }
    }
  });

  return [...pointsByTime.values()].sort((left, right) => left.x.localeCompare(right.x));
}

export function buildChartPoints(data: TableData): ChartPoint[] {
  const chart = data.chart;
  if (!chart) {
    return [];
  }

  if (chart.stageKey) {
    return buildStagePoints(data, chart);
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
