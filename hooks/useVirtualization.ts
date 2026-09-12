"use client";

import { useMemo, useCallback } from "react";

interface UseVirtualizationOptions {
  totalCount: number;
  rowHeight: number;
  containerHeight: number;
  scrollTop: number;
  overscan?: number;
}

interface UseVirtualizationReturn {
  startIndex: number;
  endIndex: number;
  visibleCount: number;
  totalHeight: number;
  offsetTop: number;
  scrollToIndex: (index: number, containerRef: React.RefObject<HTMLDivElement | null>) => void;
}

/**
 * Virtual scrolling calculations hook.
 * Only renders rows within the visible viewport.
 */
export function useVirtualization({
  totalCount,
  rowHeight,
  containerHeight,
  scrollTop,
  overscan = 3,
}: UseVirtualizationOptions): UseVirtualizationReturn {
  const result = useMemo(() => {
    if (totalCount === 0 || rowHeight === 0 || containerHeight === 0) {
      return {
        startIndex: 0,
        endIndex: 0,
        visibleCount: 0,
        totalHeight: 0,
        offsetTop: 0,
      };
    }

    const visibleStart = Math.floor(scrollTop / rowHeight);
    const visibleEnd = Math.ceil((scrollTop + containerHeight) / rowHeight);

    const startIndex = Math.max(0, visibleStart - overscan);
    const endIndex = Math.min(totalCount - 1, visibleEnd + overscan);
    const visibleCount = endIndex - startIndex + 1;
    const totalHeight = totalCount * rowHeight;
    const offsetTop = startIndex * rowHeight;

    return { startIndex, endIndex, visibleCount, totalHeight, offsetTop };
  }, [totalCount, rowHeight, containerHeight, scrollTop, overscan]);

  const scrollToIndex = useCallback(
    (index: number, containerRef: React.RefObject<HTMLDivElement | null>) => {
      if (!containerRef.current) return;
      const targetScrollTop = index * rowHeight;
      containerRef.current.scrollTop = targetScrollTop;
    },
    [rowHeight]
  );

  return { ...result, scrollToIndex };
}
