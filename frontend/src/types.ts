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
  yMax: number | null;
  yMinPadding: number | null;
  yPadding: number | null;
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

export interface MonitorStatus {
  interval: string | null;
  label: string | null;
  cron: string | null;
  active: boolean;
  lastRun: string | null;
  nextRun: string | null;
  message: string;
}

export interface LiveReading {
  deviceId: string;
  ts: string;
  hr: number | null;
  spo2: number | null;
  bpSys: number | null;
  bpDia: number | null;
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
