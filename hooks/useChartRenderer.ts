"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseChartRendererOptions {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  renderFn: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  deps: React.DependencyList;
  enabled?: boolean;
}

interface UseChartRendererReturn {
  fps: number;
  renderTimeMs: number;
  frameCount: number;
}

/**
 * Abstracts the requestAnimationFrame loop + canvas lifecycle.
 * Calls renderFn every frame. Tracks FPS and render time.
 */
export function useChartRenderer({
  canvasRef,
  renderFn,
  deps,
  enabled = true,
}: UseChartRendererOptions): UseChartRendererReturn {
  const [fps, setFps] = useState(0);
  const [renderTimeMs, setRenderTimeMs] = useState(0);
  const [frameCount, setFrameCount] = useState(0);

  const rafHandle = useRef<number>(0);
  const lastFrameTime = useRef<number>(0);
  const fpsHistory = useRef<number[]>([]);
  const frameCountRef = useRef(0);

  // Store the latest renderFn in a ref so the rAF loop always has the latest
  const renderFnRef = useRef(renderFn);
  useEffect(() => {
    renderFnRef.current = renderFn;
  });

  const startLoop = useCallback(() => {
    const loop = (timestamp: number) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        rafHandle.current = requestAnimationFrame(loop);
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        rafHandle.current = requestAnimationFrame(loop);
        return;
      }

      // Compute FPS from delta time
      if (lastFrameTime.current > 0) {
        const delta = timestamp - lastFrameTime.current;
        const instantFps = delta > 0 ? Math.min(120, 1000 / delta) : 60;
        fpsHistory.current.push(instantFps);
        if (fpsHistory.current.length > 30) fpsHistory.current.shift();

        // Update display FPS every 500ms to avoid too many re-renders
        const avgFps = Math.round(
          fpsHistory.current.reduce((a, b) => a + b, 0) / fpsHistory.current.length
        );
        if (frameCountRef.current % 30 === 0) {
          setFps(avgFps);
        }
      }
      lastFrameTime.current = timestamp;

      // Measure render time
      const renderStart = performance.now();
      const cssWidth = canvas.clientWidth || canvas.width;
      const cssHeight = canvas.clientHeight || canvas.height;
      renderFnRef.current(ctx, cssWidth, cssHeight);
      const elapsed = performance.now() - renderStart;

      frameCountRef.current++;
      if (frameCountRef.current % 30 === 0) {
        setRenderTimeMs(Math.round(elapsed * 100) / 100);
        setFrameCount(frameCountRef.current);
      }

      rafHandle.current = requestAnimationFrame(loop);
    };

    rafHandle.current = requestAnimationFrame(loop);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stopLoop = useCallback(() => {
    if (rafHandle.current) {
      cancelAnimationFrame(rafHandle.current);
      rafHandle.current = 0;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      stopLoop();
      return;
    }
    startLoop();
    return stopLoop;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, startLoop, stopLoop, ...deps]);

  return { fps, renderTimeMs, frameCount };
}
