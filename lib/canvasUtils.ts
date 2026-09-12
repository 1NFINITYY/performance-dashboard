import { ChartArea, ChartPadding, DEFAULT_CHART_PADDING, DataCategory } from "./types";

// ============================================================
// Canvas Setup
// ============================================================

/**
 * Set up canvas for HiDPI (retina) displays.
 * Returns the device pixel ratio used.
 */
export function setupHiDPICanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number
): number {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.scale(dpr, dpr);
  }
  return dpr;
}

/**
 * Fast canvas clear — resets transform and clears entire canvas.
 */
export function clearCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  ctx.clearRect(0, 0, width, height);
}

// ============================================================
// Chart Area Geometry
// ============================================================

/**
 * Compute the drawable chart area given canvas dimensions and padding.
 */
export function getChartArea(
  canvasWidth: number,
  canvasHeight: number,
  padding: ChartPadding = DEFAULT_CHART_PADDING
): ChartArea {
  return {
    x: padding.left,
    y: padding.top,
    width: canvasWidth - padding.left - padding.right,
    height: canvasHeight - padding.top - padding.bottom,
  };
}

// ============================================================
// Scale Functions
// ============================================================

/**
 * Build a linear scale that maps a domain value to a canvas pixel.
 */
export function buildLinearScale(
  domainMin: number,
  domainMax: number,
  rangeMin: number,
  rangeMax: number
): (value: number) => number {
  const domainSpan = domainMax - domainMin;
  const rangeSpan = rangeMax - rangeMin;
  if (domainSpan === 0) return () => rangeMin + rangeSpan / 2;
  return (value: number) => rangeMin + ((value - domainMin) / domainSpan) * rangeSpan;
}

/**
 * Build X scale from timestamps to canvas X pixels.
 */
export function buildScaleX(
  minTimestamp: number,
  maxTimestamp: number,
  chartArea: ChartArea
): (timestamp: number) => number {
  return buildLinearScale(
    minTimestamp,
    maxTimestamp,
    chartArea.x,
    chartArea.x + chartArea.width
  );
}

/**
 * Build Y scale from values to canvas Y pixels (inverted — top=max).
 */
export function buildScaleY(
  minValue: number,
  maxValue: number,
  chartArea: ChartArea
): (value: number) => number {
  // Y is inverted: higher value = lower pixel Y
  return buildLinearScale(
    minValue,
    maxValue,
    chartArea.y + chartArea.height,
    chartArea.y
  );
}

// ============================================================
// Drawing Primitives
// ============================================================

/**
 * Draw a smooth polyline through a list of [x, y] pixel coordinates.
 * Uses Path2D for efficiency.
 */
export function drawPolyline(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
  color: string,
  lineWidth = 1.5,
  alpha = 1
): void {
  if (points.length < 2) return;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const path = new Path2D();
  path.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    path.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke(path);
  ctx.restore();
}

/**
 * Draw a filled area under a polyline (for area charts).
 */
export function drawArea(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
  color: string,
  baselineY: number,
  alpha = 0.15
): void {
  if (points.length < 2) return;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;

  const path = new Path2D();
  path.moveTo(points[0].x, baselineY);
  for (const p of points) {
    path.lineTo(p.x, p.y);
  }
  path.lineTo(points[points.length - 1].x, baselineY);
  path.closePath();
  ctx.fill(path);
  ctx.restore();
}

/**
 * Draw a single filled rectangle (bar).
 */
export function drawBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  radius = 3
): void {
  ctx.save();
  ctx.fillStyle = color;
  if (radius > 0 && height > radius * 2) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, [radius, radius, 0, 0]);
    ctx.fill();
  } else {
    ctx.fillRect(x, y, width, Math.max(1, height));
  }
  ctx.restore();
}

/**
 * Draw a single scatter point.
 */
export function drawPoint(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  alpha = 0.8
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Batch draw many scatter points efficiently using a single path.
 */
export function drawPointsBatch(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number; color: string }[],
  radius: number
): void {
  // Group by color for fewer style switches
  const byColor = new Map<string, { x: number; y: number }[]>();
  for (const p of points) {
    if (!byColor.has(p.color)) byColor.set(p.color, []);
    byColor.get(p.color)!.push(p);
  }

  ctx.save();
  ctx.globalAlpha = 0.7;
  for (const [color, pts] of byColor) {
    ctx.fillStyle = color;
    const path = new Path2D();
    for (const pt of pts) {
      path.moveTo(pt.x + radius, pt.y);
      path.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
    }
    ctx.fill(path);
  }
  ctx.restore();
}

/**
 * Draw a heatmap cell using fillRect.
 */
export function drawHeatCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  alpha = 1
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, height);
  ctx.restore();
}

// ============================================================
// Grid Lines
// ============================================================

/**
 * Draw horizontal grid lines across the chart area.
 */
export function drawGridLines(
  ctx: CanvasRenderingContext2D,
  chartArea: ChartArea,
  tickCount = 5,
  color = "rgba(99, 143, 211, 0.1)"
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);

  for (let i = 0; i <= tickCount; i++) {
    const y = chartArea.y + (chartArea.height / tickCount) * i;
    ctx.beginPath();
    ctx.moveTo(chartArea.x, y);
    ctx.lineTo(chartArea.x + chartArea.width, y);
    ctx.stroke();
  }

  ctx.setLineDash([]);
  ctx.restore();
}

/**
 * Draw vertical grid lines across the chart area.
 */
