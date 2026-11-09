export type ViewKind = 'view' | 'table';

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
  unit: string;
  yAxisId: 'left' | 'right' | null;
}

export interface ChartStage {
  code: number;
  label: string;
  level: number;
  color: string;
}

export interface ChartSpec {
  type: 'line' | 'step';
  xKey: string;
  series: ChartSeries[];
  averageLine: boolean;
  movingAveragePeriod: number;
  stageKey: string | null;
  stages: ChartStage[];
  cumulative: boolean;
}

export interface ViewSummary {
  name: string;
  label: string;
  kind: ViewKind;
  description: string;
  chart: boolean;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
}

export interface BatteryStatus {
  deviceId: string;
  percent: number;
  ts: string;
  mode: string;
}

export interface HeaderStats {
  label: string;
  distanceKm: number | null;
}

export interface TableData {
  name: string;
  label: string;
  kind: ViewKind;
  description: string;
  columns: ColumnInfo[];
  rows: Record<string, unknown>[];
  total: number;
  limit: number;
  offset: number;
  chart: ChartSpec | null;
}
