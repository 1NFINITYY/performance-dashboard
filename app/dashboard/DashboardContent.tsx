"use client";

import React, { memo, useState, useRef, useCallback, useEffect } from "react";
import { useDashboard } from "@/components/providers/DataProvider";
import { LineChart } from "@/components/charts/LineChart";
import { BarChart } from "@/components/charts/BarChart";
import { ScatterPlot } from "@/components/charts/ScatterPlot";
import { Heatmap } from "@/components/charts/Heatmap";
import { ChartWrapper } from "@/components/charts/ChartWrapper";
import { FilterPanel } from "@/components/controls/FilterPanel";
import { TimeRangeSelector } from "@/components/controls/TimeRangeSelector";
import { DataTable } from "@/components/ui/DataTable";
import { PerformanceMonitor } from "@/components/ui/PerformanceMonitor";
import { CATEGORY_COLORS } from "@/lib/types";
import { formatNumber } from "@/lib/performanceUtils";

// ─── Constants ────────────────────────────────────────────────────────────────
const SIDEBAR_FULL = 260;
const SIDEBAR_MINI = 52;
const TABLE_MIN = 80;
const TABLE_MAX = 520;
const TABLE_DEFAULT = 230;

function DashboardContentInner() {
  const { filteredData, tableData, filter, isStreaming, metrics, toggleStream } = useDashboard();

  // 1. Sidebar collapse
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // 2. Resizable raw-data-stream panel
  const [tableHeight, setTableHeight] = useState(TABLE_DEFAULT);
  const isDraggingTable = useRef(false);
  const dragStartY = useRef(0);
  const dragStartH = useRef(TABLE_DEFAULT);

  const onTableDragStart = useCallback((e: React.MouseEvent) => {
    isDraggingTable.current = true;
    dragStartY.current = e.clientY;
    dragStartH.current = tableHeight;
    e.preventDefault();
  }, [tableHeight]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDraggingTable.current) return;
      const delta = dragStartY.current - e.clientY; // drag up = bigger
      const next = Math.min(TABLE_MAX, Math.max(TABLE_MIN, dragStartH.current + delta));
      setTableHeight(next);
    };
    const onUp = () => { isDraggingTable.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const sidebarWidth = sidebarOpen ? SIDEBAR_FULL : SIDEBAR_MINI;

  return (
    <div
      style={{
        display: "flex",
        height: "100dvh",
        background: "var(--color-bg-base)",
        overflow: "hidden",
      }}
    >
      {/* ── Sidebar ── */}
      <aside
        style={{
          width: sidebarWidth,
          flexShrink: 0,
          borderRight: "1px solid var(--color-border)",
          display: "flex",
          flexDirection: "column",
          overflowY: sidebarOpen ? "auto" : "hidden",
          background: "var(--color-bg-surface)",
          transition: "width 0.22s cubic-bezier(0.4,0,0.2,1)",
          position: "relative",
        }}
      >
        {/* ── Sidebar toggle button (always visible) ── */}
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          style={{
            position: "absolute",
            top: 14,
            right: sidebarOpen ? 10 : "50%",
            transform: sidebarOpen ? "none" : "translateX(50%)",
            zIndex: 10,
            width: 26,
            height: 26,
            borderRadius: 6,
            border: "1px solid var(--color-border)",
            background: "var(--color-bg-hover)",
            color: "var(--color-text-secondary)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            transition: "right 0.22s, transform 0.22s",
            flexShrink: 0,
          }}
        >
          {sidebarOpen ? "◀" : "▶"}
        </button>

        {/* Content — hidden when collapsed */}
        <div
          style={{
            opacity: sidebarOpen ? 1 : 0,
            pointerEvents: sidebarOpen ? "auto" : "none",
            transition: "opacity 0.15s",
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minWidth: SIDEBAR_FULL,
          }}
        >
          {/* Logo / Brand */}
          <div
            style={{
              padding: "20px 24px 16px",
              borderBottom: "1px solid var(--color-border)",
              flexShrink: 0,
              paddingRight: 44, // leave room for toggle btn
            }}
          >
            <div
              style={{
                fontSize: "1rem",
                fontWeight: 700,
                letterSpacing: "-0.02em",
                background: "linear-gradient(135deg, var(--color-accent-blue), var(--color-accent-cyan))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              ⚡ PerformanceDash
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", marginTop: 4 }}>
              Real-time · 10K+ points · 60fps
            </div>
          </div>

          {/* Status bar */}
          <div
            style={{
              padding: "12px 24px",
              borderBottom: "1px solid var(--color-border)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexShrink: 0,
            }}
          >
            <div className={`dot ${isStreaming ? "dot--live" : "dot--paused"}`} />
            <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }} suppressHydrationWarning>
              {isStreaming ? "Streaming" : "Paused"} · {formatNumber(metrics.dataPointCount)} pts
            </span>
            <button
              className={`btn btn--sm ${isStreaming ? "btn--secondary" : "btn--primary"}`}
              onClick={toggleStream}
              style={{ marginLeft: "auto" }}
            >
              {isStreaming ? "⏸" : "▶"}
            </button>
          </div>

          {/* Controls */}
          <div style={{ padding: "20px 24px", flex: 1 }}>
            <TimeRangeSelector />
            <div className="divider" />
            <FilterPanel />
          </div>
        </div>

        {/* ── Collapsed: show just ⚡ icon ── */}
        {!sidebarOpen && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              paddingTop: 60,
              color: "var(--color-accent-blue)",
              fontSize: "1.1rem",
              userSelect: "none",
            }}
          >
            ⚡
          </div>
        )}
      </aside>

      {/* ── Main Content ── */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        {/* Topbar */}
        <header
          style={{
            height: "var(--topbar-height)",
            borderBottom: "1px solid var(--color-border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            background: "var(--color-bg-surface)",
            flexShrink: 0,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "var(--color-text-secondary)",
                margin: 0,
              }}
            >
              Dashboard Overview
            </h1>
          </div>
          {/* Category legend pills */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {filter.categories.map((cat) => (
              <span
                key={cat}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "2px 8px",
                  borderRadius: 999,
                  fontSize: "0.7rem",
                  fontWeight: 500,
                  background: `${CATEGORY_COLORS[cat]}20`,
                  color: CATEGORY_COLORS[cat],
                  border: `1px solid ${CATEGORY_COLORS[cat]}40`,
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: CATEGORY_COLORS[cat],
                  }}
                />
                {cat}
              </span>
            ))}
          </div>
        </header>

        {/* ── Chart grid — fills remaining space ── */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 16px 8px",
            minHeight: 0,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gridTemplateRows: "240px 240px",
              gap: 16,
            }}
          >
            <ChartWrapper title="Line Chart" subtitle="Multi-series time series" accentColor="var(--color-accent-blue)">
              {({ width, height }: { width: number; height: number }) => (
                <LineChart data={filteredData} width={width} height={height} visibleCategories={filter.categories} />
              )}
            </ChartWrapper>

            <ChartWrapper title="Bar Chart" subtitle="Latest values per category" accentColor="var(--color-accent-purple)">
              {({ width, height }: { width: number; height: number }) => (
                <BarChart data={filteredData} width={width} height={height} visibleCategories={filter.categories} />
              )}
            </ChartWrapper>

            <ChartWrapper title="Scatter Plot" subtitle="All data points" accentColor="var(--color-accent-green)">
              {({ width, height }: { width: number; height: number }) => (
                <ScatterPlot data={filteredData} width={width} height={height} visibleCategories={filter.categories} />
              )}
            </ChartWrapper>

            <ChartWrapper title="Heatmap" subtitle="Time × Category intensity" accentColor="var(--color-accent-amber)">
              {({ width, height }: { width: number; height: number }) => (
                <Heatmap data={filteredData} width={width} height={height} visibleCategories={filter.categories} />
              )}
            </ChartWrapper>
          </div>
        </div>

        {/* ── Resizable Raw Data Stream panel — flush with screen edges ── */}
        <div
          style={{
            flexShrink: 0,
            height: tableHeight,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            position: "relative",
          }}
        >
          {/* Drag handle */}
          <div
            onMouseDown={onTableDragStart}
            title="Drag to resize"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 8,
              cursor: "ns-resize",
              zIndex: 5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 40,
                height: 3,
                borderRadius: 99,
                background: "var(--color-border)",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = "var(--color-accent-blue)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = "var(--color-border)")}
            />
          </div>

          {/* DataTable fills full height; subtract ~80px for its own header rows */}
          <DataTable data={tableData} containerHeight={Math.max(40, tableHeight - 80)} />
        </div>
      </main>

      {/* ── Draggable Performance Monitor Overlay ── */}
      <PerformanceMonitor />
    </div>
  );
}

export const DashboardContent = memo(DashboardContentInner);
