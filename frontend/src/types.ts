export type ViewKind = 'view' | 'table';

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
  unit: string;
}

export interface ChartSpec {
  type: 'line';
  xKey: string;
  series: ChartSeries[];
  averageLine: boolean;
  movingAveragePeriod: number;
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
