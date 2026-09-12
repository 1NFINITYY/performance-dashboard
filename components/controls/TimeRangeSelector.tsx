"use client";

import React, { memo, useCallback } from "react";
import { TimePreset, Granularity } from "@/lib/types";
import { useDashboard } from "@/components/providers/DataProvider";

const TIME_PRESETS: { label: string; value: TimePreset }[] = [
  { label: "1 min", value: "1min" },
  { label: "5 min", value: "5min" },
  { label: "1 hr", value: "1hour" },
  { label: "All", value: "all" },
];

const GRANULARITIES: { label: string; value: Granularity }[] = [
  { label: "1m", value: "1min" },
  { label: "5m", value: "5min" },
  { label: "1h", value: "1hour" },
];

function TimeRangeSelectorInner() {
  const { filter, setTimePreset, setGranularity } = useDashboard();

  const handlePreset = useCallback(
    (preset: TimePreset) => {
      setTimePreset(preset);
    },
    [setTimePreset]
  );

  const handleGranularity = useCallback(
    (granularity: Granularity) => {
      setGranularity(granularity);
    },
    [setGranularity]
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Time Range Presets */}
      <div>
        <div className="label">Time Window</div>
        <div className="flex gap-2">
          {TIME_PRESETS.map((p) => (
            <button
              key={p.value}
              className={`btn btn--sm flex-1 ${filter.activePreset === p.value ? "btn--active" : "btn--secondary"}`}
              onClick={() => handlePreset(p.value)}
              aria-pressed={filter.activePreset === p.value}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Aggregation Granularity */}
      <div>
        <div className="label">Aggregation</div>
        <div className="flex gap-2">
          {GRANULARITIES.map((g) => (
            <button
              key={g.value}
              className={`btn btn--sm flex-1 ${filter.timeRange.granularity === g.value ? "btn--active" : "btn--secondary"}`}
              onClick={() => handleGranularity(g.value)}
              aria-pressed={filter.timeRange.granularity === g.value}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Live indicator */}
      <div className="flex items-center gap-2" style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
        <div className="dot dot--live" />
        <span>Live — updates every 100ms</span>
      </div>
    </div>
  );
}

export const TimeRangeSelector = memo(TimeRangeSelectorInner);
