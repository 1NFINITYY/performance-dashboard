"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { PerformanceMetrics, DEFAULT_PERFORMANCE_METRICS } from "@/lib/types";
import { getMemoryUsageMB } from "@/lib/performanceUtils";

const POLL_INTERVAL_MS = 100;

/**
 * Tracks FPS, memory usage, and render metrics using rAF + PerformanceObserver.
 */
export function usePerformanceMonitor(dataPointCount = 0): PerformanceMetrics & {
  updateRenderTime: (ms: number) => void;
  updateDataProcessingTime: (ms: number) => void;
} {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    ...DEFAULT_PERFORMANCE_METRICS,
    dataPointCount,
  });

  const lastFrameTime = useRef(0);
  const fpsHistory = useRef<number[]>([]);
  const rafHandle = useRef<number>(0);
  const renderTimeRef = useRef(0);
  const dataProcessingTimeRef = useRef(0);

  // rAF-based FPS calculation
  useEffect(() => {
    let frameCount = 0;
    const measureFrame = (timestamp: number) => {
      if (lastFrameTime.current > 0) {
        const delta = timestamp - lastFrameTime.current;
        if (delta > 0 && delta < 500) { // ignore tab-switch spikes
          const fps = Math.min(120, 1000 / delta);
          fpsHistory.current.push(fps);
          if (fpsHistory.current.length > 60) fpsHistory.current.shift();

          // Update FPS display every 6 frames (~100ms at 60fps) for snappy feedback
          frameCount++;
          if (frameCount % 6 === 0) {
            const avgFps = Math.round(
              fpsHistory.current.reduce((a, b) => a + b, 0) / fpsHistory.current.length
            );
            setMetrics((prev) => ({ ...prev, fps: avgFps, frameHistory: [...fpsHistory.current.slice(-60)] }));
          }
        }
      } else {
        // First frame — seed display so it doesn't show 0
        setMetrics((prev) => ({ ...prev, fps: 60 }));
      }
      lastFrameTime.current = timestamp;
      rafHandle.current = requestAnimationFrame(measureFrame);
    };

    rafHandle.current = requestAnimationFrame(measureFrame);
    return () => cancelAnimationFrame(rafHandle.current);
  }, []);

  // Update dataPointCount immediately whenever it changes — no polling delay
  useEffect(() => {
    setMetrics((prev) => ({ ...prev, dataPointCount }));
  }, [dataPointCount]);

  // Periodic full metrics aggregation (memory, render time, etc.) — decoupled from dataPointCount
  useEffect(() => {
    const poll = setInterval(() => {
      setMetrics((prev) => ({
        ...prev,
        memoryUsageMB: getMemoryUsageMB(),
        renderTimeMs: renderTimeRef.current,
        dataProcessingTimeMs: dataProcessingTimeRef.current,
      }));
    }, POLL_INTERVAL_MS);

    return () => clearInterval(poll);
  }, []);

  const updateRenderTime = useCallback((ms: number) => {
    renderTimeRef.current = Math.round(ms * 100) / 100;
  }, []);

  const updateDataProcessingTime = useCallback((ms: number) => {
    dataProcessingTimeRef.current = Math.round(ms * 100) / 100;
  }, []);

  return {
    ...metrics,
    updateRenderTime,
    updateDataProcessingTime,
  };
}