export function drawVerticalGridLines(
  ctx: CanvasRenderingContext2D,
  chartArea: ChartArea,
  tickCount = 6,
  color = "rgba(99, 143, 211, 0.07)"
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);

  for (let i = 0; i <= tickCount; i++) {
    const x = chartArea.x + (chartArea.width / tickCount) * i;
    ctx.beginPath();
    ctx.moveTo(x, chartArea.y);
    ctx.lineTo(x, chartArea.y + chartArea.height);
    ctx.stroke();
  }

  ctx.setLineDash([]);
  ctx.restore();
}

// ============================================================
// Axis Rendering (canvas-side tick marks)
// ============================================================

/**
 * Draw Y-axis labels on the canvas.
 */
export function drawYAxisLabels(
  ctx: CanvasRenderingContext2D,
  chartArea: ChartArea,
  minValue: number,
  maxValue: number,
  tickCount = 5,
  formatFn?: (v: number) => string
): void {
  const fmt = formatFn ?? ((v: number) => v.toFixed(0));
  ctx.save();
  ctx.fillStyle = "rgba(140, 163, 200, 0.7)";
  ctx.font = "11px 'JetBrains Mono', monospace";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";

  for (let i = 0; i <= tickCount; i++) {
    const t = i / tickCount;
    const value = minValue + (maxValue - minValue) * (1 - t);
    const y = chartArea.y + chartArea.height * t;
    ctx.fillText(fmt(value), chartArea.x - 8, y);
  }

  ctx.restore();
}

/**
 * Draw X-axis time labels on the canvas.
 */
export function drawXAxisLabels(
  ctx: CanvasRenderingContext2D,
  chartArea: ChartArea,
  minTimestamp: number,
  maxTimestamp: number,
  tickCount = 6
): void {
  ctx.save();
  ctx.fillStyle = "rgba(140, 163, 200, 0.7)";
  ctx.font = "10px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  for (let i = 0; i <= tickCount; i++) {
    const t = i / tickCount;
    const timestamp = minTimestamp + (maxTimestamp - minTimestamp) * t;
    const x = chartArea.x + chartArea.width * t;
    const d = new Date(timestamp);
    const label = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
    ctx.fillText(label, x, chartArea.y + chartArea.height + 8);
  }

  ctx.restore();
}

// ============================================================
// Color Scale
// ============================================================

/**
 * Interpolate between two hex colors given t in [0, 1].
 */
function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

/**
 * Get a heat color for a normalized value t in [0, 1].
 * Cool (blue) → warm (red) scale.
 */
export function getHeatColor(t: number): string {
  // Blue (0,0,255) → Cyan (0,255,255) → Green (0,255,0) → Yellow (255,255,0) → Red (255,0,0)
  const stops: [number, string][] = [
    [0.0, "#1e40af"],
    [0.25, "#0891b2"],
    [0.5, "#059669"],
    [0.75, "#d97706"],
    [1.0, "#dc2626"],
  ];

  let lower = stops[0];
  let upper = stops[stops.length - 1];

  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i][0] && t <= stops[i + 1][0]) {
      lower = stops[i];
      upper = stops[i + 1];
      break;
    }
  }

  const range = upper[0] - lower[0];
  const localT = range === 0 ? 0 : (t - lower[0]) / range;

  const [r1, g1, b1] = hexToRgb(lower[1]);
  const [r2, g2, b2] = hexToRgb(upper[1]);

  const r = Math.round(r1 + (r2 - r1) * localT);
  const g = Math.round(g1 + (g2 - g1) * localT);
  const b = Math.round(b1 + (b2 - b1) * localT);

  return `rgb(${r},${g},${b})`;
}

// ============================================================
// Downsampling (Level-of-Detail)
// ============================================================

/**
 * Downsample an array of points to at most `maxPoints` using
 * Largest-Triangle-Three-Buckets (LTTB) algorithm approximation.
 * For performance, we use a simple nth-point decimation here.
 */
export function downsamplePoints<T>(points: T[], maxPoints: number): T[] {
  if (points.length <= maxPoints) return points;
  const step = points.length / maxPoints;
  const result: T[] = [];
  for (let i = 0; i < maxPoints; i++) {
    result.push(points[Math.floor(i * step)]);
  }
  // Always include last point
  if (result[result.length - 1] !== points[points.length - 1]) {
    result[result.length - 1] = points[points.length - 1];
  }
  return result;
}

// ============================================================
// Nearest point hit detection
// ============================================================

/**
 * Find the index of the point nearest to (mouseX, mouseY) in pixel space.
 */
export function findNearestPoint(
  pixelPoints: { x: number; y: number }[],
  mouseX: number,
  mouseY: number,
  maxDistancePx = 30
): number {
  let minDist = Infinity;
  let nearestIdx = -1;

  for (let i = 0; i < pixelPoints.length; i++) {
    const dx = pixelPoints[i].x - mouseX;
    const dy = pixelPoints[i].y - mouseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDist) {
      minDist = dist;
      nearestIdx = i;
    }
  }

  return minDist <= maxDistancePx ? nearestIdx : -1;
}

// ============================================================
// Color helper
// ============================================================

export const CATEGORY_COLORS_MAP: Record<DataCategory, string> = {
  cpu: "#60a5fa",
  memory: "#a78bfa",
  network: "#34d399",
  latency: "#fbbf24",
  throughput: "#f87171",
};

export function getCategoryColor(category: DataCategory): string {
  return CATEGORY_COLORS_MAP[category] ?? "#60a5fa";
}
