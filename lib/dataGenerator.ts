import {
  DataPoint,
  DataCategory,
  DATA_CATEGORIES,
} from "./types";

// ============================================================
// Constants
// ============================================================

const NOISE_AMPLITUDE = 0.15;

// Category-specific base values and ranges for realistic simulation
const CATEGORY_PROFILES: Record<
  DataCategory,
  { base: number; amplitude: number; frequency: number; unit: string }
> = {
  cpu: { base: 45, amplitude: 35, frequency: 0.05, unit: "%" },
  memory: { base: 60, amplitude: 20, frequency: 0.02, unit: "%" },
  network: { base: 50, amplitude: 45, frequency: 0.08, unit: "MB/s" },
  latency: { base: 25, amplitude: 40, frequency: 0.12, unit: "ms" },
  throughput: { base: 800, amplitude: 400, frequency: 0.04, unit: "req/s" },
};

// ============================================================
// Noise function (simple pseudo-random that's deterministic for seeding)
// ============================================================

function seededNoise(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

function generateNoise(index: number, amplitude: number): number {
  return (seededNoise(index) - 0.5) * 2 * amplitude;
}

// ============================================================
// Generate a single DataPoint for a category at a given timestamp
// ============================================================

export function generateDataPoint(
  category: DataCategory,
  timestamp: number,
  index: number
): DataPoint {
  const profile = CATEGORY_PROFILES[category];

  // Sinusoidal base with noise
  const sineValue =
    profile.base +
    profile.amplitude *
      Math.sin(2 * Math.PI * profile.frequency * (index / 100));

  const noise = generateNoise(index + category.length * 1000, profile.amplitude * NOISE_AMPLITUDE);

  // Occasional spikes for realism (5% chance)
  const spike = seededNoise(index * 3 + category.length) < 0.05
    ? profile.amplitude * 0.5 * (seededNoise(index + 7) > 0.5 ? 1 : -1)
    : 0;

  const rawValue = sineValue + noise + spike;

  // Clamp to reasonable range
  const minVal = profile.base - profile.amplitude * 1.2;
  const maxVal = profile.base + profile.amplitude * 1.2;
  const value = Math.max(minVal, Math.min(maxVal, rawValue));

  return {
    timestamp,
    value: Math.round(value * 100) / 100,
    category,
    metadata: {
      unit: profile.unit,
      index,
    },
  };
}

// ============================================================
// Generate a batch of new data points (one per category per tick)
// ============================================================

export function generateDataBatch(
  tickIndex: number,
  timestamp: number = Date.now()
): DataPoint[] {
  return DATA_CATEGORIES.map((category) =>
    generateDataPoint(category, timestamp, tickIndex)
  );
}

// ============================================================
// Generate initial historical dataset going back in time
// ============================================================

export function generateInitialDataset(
  count: number = 1000,
  intervalMs: number = 100
): DataPoint[] {
  const now = Date.now();
  const points: DataPoint[] = [];

  for (let i = 0; i < count; i++) {
    const timestamp = now - (count - i) * intervalMs;
    const batch = DATA_CATEGORIES.map((category) =>
      generateDataPoint(category, timestamp, i)
    );
    points.push(...batch);
  }

  // Sort by timestamp ascending
  points.sort((a, b) => a.timestamp - b.timestamp);
  return points;
}

// ============================================================
// Sliding window: maintain max N points, append new batch
// ============================================================

export function applySlideWindow(
  existing: DataPoint[],
  newBatch: DataPoint[],
  maxPoints: number
): DataPoint[] {
  const combined = [...existing, ...newBatch];
  if (combined.length <= maxPoints) return combined;
  return combined.slice(combined.length - maxPoints);
}
