"use client";

import React, {
  useRef,
  useEffect,
  useCallback,
  memo,
  createContext,
  useContext,
  useState,
} from "react";

// ============================================================
// Chart Dimension Context
// ============================================================

interface ChartDimensions {
  width: number;
  height: number;
}

const ChartDimensionContext = createContext<ChartDimensions>({ width: 0, height: 0 });

export function useChartDimensions(): ChartDimensions {
  return useContext(ChartDimensionContext);
}

// ============================================================
// ChartWrapper
// ============================================================

type ChartChildren = React.ReactNode | ((dims: ChartDimensions) => React.ReactNode);

interface ChartWrapperProps {
  title: string;
  subtitle?: string;
  accentColor?: string;
  children: ChartChildren;
  className?: string;
  badge?: React.ReactNode;
}

function ChartWrapperInner({
  title,
  subtitle,
  accentColor = "var(--color-accent-blue)",
  children,
  className = "",
  badge,
}: ChartWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<ChartDimensions>({ width: 0, height: 0 });

  const updateDimensions = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setDimensions({ width: rect.width, height: rect.height });
  }, []);

  useEffect(() => {
    updateDimensions();
    const observer = new ResizeObserver(updateDimensions);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [updateDimensions]);

  return (
    <div
      className={`chart-card ${className}`}
      style={{ "--accent": accentColor } as React.CSSProperties}
    >
      <div className="chart-card__header">
        <div>
          <div className="chart-card__title" style={{ color: accentColor }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: 2 }}>
              {subtitle}
            </div>
          )}
        </div>
        {badge && <div>{badge}</div>}
      </div>
      <div className="chart-card__body">
        <ChartDimensionContext.Provider value={dimensions}>
          <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
            {dimensions.width > 0 && (
              typeof children === "function" ? children(dimensions) : children
            )}
          </div>
        </ChartDimensionContext.Provider>
      </div>
    </div>
  );
}

export const ChartWrapper = memo(ChartWrapperInner);
