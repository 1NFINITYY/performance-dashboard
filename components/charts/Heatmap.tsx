"use client";

import React, { useRef, useEffect, useMemo, memo, useState, useCallback, useDeferredValue } from "react";
import { DataPoint, DataCategory, DATA_CATEGORIES, ChartPadding } from "@/lib/types";
import {
  setupHiDPICanvas,
  clearCanvas,
  getChartArea,
  getHeatColor,
} from "@/lib/canvasUtils";

interface HeatmapProps {
  data: DataPoint[];
  width: number;
  height: number;
  visibleCategories?: DataCategory[];
  bucketCount?: number; // number of time buckets on X axis
}

// Custom padding: wider left for category labels, wider right for color legend
const HEATMAP_PADDING: ChartPadding = {
  top: 16,
  right: 64,   // room for color scale bar + labels
  bottom: 32,  // room for time labels
  left: 80,    // room for category labels
};

function HeatmapInner({
  data,
  width,
  height,
  visibleCategories = [...DATA_CATEGORIES],
  bucketCount = 40,
}: HeatmapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string } | null>(null);
  const visibleCatSet = useMemo(() => new Set(visibleCategories), [visibleCategories]);
  // Defer heavy bucketization — runs on idle frames, doesn't block 60fps paint
  const deferredData = useDeferredValue(data);

  // Build bucket grid: [category][bucketIndex] = aggregatedValue
  const { grid, minVal, maxVal, minTs, maxTs } = useMemo(() => {
    if (data.length === 0) {
      return { grid: new Map(), minVal: 0, maxVal: 1, minTs: 0, maxTs: 1 };
    }

    const filteredData = data.filter((d) => visibleCatSet.has(d.category));
    if (filteredData.length === 0) {
      return { grid: new Map(), minVal: 0, maxVal: 1, minTs: 0, maxTs: 1 };
    }

    const minTs = Math.min(...filteredData.map((d) => d.timestamp));
    const maxTs = Math.max(...filteredData.map((d) => d.timestamp));
    const timeSpan = maxTs - minTs || 1;
    const bucketMs = timeSpan / bucketCount;

    // grid: Map<DataCategory, number[]>
    const grid = new Map<DataCategory, number[]>();
    const counts = new Map<DataCategory, number[]>();

    for (const cat of visibleCategories) {
      grid.set(cat, new Array(bucketCount).fill(0));
      counts.set(cat, new Array(bucketCount).fill(0));
    }

    for (const pt of filteredData) {
      if (!visibleCatSet.has(pt.category)) continue;
      const bucketIdx = Math.min(
        bucketCount - 1,
        Math.floor((pt.timestamp - minTs) / bucketMs)
      );
      grid.get(pt.category)![bucketIdx] += pt.value;
      counts.get(pt.category)![bucketIdx]++;
    }

    // Average each cell
    let minVal = Infinity, maxVal = -Infinity;
    for (const cat of visibleCategories) {
      const row = grid.get(cat)!;
      const cnt = counts.get(cat)!;
      for (let i = 0; i < bucketCount; i++) {
        if (cnt[i] > 0) {
          row[i] = row[i] / cnt[i];
          if (row[i] < minVal) minVal = row[i];
          if (row[i] > maxVal) maxVal = row[i];
        }
      }
    }

    if (!isFinite(minVal)) { minVal = 0; maxVal = 100; }

    return { grid, minVal, maxVal, minTs, maxTs };
  }, [data, visibleCategories, visibleCatSet, bucketCount]);

  // Canvas setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0 || height === 0) return;
    setupHiDPICanvas(canvas, width, height);
  }, [width, height]);

  // Render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0 || height === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    clearCanvas(ctx, width, height);

    const chartArea = getChartArea(width, height, HEATMAP_PADDING);
    const cats = visibleCategories.filter((c) => grid.has(c));
    if (cats.length === 0) return;

    const cellW = chartArea.width / bucketCount;
    const cellH = chartArea.height / cats.length;
    const range = maxVal - minVal || 1;

    // Draw cells with a small gap between rows for readability
    const gap = cats.length > 3 ? 2 : 3;

    for (let ci = 0; ci < cats.length; ci++) {
      const cat = cats[ci];
      const row = grid.get(cat)!;
      const cy = chartArea.y + ci * cellH;

      for (let bi = 0; bi < bucketCount; bi++) {
        const t = (row[bi] - minVal) / range;
        const cx = chartArea.x + bi * cellW;

        if (row[bi] === 0) {
          ctx.fillStyle = "rgba(20,30,50,0.5)";
        } else {
          ctx.fillStyle = getHeatColor(t);
        }
        // Draw cell with a small vertical gap
        ctx.fillRect(
          Math.floor(cx),
          Math.floor(cy) + gap / 2,
          Math.ceil(cellW) + 1,
          Math.ceil(cellH) - gap
        );
      }

      // Category label on left — right-aligned in the left padding zone
      ctx.save();
      ctx.fillStyle = "rgba(180,200,235,0.9)";
      ctx.font = "bold 11px 'Inter', sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(cat, chartArea.x - 10, cy + cellH / 2);
      ctx.restore();

      // Subtle separator line between rows
      if (ci < cats.length - 1) {
        ctx.save();
        ctx.strokeStyle = "rgba(10,20,40,0.6)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(chartArea.x, cy + cellH);
        ctx.lineTo(chartArea.x + chartArea.width, cy + cellH);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Time labels on X axis
    ctx.save();
    ctx.fillStyle = "rgba(140,163,200,0.7)";
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const xTickCount = 5;
    for (let i = 0; i <= xTickCount; i++) {
      const t = i / xTickCount;
      const ts = minTs + (maxTs - minTs) * t;
      const x = chartArea.x + chartArea.width * t;
      const d = new Date(ts);
      const label = `${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
      ctx.fillText(label, x, chartArea.y + chartArea.height + 6);

      // Tick mark
      ctx.strokeStyle = "rgba(99,143,211,0.3)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, chartArea.y + chartArea.height);
      ctx.lineTo(x, chartArea.y + chartArea.height + 4);
      ctx.stroke();
    }
    ctx.restore();

    // Color scale bar on the right side
    const barX = chartArea.x + chartArea.width + 12;
    const barW = 12;
    const barH = chartArea.height;

    // Draw gradient bar
    const grad = ctx.createLinearGradient(0, chartArea.y, 0, chartArea.y + barH);
    grad.addColorStop(0, getHeatColor(1));
    grad.addColorStop(0.25, getHeatColor(0.75));
    grad.addColorStop(0.5, getHeatColor(0.5));
    grad.addColorStop(0.75, getHeatColor(0.25));
    grad.addColorStop(1, getHeatColor(0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(barX, chartArea.y, barW, barH, 3);
    ctx.fill();

    // Scale labels
    ctx.save();
    ctx.fillStyle = "rgba(160,180,220,0.8)";
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    const scaleLabels = [
      { t: 0, val: maxVal },
      { t: 0.5, val: (minVal + maxVal) / 2 },
      { t: 1, val: minVal },
    ];
    for (const { t, val } of scaleLabels) {
      const y = chartArea.y + barH * t;
      ctx.fillText(val.toFixed(0), barX + barW + 5, y);
    }
    ctx.restore();

    // Border around heatmap area
    ctx.save();
    ctx.strokeStyle = "rgba(99,143,211,0.15)";
    ctx.lineWidth = 1;
    ctx.strokeRect(chartArea.x, chartArea.y, chartArea.width, chartArea.height);
    ctx.restore();

  }, [grid, visibleCategories, minVal, maxVal, minTs, maxTs, width, height, bucketCount]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !grid.size) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const chartArea = getChartArea(width, height, HEATMAP_PADDING);
    const cats = visibleCategories.filter((c) => grid.has(c));
    if (cats.length === 0) return;

    const cellW = chartArea.width / bucketCount;
    const cellH = chartArea.height / cats.length;

    const ci = Math.floor((mouseY - chartArea.y) / cellH);
    const bi = Math.floor((mouseX - chartArea.x) / cellW);

    if (ci >= 0 && ci < cats.length && bi >= 0 && bi < bucketCount) {
      const cat = cats[ci];
      const value = grid.get(cat)?.[bi] ?? 0;
      const ts = minTs + (maxTs - minTs) * (bi / bucketCount);
      const d = new Date(ts);
      setTooltip({
        x: mouseX,
        y: mouseY,
        label: `${cat}: ${value.toFixed(2)} @ ${d.getHours()}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`,
      });
    } else {
      setTooltip(null);
    }
  }, [grid, visibleCategories, minTs, maxTs, bucketCount, width, height]);

  return (
    <div style={{ position: "relative", width, height }}>
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
        style={{ display: "block", cursor: "cell" }}
      />
      {tooltip && (
        <div
          className="tooltip"
          style={{
            left: Math.min(tooltip.x + 10, width - 260),
            top: Math.max(tooltip.y - 30, 0),
          }}
        >
          {tooltip.label}
        </div>
      )}
    </div>
  );
}

export const Heatmap = memo(HeatmapInner);
