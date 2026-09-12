"use client";

import React, { memo, useRef, useEffect, useCallback, useState } from "react";
import { useDashboard } from "@/components/providers/DataProvider";
import { getFPSHealth, formatBytes, formatNumber } from "@/lib/performanceUtils";

function PerformanceMonitorInner() {
  const { metrics, isStreaming, toggleStream, stressTestMode } = useDashboard();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const historyCanvasRef = useRef<HTMLCanvasElement>(null);

  // ── Drag-to-reposition ────────────────────────────────────────────────────
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null); // null = use CSS default (top-right)
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    setDragging(true);
    e.preventDefault();
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const el = containerRef.current;
      if (!el) return;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const left = Math.min(vw - w, Math.max(0, e.clientX - dragOffset.current.x));
      const top = Math.min(vh - h, Math.max(0, e.clientY - dragOffset.current.y));
      // Store as top/left so we can position freely
      setPos({ top, right: vw - left - w });
    };
    const onUp = () => setDragging(false);
    if (dragging) {
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging]);

  // ── FPS color ─────────────────────────────────────────────────────────────
  const fpsHealth = getFPSHealth(metrics.fps);
  const fpsColor =
    fpsHealth === "good"
      ? "var(--color-fps-good)"
      : fpsHealth === "warn"
      ? "var(--color-fps-warn)"
      : "var(--color-fps-bad)";

  // ── Sparkline ─────────────────────────────────────────────────────────────
  const drawSparkline = useCallback(() => {
    const canvas = historyCanvasRef.current;
    if (!canvas || !metrics.frameHistory.length) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const history = metrics.frameHistory.slice(-60);
    if (history.length < 2) return;

    const maxFps = 70;
    const step = w / (history.length - 1);

    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(52,211,153,0.2)";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    const guideY = h - (60 / maxFps) * h;
    ctx.beginPath();
    ctx.moveTo(0, guideY);
    ctx.lineTo(w, guideY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = fpsColor;
    for (let i = 0; i < history.length; i++) {
      const fps = Math.min(history[i], maxFps);
      const barH = (fps / maxFps) * h;
      const x = i * step;
      ctx.globalAlpha = 0.8;
      ctx.fillRect(x, h - barH, Math.max(step - 1, 1), barH);
    }
    ctx.globalAlpha = 1;
  }, [metrics.frameHistory, fpsColor]);

  useEffect(() => {
    drawSparkline();
  }, [drawSparkline]);

  // ── Positioning style ─────────────────────────────────────────────────────
  const posStyle: React.CSSProperties = pos
    ? { top: pos.top, right: pos.right, left: "unset", bottom: "unset" }
    : { top: 16, right: 16 }; // default position

  return (
    <div
      ref={containerRef}
      className="perf-overlay animate-fade-in"
      id="performance-monitor"
      style={{
        position: "fixed",
        ...posStyle,
        minWidth: isCollapsed ? "auto" : 240,
        transition: dragging ? "none" : "min-width var(--transition-base)",
        userSelect: "none",
        zIndex: 100,
      }}
    >
      {/* Header — acts as drag handle */}
      <div
        className="flex items-center justify-between"
        style={{
          marginBottom: isCollapsed ? 0 : 10,
          cursor: dragging ? "grabbing" : "grab",
        }}
        onMouseDown={onDragStart}
      >
        <div className="flex items-center gap-2">
          <div className={`dot ${isStreaming ? "dot--live" : "dot--paused"}`} />
          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-secondary)", letterSpacing: "0.06em" }}>
            PERF MONITOR
          </span>
        </div>
        <button
          className="btn btn--ghost btn--sm"
          onClick={() => setIsCollapsed((p) => !p)}
          onMouseDown={(e) => e.stopPropagation()} // don't start drag on collapse click
          title={isCollapsed ? "Expand" : "Collapse"}
          aria-label="Toggle performance monitor"
          style={{ padding: "2px 6px", fontSize: 12 }}
        >
          {isCollapsed ? "▼" : "▲"}
        </button>
      </div>

      {!isCollapsed && (
        <>
          {/* FPS */}
          <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
            <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>FPS</span>
            <span
              suppressHydrationWarning
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: "1.25rem",
                color: fpsColor,
                lineHeight: 1,
              }}
            >
              {metrics.fps}
            </span>
          </div>

          {/* Sparkline */}
          <canvas
            ref={historyCanvasRef}
            width={200}
            height={32}
            style={{ width: "100%", height: 32, borderRadius: 4, marginBottom: 10 }}
          />

          {/* Metrics grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginBottom: 10,
            }}
          >
            <MetricItem label="Memory" value={`${metrics.memoryUsageMB.toFixed(1)} MB`} color="var(--color-accent-purple)" />
            <MetricItem label="Render" value={`${metrics.renderTimeMs.toFixed(1)} ms`} color="var(--color-accent-amber)" />
            <MetricItem label="Points" value={formatNumber(metrics.dataPointCount)} color="var(--color-accent-cyan)" />
            <MetricItem label="Worker" value={`${metrics.dataProcessingTimeMs.toFixed(1)} ms`} color="var(--color-accent-green)" />
          </div>

          {/* Stress badge */}
          {stressTestMode && (
            <div className="badge badge--red" style={{ width: "100%", justifyContent: "center", marginBottom: 8 }}>
              🔥 STRESS TEST ACTIVE
            </div>
          )}

          {/* Stream toggle */}
          <button
            className={`btn w-full ${isStreaming ? "btn--danger" : "btn--primary"}`}
            onClick={toggleStream}
            onMouseDown={(e) => e.stopPropagation()} // don't start drag on button click
            id="toggle-stream-btn"
          >
            {isStreaming ? "⏸ Pause Stream" : "▶ Resume Stream"}
          </button>
        </>
      )}
    </div>
  );
}

function MetricItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 6, padding: "6px 8px" }}>
      <div style={{ fontSize: "0.65rem", color: "var(--color-text-muted)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

export const PerformanceMonitor = memo(PerformanceMonitorInner);
