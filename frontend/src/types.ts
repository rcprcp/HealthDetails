export type ViewKind = 'view' | 'table';

export interface ChartSpec {
  type: 'line';
  xKey: string;
  yKey: string;
  label: string;
  unit: string;
  color: string;
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
