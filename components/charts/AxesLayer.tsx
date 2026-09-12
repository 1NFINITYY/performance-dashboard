"use client";

import React, { memo, useMemo } from "react";
import { ChartArea, ChartPadding, DEFAULT_CHART_PADDING } from "@/lib/types";

interface TickValue {
  value: number;
  label: string;
}

interface AxesLayerProps {
  width: number;
  height: number;
  minValue: number;
  maxValue: number;
  minTimestamp: number;
  maxTimestamp: number;
  padding?: ChartPadding;
  yUnit?: string;
  yTickCount?: number;
  xTickCount?: number;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  const ss = d.getSeconds().toString().padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function AxesLayerInner({
  width,
  height,
  minValue,
  maxValue,
  minTimestamp,
  maxTimestamp,
  padding = DEFAULT_CHART_PADDING,
  yUnit = "",
  yTickCount = 5,
  xTickCount = 5,
}: AxesLayerProps) {
  const chartArea: ChartArea = {
    x: padding.left,
    y: padding.top,
    width: width - padding.left - padding.right,
    height: height - padding.top - padding.bottom,
  };

  const yTicks: TickValue[] = useMemo(() => {
    const ticks: TickValue[] = [];
    for (let i = 0; i <= yTickCount; i++) {
      const t = 1 - i / yTickCount; // inverted: i=0 is top (max)
      const value = minValue + (maxValue - minValue) * t;
      ticks.push({
        value: chartArea.y + chartArea.height * (i / yTickCount),
        label: `${Math.round(value)}${yUnit}`,
      });
    }
    return ticks;
  }, [minValue, maxValue, yUnit, yTickCount, chartArea.y, chartArea.height]);

  const xTicks: TickValue[] = useMemo(() => {
    if (maxTimestamp <= minTimestamp) return [];
    const ticks: TickValue[] = [];
    for (let i = 0; i <= xTickCount; i++) {
      const t = i / xTickCount;
      const ts = minTimestamp + (maxTimestamp - minTimestamp) * t;
      ticks.push({
        value: chartArea.x + chartArea.width * t,
        label: formatTime(ts),
      });
    }
    return ticks;
  }, [minTimestamp, maxTimestamp, xTickCount, chartArea.x, chartArea.width]);

  if (width === 0 || height === 0) return null;

  return (
    <svg
      width={width}
      height={height}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        pointerEvents: "none",
        overflow: "visible",
      }}
    >
      {/* Y axis line */}
      <line
        x1={chartArea.x}
        y1={chartArea.y}
        x2={chartArea.x}
        y2={chartArea.y + chartArea.height}
        stroke="rgba(99,143,211,0.2)"
        strokeWidth={1}
      />
      {/* X axis line */}
      <line
        x1={chartArea.x}
        y1={chartArea.y + chartArea.height}
        x2={chartArea.x + chartArea.width}
        y2={chartArea.y + chartArea.height}
        stroke="rgba(99,143,211,0.2)"
        strokeWidth={1}
      />

      {/* Y Ticks */}
      {yTicks.map((tick, i) => (
        <g key={i}>
          <line
            x1={chartArea.x - 4}
            y1={tick.value}
            x2={chartArea.x}
            y2={tick.value}
            stroke="rgba(99,143,211,0.3)"
            strokeWidth={1}
          />
          <text
            x={chartArea.x - 8}
            y={tick.value}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize={10}
            fill="rgba(140,163,200,0.7)"
            fontFamily="'JetBrains Mono', monospace"
          >
            {tick.label}
          </text>
        </g>
      ))}

      {/* X Ticks */}
      {xTicks.map((tick, i) => (
        <g key={i}>
          <line
            x1={tick.value}
            y1={chartArea.y + chartArea.height}
            x2={tick.value}
            y2={chartArea.y + chartArea.height + 4}
            stroke="rgba(99,143,211,0.3)"
            strokeWidth={1}
          />
          <text
            x={tick.value}
            y={chartArea.y + chartArea.height + 14}
            textAnchor="middle"
            fontSize={9}
            fill="rgba(140,163,200,0.6)"
            fontFamily="'JetBrains Mono', monospace"
          >
            {tick.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export const AxesLayer = memo(AxesLayerInner);
