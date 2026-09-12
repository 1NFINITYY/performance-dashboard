import { Suspense } from "react";
import { generateInitialDataset } from "@/lib/dataGenerator";
import { DataProvider } from "@/components/providers/DataProvider";
import { DashboardSkeleton } from "@/components/ui/DashboardSkeleton";
import { DashboardContent } from "./DashboardContent";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Server Component: fetch initial dataset (1000 points) for SSR
  const initialData = await Promise.resolve(generateInitialDataset(1000));

  return (
    <DataProvider initialData={initialData}>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </DataProvider>
  );
}
