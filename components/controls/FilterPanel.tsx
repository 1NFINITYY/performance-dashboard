"use client";

import React, { memo, useCallback } from "react";
import { DATA_CATEGORIES, DataCategory, CATEGORY_COLORS } from "@/lib/types";
import { useDashboard } from "@/components/providers/DataProvider";
import { formatNumber } from "@/lib/performanceUtils";

function FilterPanelInner() {
  const {
    filter,
    toggleCategory,
    setDataPointLimit,
    stressTestMode,
    toggleStressTest,
    setUpdateInterval,
    updateIntervalMs,
  } = useDashboard();

  const handleLimitChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setDataPointLimit(parseInt(e.target.value));
    },
    [setDataPointLimit]
  );

  const handleIntervalChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setUpdateInterval(parseInt(e.target.value));
    },
    [setUpdateInterval]
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Categories */}
      <div>
        <div className="label">Data Series</div>
        <div className="flex flex-col gap-3">
          {DATA_CATEGORIES.map((cat) => {
            const active = filter.categories.includes(cat);
            return (
              <div
                key={cat}
                className="flex items-center justify-between"
                style={{ cursor: "pointer" }}
                onClick={() => toggleCategory(cat)}
              >
                <div className="flex items-center gap-3">
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: active ? CATEGORY_COLORS[cat] : "var(--color-bg-hover)",
                      border: `2px solid ${CATEGORY_COLORS[cat]}`,
                      flexShrink: 0,
                      transition: "background var(--transition-fast)",
                      boxShadow: active ? `0 0 6px ${CATEGORY_COLORS[cat]}` : "none",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "0.875rem",
                      color: active ? "var(--color-text-primary)" : "var(--color-text-muted)",
                      textTransform: "capitalize",
                      transition: "color var(--transition-fast)",
                    }}
                  >
                    {cat}
                  </span>
                </div>
                <label className="toggle" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggleCategory(cat)}
                    aria-label={`Toggle ${cat}`}
                  />
                  <span className="toggle__track" />
                  <span className="toggle__thumb" />
                </label>
              </div>
            );
          })}
        </div>
      </div>

      <div className="divider" />

      {/* Data Point Limit */}
      <div>
        <div className="flex justify-between items-center" style={{ marginBottom: 8 }}>
          <div className="label" style={{ marginBottom: 0 }}>Data Point Limit</div>
          <span
            className="badge badge--blue"
            style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}
          >
            {formatNumber(filter.dataPointLimit)}
          </span>
        </div>
        <input
          type="range"
          className="slider"
          min={1000}
          max={50000}
          step={1000}
          value={filter.dataPointLimit}
          onChange={handleLimitChange}
          aria-label="Data point limit"
        />
        <div
          className="flex justify-between"
          style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", marginTop: 4 }}
        >
          <span>1K</span>
          <span>50K</span>
        </div>
      </div>

      {/* Update Interval */}
      <div>
        <div className="flex justify-between items-center" style={{ marginBottom: 8 }}>
          <div className="label" style={{ marginBottom: 0 }}>Update Rate</div>
          <span
            className="badge badge--green"
            style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}
          >
            {updateIntervalMs}ms
          </span>
        </div>
        <input
          type="range"
          className="slider"
          min={50}
          max={1000}
          step={50}
          value={updateIntervalMs}
          onChange={handleIntervalChange}
          aria-label="Update interval"
        />
        <div
          className="flex justify-between"
          style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", marginTop: 4 }}
        >
          <span>50ms</span>
          <span>1s</span>
        </div>
      </div>

      <div className="divider" />

      {/* Stress Test Mode */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <div style={{ fontSize: "0.875rem", fontWeight: 500, color: stressTestMode ? "var(--color-accent-red)" : "var(--color-text-primary)" }}>
              🔥 Stress Test
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: 2 }}>
              10× data rate
            </div>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={stressTestMode}
              onChange={toggleStressTest}
              aria-label="Toggle stress test mode"
            />
            <span
              className="toggle__track"
              style={stressTestMode ? { background: "rgba(248,113,113,0.3)", borderColor: "var(--color-accent-red)" } : {}}
            />
            <span
              className="toggle__thumb"
              style={stressTestMode ? { background: "var(--color-accent-red)", transform: "translateX(16px)" } : {}}
            />
          </label>
        </div>
      </div>
    </div>
  );
}

export const FilterPanel = memo(FilterPanelInner);
