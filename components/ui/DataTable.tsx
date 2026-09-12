"use client";

import React, { useRef, useState, useCallback, useMemo, memo } from "react";
import { DataPoint, CATEGORY_COLORS } from "@/lib/types";
import { useVirtualization } from "@/hooks/useVirtualization";
import { formatTimestamp } from "@/lib/performanceUtils";

const ROW_HEIGHT = 36;
const VISIBLE_HEIGHT = 155;

type SortKey = "timestamp" | "value" | "category";
type SortDir = "asc" | "desc";

interface DataTableProps {
  data: DataPoint[];
  /** Height available for the virtualized scroll body. Defaults to VISIBLE_HEIGHT. */
  containerHeight?: number;
}

function DataTableInner({ data, containerHeight = VISIBLE_HEIGHT }: DataTableProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const [sortKey, setSortKey] = useState<SortKey>("timestamp");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const handleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir("desc");
      return key;
    });
  }, []);

  // Filter + sort data (memoized)
  const processedData = useMemo(() => {
    let result = data;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((d) => d.category.includes(q) || String(d.value).includes(q));
    }

    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "timestamp") cmp = a.timestamp - b.timestamp;
      else if (sortKey === "value") cmp = a.value - b.value;
      else cmp = a.category.localeCompare(b.category);
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [data, sortKey, sortDir, search]);

  const { startIndex, endIndex, totalHeight, offsetTop } = useVirtualization({
    totalCount: processedData.length,
    rowHeight: ROW_HEIGHT,
    containerHeight,
    scrollTop,
    overscan: 5,
  });

  const visibleRows = processedData.slice(startIndex, endIndex + 1);

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <span style={{ opacity: 0.3 }}>↕</span>;
    return <span>{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "var(--color-bg-surface)", borderTop: "1px solid var(--color-border)" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--color-border)",
          background: "var(--color-bg-elevated)",
        }}
      >
        <div
          className="chart-card__title"
          style={{ color: "var(--color-accent-cyan)" }}
        >
          📋 Raw Data Stream
        </div>
        <div className="flex items-center gap-3">
          <span
            className="badge badge--blue"
            style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem" }}
            suppressHydrationWarning
          >
            {processedData.length.toLocaleString()} rows
          </span>
          <input
            type="text"
            placeholder="Filter..."
            className="input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 140, padding: "4px 10px", fontSize: "0.8125rem" }}
            aria-label="Filter data rows"
          />
        </div>
      </div>

      {/* Table header */}
      <table className="data-table" style={{ tableLayout: "fixed" }}>
        <colgroup>
          <col style={{ width: "40%" }} />
          <col style={{ width: "30%" }} />
          <col style={{ width: "30%" }} />
        </colgroup>
        <thead>
          <tr>
            {(["timestamp", "value", "category"] as SortKey[]).map((col) => (
              <th key={col} onClick={() => handleSort(col)}>
                {col.charAt(0).toUpperCase() + col.slice(1)} <SortIcon col={col} />
              </th>
            ))}
          </tr>
        </thead>
      </table>

      {/* Virtualized body — fills remaining height */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{
          height: containerHeight,
          overflowY: "auto",
          overflowX: "hidden",
          position: "relative",
          flex: 1,
        }}
      >
        {/* Total height spacer */}
        <div style={{ height: totalHeight, position: "relative" }}>
          {/* Offset container */}
          <table
            className="data-table"
            style={{
              position: "absolute",
              top: offsetTop,
              left: 0,
              right: 0,
              tableLayout: "fixed",
            }}
          >
            <colgroup>
              <col style={{ width: "40%" }} />
              <col style={{ width: "30%" }} />
              <col style={{ width: "30%" }} />
            </colgroup>
            <tbody>
              {visibleRows.map((row, i) => {
                const color = CATEGORY_COLORS[row.category];
                return (
                  <tr key={startIndex + i} style={{ height: ROW_HEIGHT }}>
                    <td suppressHydrationWarning style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
                      {formatTimestamp(row.timestamp)}
                    </td>
                    <td
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.8125rem",
                        color,
                        fontWeight: 500,
                      }}
                    >
                      {row.value.toFixed(2)}
                    </td>
                    <td>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          fontSize: "0.8125rem",
                          color,
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: color,
                            flexShrink: 0,
                          }}
                        />
                        {row.category}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export const DataTable = memo(DataTableInner);
