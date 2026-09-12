"use client";

import React, { useRef, useEffect, useMemo, memo, useState, useCallback, useDeferredValue } from "react";
import { DataPoint, DataCategory, DATA_CATEGORIES, CATEGORY_COLORS, DEFAULT_CHART_PADDING } from "@/lib/types";
import {
  setupHiDPICanvas,
  clearCanvas,
  getChartArea,
  buildScaleX,
  buildScaleY,
  drawPolyline,
  drawArea,
  drawGridLines,
  downsamplePoints,
  getCategoryColor,
} from "@/lib/canvasUtils";
import { AxesLayer } from "./AxesLayer";

interface LineChartProps {
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

function LineChartInner({ data, width, height, visibleCategories = [...DATA_CATEGORIES] }: LineChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dprRef = useRef(1);
  // Defer chart data updates — lets browser paint at 60fps, charts update when idle
  const deferredData = useDeferredValue(data);
  const [tooltip, setTooltip] = useState<{
    x: number;
    items: { cat: DataCategory; value: number }[];
  } | null>(null);
  const [normalized, setNormalized] = useState(true);
  const visibleCatSet = useMemo(() => new Set(visibleCategories), [visibleCategories]);

  // Group data by category
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

  // Per-series value domains for normalization
  const seriesDomains = useMemo(() => {
    const domains = new Map<DataCategory, { min: number; max: number }>();
    for (const [cat, pts] of seriesMap) {
      if (pts.length === 0) { domains.set(cat, { min: 0, max: 100 }); continue; }
      let min = Infinity, max = -Infinity;
      for (const pt of pts) {
        if (pt.value < min) min = pt.value;
        if (pt.value > max) max = pt.value;
      }
      const pad = Math.max((max - min) * 0.12, 1);
      domains.set(cat, { min: min - pad, max: max + pad });
    }
    return domains;
  }, [seriesMap]);

  // Global domain for raw mode
  const { globalMin, globalMax } = useMemo(() => {
    let globalMin = Infinity, globalMax = -Infinity;
    for (const { min, max } of seriesDomains.values()) {
      if (min < globalMin) globalMin = min;
      if (max > globalMax) globalMax = max;
    }
    if (!isFinite(globalMin)) { globalMin = 0; globalMax = 100; }
    return { globalMin, globalMax };
  }, [seriesDomains]);

  // Setup HiDPI canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0 || height === 0) return;
    dprRef.current = setupHiDPICanvas(canvas, width, height);
  }, [width, height]);

  // Render — gated on rAF so rapid React re-renders coalesce into one draw/frame
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

      for (const [cat, pts] of seriesMap) {
        if (pts.length === 0) continue;
        const color = getCategoryColor(cat);
        const maxPts = Math.max(chartArea.width * 2, 500);
        const sampled = downsamplePoints(pts, maxPts);

        let scaleY: (v: number) => number;
        if (normalized) {
          const domain = seriesDomains.get(cat)!;
          scaleY = buildScaleY(domain.min, domain.max, chartArea);
        } else {
          scaleY = buildScaleY(globalMin, globalMax, chartArea);
        }

        const pixelPts = sampled.map((p) => ({ x: scaleX(p.timestamp), y: scaleY(p.value) }));

        drawArea(ctx, pixelPts, color, chartArea.y + chartArea.height, 0.1);
        drawPolyline(ctx, pixelPts, color, 2);

        // Glowing dot at latest point (no shadow — too expensive per frame)
        if (pixelPts.length > 0) {
          const last = pixelPts[pixelPts.length - 1];
          ctx.save();
          ctx.beginPath();
          ctx.arc(last.x, last.y, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.9;
          ctx.fill();
          ctx.restore();
        }
      }

      // Vertical crosshair
      if (tooltip) {
        ctx.save();
        ctx.strokeStyle = "rgba(140,163,200,0.25)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(tooltip.x, chartArea.y);
        ctx.lineTo(tooltip.x, chartArea.y + chartArea.height);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    });
    return () => cancelAnimationFrame(rafRef.current);
  }, [seriesMap, minTs, maxTs, seriesDomains, globalMin, globalMax, width, height, normalized, tooltip]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const chartArea = getChartArea(width, height, DEFAULT_CHART_PADDING);
    if (mouseX < chartArea.x || mouseX > chartArea.x + chartArea.width) {
      setTooltip(null);
      return;
    }
    const tsAtMouse = minTs + ((mouseX - chartArea.x) / chartArea.width) * (maxTs - minTs);
    const items: { cat: DataCategory; value: number }[] = [];
    for (const [cat, pts] of seriesMap) {
      if (pts.length === 0) continue;
      const sampled = downsamplePoints(pts, Math.max(chartArea.width * 2, 500));
      let nearest = sampled[0];
      let minDist = Math.abs(sampled[0].timestamp - tsAtMouse);
      for (const pt of sampled) {
        const d = Math.abs(pt.timestamp - tsAtMouse);
        if (d < minDist) { minDist = d; nearest = pt; }
      }
      items.push({ cat, value: nearest.value });
    }
    setTooltip({ x: mouseX, items });
  }, [seriesMap, minTs, maxTs, width, height]);

  // Latest live values for legend
  const latestValues = useMemo(() => {
    const vals = new Map<DataCategory, number>();
    for (const [cat, pts] of seriesMap) {
      if (pts.length > 0) vals.set(cat, pts[pts.length - 1].value);
    }
    return vals;
  }, [seriesMap]);

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
          border: `1px solid ${normalized ? "rgba(96,165,250,0.4)" : "rgba(99,143,211,0.2)"}`,
          background: normalized ? "rgba(96,165,250,0.12)" : "rgba(13,20,36,0.7)",
          color: normalized ? "#60a5fa" : "rgba(140,163,200,0.6)",
          cursor: "pointer",
          fontFamily: "var(--font-mono)",
          letterSpacing: "0.05em",
        }}
        title={normalized ? "Switch to raw values" : "Switch to normalized (per-series)"}
      >
        {normalized ? "NORM" : "RAW"}
      </button>

      {/* Legend with live values */}
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
        {visibleCategories.map((cat) => {
          const latest = latestValues.get(cat);
          return (
            <div key={cat} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10 }}>
              <div style={{ width: 18, height: 2, background: CATEGORY_COLORS[cat], borderRadius: 1 }} />
              <span style={{ color: CATEGORY_COLORS[cat], minWidth: 52 }}>{cat}</span>
              {latest !== undefined && (
                <span style={{ fontFamily: "var(--font-mono)", color: CATEGORY_COLORS[cat], opacity: 0.85, fontSize: 9 }}>
                  {latest.toFixed(1)}{UNIT_MAP[cat]}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Multi-series tooltip */}
      {tooltip && (
        <div
          className="tooltip"
          style={{
            left: Math.min(tooltip.x + 12, width - 175),
            top: DEFAULT_CHART_PADDING.top + 8,
            padding: "6px 10px",
          }}
        >
          {tooltip.items.map(({ cat, value }) => (
            <div key={cat} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <span style={{
                display: "inline-block",
                width: 8, height: 8, borderRadius: "50%",
                background: CATEGORY_COLORS[cat], flexShrink: 0,
              }} />
              <span style={{ color: CATEGORY_COLORS[cat], fontSize: "0.8rem" }}>
                {cat}: <strong>{value.toFixed(2)} {UNIT_MAP[cat]}</strong>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export const LineChart = memo(LineChartInner);
