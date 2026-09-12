/// <reference lib="webworker" />
import { WorkerRequest, WorkerResponse, DataPoint, AggregatedPoint, Granularity, DataCategory, DATA_CATEGORIES } from "../types";

// ============================================================
// Granularity → bucket size in milliseconds
// ============================================================

const GRANULARITY_MS: Record<Granularity, number> = {
  "1min": 60 * 1000,
  "5min": 5 * 60 * 1000,
  "1hour": 60 * 60 * 1000,
};

// ============================================================
// Aggregation logic
// ============================================================

function aggregateData(
  data: DataPoint[],
  granularity: Granularity,
  categories: DataCategory[]
): AggregatedPoint[] {
  const bucketMs = GRANULARITY_MS[granularity];
  const categorySet = new Set(categories);

  // Group by bucket + category
  const buckets = new Map<string, { sum: number; min: number; max: number; count: number; timestamp: number; category: DataCategory }>();

  for (const point of data) {
    if (!categorySet.has(point.category)) continue;
    const bucketTs = Math.floor(point.timestamp / bucketMs) * bucketMs;
    const key = `${bucketTs}::${point.category}`;

    if (!buckets.has(key)) {
      buckets.set(key, {
        sum: point.value,
        min: point.value,
        max: point.value,
        count: 1,
        timestamp: bucketTs,
        category: point.category,
      });
    } else {
      const b = buckets.get(key)!;
      b.sum += point.value;
      b.min = Math.min(b.min, point.value);
      b.max = Math.max(b.max, point.value);
      b.count++;
    }
  }

  const result: AggregatedPoint[] = [];
  for (const [, b] of buckets) {
    result.push({
      timestamp: b.timestamp,
      category: b.category,
      avg: Math.round((b.sum / b.count) * 100) / 100,
      min: b.min,
      max: b.max,
      count: b.count,
    });
  }

  // Sort by timestamp ascending
  result.sort((a, b) => a.timestamp - b.timestamp);
  return result;
}

// ============================================================
// Message handler
// ============================================================

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { type, data, granularity, categories } = event.data;

  if (type === "aggregate") {
    const start = performance.now();
    const result = aggregateData(
      data,
      granularity,
      categories.length > 0 ? categories : [...DATA_CATEGORIES]
    );
    const processingTimeMs = performance.now() - start;

    const response: WorkerResponse = {
      type: "aggregated",
      result,
      processingTimeMs: Math.round(processingTimeMs * 100) / 100,
    };

    self.postMessage(response);
  }
};
