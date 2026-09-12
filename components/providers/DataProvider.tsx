"use client";

import React, {
  createContext,
  useContext,
  useCallback,
  useTransition,
  useState,
  useMemo,
  useDeferredValue,
} from "react";
import {
  DataPoint,
  FilterState,
  ChartConfig,
  PerformanceMetrics,
  DashboardState,
  DashboardActions,
  DEFAULT_FILTER_STATE,
  createDefaultFilterState,
  DEFAULT_PERFORMANCE_METRICS,
  DataCategory,
  TimePreset,
  Granularity,
  DATA_CATEGORIES,
  CATEGORY_COLORS,
  ChartType,
} from "@/lib/types";
import { useDataStream } from "@/hooks/useDataStream";
import { usePerformanceMonitor } from "@/hooks/usePerformanceMonitor";

// ============================================================
// Default Chart Configs
// ============================================================

const DEFAULT_CHART_CONFIGS: ChartConfig[] = DATA_CATEGORIES.map((cat, i) => ({
  id: cat,
  type: (["line", "bar", "scatter", "heatmap"] as ChartType[])[i % 4],
  dataKey: cat,
  color: CATEGORY_COLORS[cat],
  visible: true,
  label: cat.charAt(0).toUpperCase() + cat.slice(1),
}));

// ============================================================
// Context Type
// ============================================================

type DashboardContextType = DashboardState &
  DashboardActions & {
    metrics: PerformanceMetrics;
    filteredData: DataPoint[];     // live data for charts
    tableData: DataPoint[];        // deferred data for DataTable (lower priority)
    updateMetrics: (m: Partial<PerformanceMetrics>) => void;
  };

const DashboardContext = createContext<DashboardContextType | null>(null);

// ============================================================
// Provider
// ============================================================

interface DataProviderProps {
  children: React.ReactNode;
  initialData?: DataPoint[];
}

export function DataProvider({ children, initialData = [] }: DataProviderProps) {
  const [filter, setFilterState] = useState<FilterState>(() => createDefaultFilterState());
  const [chartConfigs, setChartConfigs] = useState<ChartConfig[]>(DEFAULT_CHART_CONFIGS);
  const [stressTestMode, setStressTestMode] = useState(false);
  const [updateIntervalMs, setUpdateIntervalMs] = useState(150);
  const [, startTransition] = useTransition();

  const { data, isStreaming, dataPointCount, toggleStream } = useDataStream({
    initialData,
    intervalMs: updateIntervalMs,
    maxPoints: filter.dataPointLimit,
    stressTestMode,
  });

  const perfMetrics = usePerformanceMonitor(dataPointCount);

  // ---- Filter actions (wrapped in useTransition for non-blocking updates) ----

  const setFilter = useCallback((partial: Partial<FilterState>) => {
    startTransition(() => {
      setFilterState((prev) => ({ ...prev, ...partial }));
    });
  }, []);

  const toggleCategory = useCallback((category: DataCategory) => {
    startTransition(() => {
      setFilterState((prev) => {
        const has = prev.categories.includes(category);
        const categories = has
          ? prev.categories.filter((c) => c !== category)
          : [...prev.categories, category];
        return { ...prev, categories };
      });
    });
  }, []);

  const setDataPointLimit = useCallback((limit: number) => {
    startTransition(() => {
      setFilterState((prev) => ({ ...prev, dataPointLimit: limit }));
    });
  }, []);

  const setTimePreset = useCallback((preset: TimePreset) => {
    const now = Date.now();
    const presetMs: Record<TimePreset, number> = {
      "1min": 60 * 1000,
      "5min": 5 * 60 * 1000,
      "1hour": 60 * 60 * 1000,
      all: Infinity,
    };
    startTransition(() => {
      setFilterState((prev) => ({
        ...prev,
        activePreset: preset,
        timeRange: {
          ...prev.timeRange,
          start: preset === "all" ? 0 : now - presetMs[preset],
          end: now,
        },
      }));
    });
  }, []);

  const setGranularity = useCallback((granularity: Granularity) => {
    startTransition(() => {
      setFilterState((prev) => ({
        ...prev,
        timeRange: { ...prev.timeRange, granularity },
      }));
    });
  }, []);

  const toggleStressTest = useCallback(() => {
    setStressTestMode((prev) => !prev);
  }, []);

  const setUpdateInterval = useCallback((ms: number) => {
    setUpdateIntervalMs(ms);
  }, []);

  const updateMetrics = useCallback(
    (partial: Partial<PerformanceMetrics>) => {
      // metrics are managed by the hook; this is a no-op placeholder for the interface
      void partial;
    },
    []
  );

  // Derive filtered data based on filter state
  const filteredData = useMemo(() => {
    let result = data;

    // Filter by selected categories
    if (filter.categories.length < DATA_CATEGORIES.length) {
      const catSet = new Set(filter.categories);
      result = result.filter((d) => catSet.has(d.category));
    }

    // Filter by time range — compute dynamically so live stream stays visible
    if (filter.activePreset !== "all") {
      const now = Date.now();
      const presetMs: Record<string, number> = {
        "1min": 60 * 1000,
        "5min": 5 * 60 * 1000,
        "1hour": 60 * 60 * 1000,
      };
      const windowMs = presetMs[filter.activePreset] ?? 5 * 60 * 1000;
      const dynamicStart = now - windowMs;
      result = result.filter((d) => d.timestamp >= dynamicStart);
    }

    return result;
  }, [data, filter]);

  // Deferred slice for DataTable — React delays this when charts are busy
  const deferredFiltered = useDeferredValue(filteredData);
  // Also cap to last 2000 pts for table (no need to sort 10K rows)
  const tableData = useMemo(
    () => deferredFiltered.slice(-2000),
    [deferredFiltered]
  );

  const value: DashboardContextType = {
    // State
    data,
    isStreaming,
    filter,
    chartConfigs,
    metrics: perfMetrics,
    stressTestMode,
    updateIntervalMs,
    filteredData,
    tableData,
    // Actions
    toggleStream,
    setFilter,
    toggleCategory,
    setDataPointLimit,
    setTimePreset,
    setGranularity,
    toggleStressTest,
    setUpdateInterval,
    updateMetrics,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

// ============================================================
// Consumer hook
// ============================================================

export function useDashboard(): DashboardContextType {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboard must be used within a DataProvider");
  }
  return ctx;
}
