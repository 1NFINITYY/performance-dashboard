"use client";

import React, { useRef, useEffect, useMemo, memo, useDeferredValue } from "react";
import { DataPoint, DataCategory, DATA_CATEGORIES } from "@/lib/types";
import {
  setupHiDPICanvas,
  clearCanvas,
  getChartArea,
  buildScaleY,
  drawBar,
  getCategoryColor,
} from "@/lib/canvasUtils";
import { ChartPadding } from "@/lib/types";

interface BarChartProps {
  data: DataPoint[];
  width: number;
  height: number;
  visibleCategories?: DataCategory[];
}

// Custom padding: no large left margin (no Y-axis), generous bottom for labels
const BAR_CHART_PADDING: ChartPadding = {
  top: 32,
  right: 24,
  bottom: 44,
  left: 24,
};

function BarChartInner({ data, width, height, visibleCategories = [...DATA_CATEGORIES] }: BarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const visibleCatSet = useMemo(() => new Set(visibleCategories), [visibleCategories]);
  const deferredData = useDeferredValue(data);

  // Take the most recent value per category for a bar chart snapshot
  const latestPerCategory = useMemo(() => {
    const map = new Map<DataCategory, number>();
    for (let i = deferredData.length - 1; i >= 0; i--) {
      const pt = deferredData[i];
      if (visibleCatSet.has(pt.category) && !map.has(pt.category)) {
        map.set(pt.category, pt.value);
        if (map.size === visibleCategories.length) break;
      }
    }
    return map;
  }, [deferredData, visibleCatSet, visibleCategories]);

  const { minVal, maxVal } = useMemo(() => {
    const values = [...latestPerCategory.values()];
    if (values.length === 0) return { minVal: 0, maxVal: 100 };
    const max = Math.max(...values);
    return { minVal: 0, maxVal: max * 1.2 };
  }, [latestPerCategory]);

  // Setup canvas
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
    const chartArea = getChartArea(width, height, BAR_CHART_PADDING);
    const scaleY = buildScaleY(minVal, maxVal, chartArea);
    const baselineY = scaleY(0);

    // Background subtle horizontal grid lines
    ctx.save();
    ctx.strokeStyle = "rgba(99,143,211,0.1)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    const gridCount = 4;
    for (let i = 0; i <= gridCount; i++) {
      const y = chartArea.y + (chartArea.height / gridCount) * i;
      ctx.beginPath();
      ctx.moveTo(chartArea.x, y);
      ctx.lineTo(chartArea.x + chartArea.width, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.restore();

    const cats = visibleCategories.filter((c) => latestPerCategory.has(c));
    if (cats.length === 0) return;

    const barGroupWidth = chartArea.width / cats.length;
    const barPadding = barGroupWidth * 0.18;
    const barWidth = barGroupWidth - barPadding * 2;

    cats.forEach((cat, i) => {
      const value = latestPerCategory.get(cat) ?? 0;
      const color = getCategoryColor(cat);
      const x = chartArea.x + i * barGroupWidth + barPadding;
      const y = scaleY(value);
      const barHeight = baselineY - y;

      // Bar gradient fill
      const gradient = ctx.createLinearGradient(x, y, x, baselineY);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, color + "33");

      // Glow effect
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4;
      ctx.fillStyle = gradient;
      if (barHeight > 6) {
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, [5, 5, 0, 0]);
        ctx.fill();
      } else {
        ctx.fillRect(x, y, barWidth, Math.max(2, barHeight));
      }
      ctx.restore();

      // Subtle border on bar sides
      ctx.save();
      ctx.strokeStyle = color + "88";
      ctx.lineWidth = 1;
      if (barHeight > 6) {
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, [5, 5, 0, 0]);
        ctx.stroke();
      }
      ctx.restore();

      // Value label on top of bar
      ctx.save();
      ctx.fillStyle = color;
      ctx.font = "bold 12px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      const displayVal = value >= 100 ? value.toFixed(0) : value.toFixed(1);
      ctx.fillText(displayVal, x + barWidth / 2, y - 6);
      ctx.restore();

      // Category label below baseline
      ctx.save();
      ctx.fillStyle = "rgba(160,180,220,0.85)";
      ctx.font = "11px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(cat, x + barWidth / 2, baselineY + 8);
      ctx.restore();

      // Baseline tick
      ctx.save();
      ctx.strokeStyle = color + "66";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, baselineY);
      ctx.lineTo(x + barWidth, baselineY);
      ctx.stroke();
      ctx.restore();
    });

    // Draw baseline
    ctx.save();
    ctx.strokeStyle = "rgba(99,143,211,0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(chartArea.x, baselineY);
    ctx.lineTo(chartArea.x + chartArea.width, baselineY);
    ctx.stroke();
    ctx.restore();
  }, [latestPerCategory, visibleCategories, minVal, maxVal, width, height]);

  return (
    <div style={{ position: "relative", width, height }}>
      <canvas ref={canvasRef} style={{ display: "block" }} />
    </div>
  );
}

export const BarChart = memo(BarChartInner);
