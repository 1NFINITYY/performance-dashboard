"use client";

import { useCallback, useEffect, useRef, useState, startTransition } from "react";
import { DataPoint } from "@/lib/types";
import { generateDataBatch, applySlideWindow } from "@/lib/dataGenerator";

const DEFAULT_INTERVAL_MS = 100;
const DEFAULT_MAX_POINTS = 10_000;

interface UseDataStreamOptions {
  initialData?: DataPoint[];
  intervalMs?: number;
  maxPoints?: number;
  stressTestMode?: boolean;
}

interface UseDataStreamReturn {
  data: DataPoint[];
  isStreaming: boolean;
  dataPointCount: number;
  tickIndex: number;
  toggleStream: () => void;
  clearData: () => void;
}

export function useDataStream({
  initialData = [],
  intervalMs = DEFAULT_INTERVAL_MS,
  maxPoints = DEFAULT_MAX_POINTS,
  stressTestMode = false,
}: UseDataStreamOptions = {}): UseDataStreamReturn {
  const [data, setData] = useState<DataPoint[]>(initialData);
  const [isStreaming, setIsStreaming] = useState(true);
  const tickIndexRef = useRef(initialData.length > 0 ? Math.floor(initialData.length / 5) : 0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxPointsRef = useRef(maxPoints);
  const stressTestRef = useRef(stressTestMode);

  // Keep refs in sync so the interval callback always has latest values
  useEffect(() => {
    maxPointsRef.current = maxPoints;
  }, [maxPoints]);

  useEffect(() => {
    stressTestRef.current = stressTestMode;
  }, [stressTestMode]);

  const startStream = useCallback((ms: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const tick = tickIndexRef.current++;

      // In stress test mode, generate 10 batches per tick (50 points vs 5)
      const batchCount = stressTestRef.current ? 10 : 1;
      const newPoints: DataPoint[] = [];
      for (let b = 0; b < batchCount; b++) {
        newPoints.push(...generateDataBatch(tick * batchCount + b, now - b * 10));
      }

      // Wrap in startTransition: marks as non-urgent so browser paint (60fps) takes priority
      startTransition(() => {
        setData((prev) => applySlideWindow(prev, newPoints, maxPointsRef.current));
      });
    }, ms);
  }, []);

  const stopStream = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Start/stop streaming based on isStreaming state
  useEffect(() => {
    if (isStreaming) {
      startStream(intervalMs);
    } else {
      stopStream();
    }
    return stopStream;
  }, [isStreaming, intervalMs, startStream, stopStream]);

  const toggleStream = useCallback(() => {
    setIsStreaming((prev) => !prev);
  }, []);

  const clearData = useCallback(() => {
    setData([]);
    tickIndexRef.current = 0;
  }, []);

  return {
    data,
    isStreaming,
    dataPointCount: data.length,
    tickIndex: tickIndexRef.current,
    toggleStream,
    clearData,
  };
}
