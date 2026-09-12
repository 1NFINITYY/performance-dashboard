"use client";

import React, { useRef, useEffect, useMemo, memo, useState, useCallback, useDeferredValue } from "react";
import { DataPoint, DataCategory, DATA_CATEGORIES, CATEGORY_COLORS, DEFAULT_CHART_PADDING } from "@/lib/types";
import {
  setupHiDPICanvas,
  clearCanvas,
  getChartArea,
  buildScaleX,
  buildScaleY,
  drawGridLines,
  downsamplePoints,
  getCategoryColor,
} from "@/lib/canvasUtils";
import { AxesLayer } from "./AxesLayer";

interface ScatterPlotProps {
  data: DataPoint[];
  width: number;
  height: number;
  visibleCategories?: DataCategory[];
}

const UNIT_MAP: Record<DataCategory, string> = {
  cpu: "%",
  memory: "%",
  network: "MB/s",
  latency: "ms",
  throughput: "req/s",
};

const MAX_SCATTER_POINTS = 1500; // per category — enough for visual density, fast to draw

function ScatterPlotInner({ data, width, height, visibleCategories = [...DATA_CATEGORIES] }: ScatterPlotProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string } | null>(null);
  const [normalized, setNormalized] = useState(true);
  // Defer chart data so the browser can paint at 60fps; chart updates on idle frames
  const deferredData = useDeferredValue(data);
  const visibleCatSet = useMemo(() => new Set(visibleCategories), [visibleCategories]);

  const seriesMap = useMemo(() => {
    const map = new Map<DataCategory, DataPoint[]>();
    for (const cat of visibleCategories) map.set(cat, []);
    for (const pt of deferredData) {
      if (visibleCatSet.has(pt.category)) {
        map.get(pt.category)!.push(pt);
      }
    }
    return map;
  }, [deferredData, visibleCategories, visibleCatSet]);

  // Global timestamp domain
  const { minTs, maxTs } = useMemo(() => {
    let minTs = Infinity, maxTs = -Infinity;
    for (const pts of seriesMap.values()) {
      for (const pt of pts) {
        if (pt.timestamp < minTs) minTs = pt.timestamp;
        if (pt.timestamp > maxTs) maxTs = pt.timestamp;
      }
    }
    if (!isFinite(minTs)) { minTs = Date.now() - 5000; maxTs = Date.now(); }
    return { minTs, maxTs };
  }, [seriesMap]);

  // Per-series value domains
  const seriesDomains = useMemo(() => {
    const domains = new Map<DataCategory, { min: number; max: number }>();
    for (const [cat, pts] of seriesMap) {
      if (pts.length === 0) { domains.set(cat, { min: 0, max: 100 }); continue; }
      let min = Infinity, max = -Infinity;
      for (const pt of pts) {
        if (pt.value < min) min = pt.value;
        if (pt.value > max) max = pt.value;
      }
      const pad = Math.max((max - min) * 0.1, 1);
      domains.set(cat, { min: min - pad, max: max + pad });
    }
    return domains;
  }, [seriesMap]);

  // Global value domain
  const { globalMin, globalMax } = useMemo(() => {
    let globalMin = Infinity, globalMax = -Infinity;
    for (const { min, max } of seriesDomains.values()) {
      if (min < globalMin) globalMin = min;
      if (max > globalMax) globalMax = max;
    }
    if (!isFinite(globalMin)) { globalMin = 0; globalMax = 100; }
    return { globalMin, globalMax };
  }, [seriesDomains]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0 || height === 0) return;
    setupHiDPICanvas(canvas, width, height);
  }, [width, height]);

  const rafRef = useRef<number>(0);
  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas || width === 0 || height === 0) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      clearCanvas(ctx, width, height);
      const chartArea = getChartArea(width, height, DEFAULT_CHART_PADDING);
      const scaleX = buildScaleX(minTs, maxTs, chartArea);

      drawGridLines(ctx, chartArea, 5);

      let totalPoints = 0;

      for (const [cat, pts] of seriesMap) {
        if (pts.length === 0) continue;
        const color = getCategoryColor(cat);
        const sampled = downsamplePoints(pts, MAX_SCATTER_POINTS);
        totalPoints += sampled.length;

        let scaleY: (v: number) => number;
        if (normalized) {
          const domain = seriesDomains.get(cat)!;
          scaleY = buildScaleY(domain.min, domain.max, chartArea);
        } else {
          scaleY = buildScaleY(globalMin, globalMax, chartArea);
        }

        const radius = totalPoints > 6000 ? 1.5 : totalPoints > 3000 ? 2 : 2.5;

        ctx.save();
        ctx.globalAlpha = 0.65;
        ctx.fillStyle = color;
        const path = new Path2D();
        for (const pt of sampled) {
          const px = scaleX(pt.timestamp);
          const py = scaleY(pt.value);
          path.moveTo(px + radius, py);
          path.arc(px, py, radius, 0, Math.PI * 2);
        }
        ctx.fill(path);
        ctx.restore();
      }

      // Draw point count
      ctx.save();
      ctx.fillStyle = "rgba(140,163,200,0.45)";
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.textAlign = "right";
      ctx.fillText(
        `${totalPoints.toLocaleString()} pts`,
        chartArea.x + chartArea.width,
        chartArea.y - 8
      );
      ctx.restore();
    });
    return () => cancelAnimationFrame(rafRef.current);
  }, [seriesMap, minTs, maxTs, seriesDomains, globalMin, globalMax, width, height, normalized]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const chartArea = getChartArea(width, height, DEFAULT_CHART_PADDING);
    const scaleX = buildScaleX(minTs, maxTs, chartArea);

    let closest: { dist: number; label: string; x: number; y: number } | null = null;

    for (const [cat, pts] of seriesMap) {
      const sampled = downsamplePoints(pts, 500);
      let scaleY: (v: number) => number;
      if (normalized) {
        const domain = seriesDomains.get(cat)!;
        scaleY = buildScaleY(domain.min, domain.max, chartArea);
      } else {
        scaleY = buildScaleY(globalMin, globalMax, chartArea);
      }
      for (const pt of sampled) {
        const px = scaleX(pt.timestamp);
        const py = scaleY(pt.value);
        const dist = Math.sqrt((px - mouseX) ** 2 + (py - mouseY) ** 2);
        if (dist < 15 && (!closest || dist < closest.dist)) {
          closest = { dist, label: `${cat}: ${pt.value.toFixed(2)} ${UNIT_MAP[cat]}`, x: px, y: py };
        }
      }
    }

    setTooltip(closest ? { x: closest.x, y: closest.y, label: closest.label } : null);
  }, [seriesMap, minTs, maxTs, seriesDomains, globalMin, globalMax, width, height, normalized]);

  return (
    <div style={{ position: "relative", width, height }}>
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
        style={{ display: "block", cursor: "crosshair" }}
      />
      <AxesLayer
        width={width}
        height={height}
        minValue={normalized ? 0 : globalMin}
        maxValue={normalized ? 100 : globalMax}
        minTimestamp={minTs}
        maxTimestamp={maxTs}
        yUnit={normalized ? "%" : ""}
      />

      {/* Normalize toggle */}
      <button
        onClick={() => setNormalized((v) => !v)}
        style={{
          position: "absolute",
          top: 6,
          left: DEFAULT_CHART_PADDING.left + 4,
          fontSize: 9,
          padding: "2px 6px",
          borderRadius: 4,
          border: `1px solid ${normalized ? "rgba(52,211,153,0.4)" : "rgba(99,143,211,0.2)"}`,
          background: normalized ? "rgba(52,211,153,0.1)" : "rgba(13,20,36,0.7)",
          color: normalized ? "#34d399" : "rgba(140,163,200,0.6)",
          cursor: "pointer",
          fontFamily: "var(--font-mono)",
          letterSpacing: "0.05em",
        }}
        title={normalized ? "Switch to raw values" : "Switch to normalized (per-series)"}
      >
        {normalized ? "NORM" : "RAW"}
      </button>

      {/* Legend */}
      <div style={{
        position: "absolute",
        top: 6,
        right: 6,
        display: "flex",
        flexDirection: "column",
        gap: 3,
        background: "rgba(7,11,20,0.7)",
        borderRadius: 6,
        padding: "5px 8px",
        border: "1px solid rgba(99,143,211,0.1)",
      }}>
        {visibleCategories.map((cat) => (
          <div key={cat} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10 }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: CATEGORY_COLORS[cat], flexShrink: 0,
            }} />
            <span style={{ color: CATEGORY_COLORS[cat] }}>{cat}</span>
            <span style={{ color: "rgba(140,163,200,0.5)", fontSize: 9, fontFamily: "var(--font-mono)" }}>
              {UNIT_MAP[cat]}
            </span>
          </div>
        ))}
      </div>

      {tooltip && (
        <div
          className="tooltip"
          style={{
            left: Math.min(tooltip.x + 10, width - 160),
            top: Math.max(tooltip.y - 30, 0),
          }}
        >
          {tooltip.label}
        </div>
      )}
    </div>
  );
}

export const ScatterPlot = memo(ScatterPlotInner);
