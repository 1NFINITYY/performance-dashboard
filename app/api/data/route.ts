import { NextResponse } from "next/server";
import { generateInitialDataset } from "@/lib/dataGenerator";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const count = Math.min(parseInt(searchParams.get("count") ?? "1000"), 50000);
  const granularity = searchParams.get("granularity") ?? "1min";

  try {
    const data = generateInitialDataset(count);

    return NextResponse.json(
      {
        data,
        meta: {
          count: data.length,
          granularity,
          generatedAt: Date.now(),
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate data", detail: String(error) },
      { status: 500 }
    );
  }
}
