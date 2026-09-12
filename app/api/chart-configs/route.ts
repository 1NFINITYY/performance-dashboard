import { NextResponse } from "next/server";
import { DATA_CATEGORIES, CATEGORY_COLORS, ChartConfig, ChartType } from "@/lib/types";

// Statically generated chart configs — cached at build time
export const dynamic = "force-static";

const DEFAULT_CHART_TYPES: ChartType[] = ["line", "bar", "scatter", "heatmap"];

export function GET() {
  const configs: ChartConfig[] = DATA_CATEGORIES.map((cat, i) => ({
    id: cat,
    type: DEFAULT_CHART_TYPES[i % 4],
    dataKey: cat,
    color: CATEGORY_COLORS[cat],
    visible: true,
    label: cat.charAt(0).toUpperCase() + cat.slice(1),
  }));

  return NextResponse.json({ configs });
}
