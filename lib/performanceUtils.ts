// ============================================================
// Performance Utilities
// ============================================================

/**
 * Calculate FPS using delta time between frames.
 * Returns a value clamped to [0, 120].
 */
export function calculateFPS(lastFrameTime: number, currentTime: number): number {
  const delta = currentTime - lastFrameTime;
  if (delta === 0) return 60;
  return Math.min(120, Math.round(1000 / delta));
}

/**
 * Get current JS heap memory usage in MB.
 * Falls back to 0 if performance.memory is unavailable (Firefox/Safari).
 */
export function getMemoryUsageMB(): number {
  if (typeof performance === "undefined") return 0;
  // performance.memory is a Chrome-only API
  const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
  if (!mem) return 0;
  return Math.round((mem.usedJSHeapSize / 1024 / 1024) * 100) / 100;
}

/**
 * Measure the time taken to execute a synchronous function in ms.
 */
export function measureRenderTime(fn: () => void): number {
  const start = performance.now();
  fn();
  return Math.round((performance.now() - start) * 100) / 100;
}

/**
 * Create a throttled version of a function.
 * The function is called at most once per `limitMs` milliseconds.
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limitMs: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= limitMs) {
      lastCall = now;
      fn(...args);
    }
  };
}

/**
 * Create a debounced version of a function.
 * The function is called after `delayMs` ms of inactivity.
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn(...args);
      timer = null;
    }, delayMs);
  };
}

/**
 * Format a number for display with appropriate units.
 */
export function formatBytes(mb: number): string {
  if (mb < 1) return `${Math.round(mb * 1024)} KB`;
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb.toFixed(1)} MB`;
}

/**
 * Format a timestamp as HH:MM:SS.mmm
 */
export function formatTimestamp(ms: number): string {
  const d = new Date(ms);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  const ss = d.getSeconds().toString().padStart(2, "0");
  const msStr = d.getMilliseconds().toString().padStart(3, "0");
  return `${hh}:${mm}:${ss}.${msStr}`;
}

/**
 * Format a number with commas for thousands.
 */
export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

/**
 * Get FPS health class string.
 */
export function getFPSHealth(fps: number): "good" | "warn" | "bad" {
  if (fps >= 50) return "good";
  if (fps >= 30) return "warn";
  return "bad";
}

/**
 * Clamp a value between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation between two values.
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}
