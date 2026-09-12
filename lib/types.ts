// ============================================================
// Core Data Types
// ============================================================

export interface DataPoint {
  timestamp: number; // Unix ms
  value: number;
  category: DataCategory;
  metadata?: Record<string, unknown>;
}

export type DataCategory =
  | "cpu"
  | "memory"
  | "network"
  | "latency"
  | "throughput";

export const DATA_CATEGORIES: DataCategory[] = [
  "cpu",
  "memory",
  "network",
  "latency",
  "throughput",
];

// ============================================================
// Chart Configuration
// ============================================================

export type ChartType = "line" | "bar" | "scatter" | "heatmap";

export interface ChartConfig {
  id: string;
  type: ChartType;
  dataKey: DataCategory;
  color: string;
  visible: boolean;
  label: string;
}

export const CATEGORY_COLORS: Record<DataCategory, string> = {
  cpu: "#60a5fa",        // blue
  memory: "#a78bfa",     // purple
  network: "#34d399",    // green
  latency: "#fbbf24",    // amber
  throughput: "#f87171", // red
};

// ============================================================
// Performance Metrics
// ============================================================

export interface PerformanceMetrics {
  fps: number;
  memoryUsageMB: number;
  renderTimeMs: number;
  dataProcessingTimeMs: number;
  dataPointCount: number;
  frameHistory: number[]; // last 60 FPS values
}

export const DEFAULT_PERFORMANCE_METRICS: PerformanceMetrics = {
  fps: 0,
  memoryUsageMB: 0,
  renderTimeMs: 0,
  dataProcessingTimeMs: 0,
  dataPointCount: 0,
  frameHistory: [],
};

// ============================================================
// Time Range & Filtering
// ============================================================

export type Granularity = "1min" | "5min" | "1hour";

export interface TimeRange {
  start: number; // Unix ms
  end: number;   // Unix ms
  granularity: Granularity;
}

export type TimePreset = "1min" | "5min" | "1hour" | "all";

export interface FilterState {
  categories: DataCategory[];
  timeRange: TimeRange;
  dataPointLimit: number;
  activePreset: TimePreset;
}

export function createDefaultFilterState(): FilterState {
  const now = Date.now();
  return {
    categories: [...DATA_CATEGORIES],
    timeRange: {
      start: now - 5 * 60 * 1000,
      end: now,
      granularity: "1min",
    },
    dataPointLimit: 10000,
    activePreset: "5min",
  };
}

// Keep a static export for non-hydration contexts (e.g. types/defaults)
export const DEFAULT_FILTER_STATE: FilterState = {
  categories: [...DATA_CATEGORIES],
  timeRange: {
    start: 0,
    end: 0,
    granularity: "1min",
  },
  dataPointLimit: 10000,
  activePreset: "5min",
};

// ============================================================
// Aggregated Data
// ============================================================

export interface AggregatedPoint {
  timestamp: number;
  category: DataCategory;
  avg: number;
  min: number;
  max: number;
  count: number;
}

// ============================================================
// Canvas / Chart Geometry
// ============================================================

export interface ChartPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const DEFAULT_CHART_PADDING: ChartPadding = {
  top: 40,
  right: 20,
  bottom: 50,
  left: 65,
};

export interface ChartArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point2D {
  x: number;
  y: number;
}

// ============================================================
// Web Worker Messages
// ============================================================

export interface WorkerRequest {
  type: "aggregate";
  data: DataPoint[];
  granularity: Granularity;
  categories: DataCategory[];
}

export interface WorkerResponse {
  type: "aggregated";
  result: AggregatedPoint[];
  processingTimeMs: number;
}

// ============================================================
// Dashboard Context State
// ============================================================

export interface DashboardState {
  data: DataPoint[];
  isStreaming: boolean;
  filter: FilterState;
  chartConfigs: ChartConfig[];
  metrics: PerformanceMetrics;
  stressTestMode: boolean;
  updateIntervalMs: number;
}

export interface DashboardActions {
  toggleStream: () => void;
  setFilter: (filter: Partial<FilterState>) => void;
  toggleCategory: (category: DataCategory) => void;
  setDataPointLimit: (limit: number) => void;
  setTimePreset: (preset: TimePreset) => void;
  setGranularity: (granularity: Granularity) => void;
  toggleStressTest: () => void;
  setUpdateInterval: (ms: number) => void;
  updateMetrics: (metrics: Partial<PerformanceMetrics>) => void;
}

// ============================================================
// Saved Dashboard Config (for Server Actions)
// ============================================================

export interface DashboardConfig {
  chartConfigs: ChartConfig[];
  filter: FilterState;
  savedAt: number;
}
