export function DashboardSkeleton() {
  return (
    <div
      style={{
        display: "flex",
        height: "100dvh",
        background: "var(--color-bg-base)",
        fontFamily: "var(--font-sans)",
      }}
    >
      {/* Sidebar skeleton */}
      <div
        style={{
          width: "var(--sidebar-width, 280px)",
          borderRight: "1px solid var(--color-border)",
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          flexShrink: 0,
        }}
      >
        <div className="skeleton" style={{ height: 20, width: "60%", borderRadius: 8 }} />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 36, borderRadius: 8 }} />
        ))}
      </div>

      {/* Main content skeleton */}
      <div style={{ flex: 1, padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Topbar */}
        <div className="flex items-center justify-between">
          <div className="skeleton" style={{ height: 28, width: 240, borderRadius: 8 }} />
          <div className="flex gap-3">
            <div className="skeleton" style={{ height: 32, width: 100, borderRadius: 6 }} />
            <div className="skeleton" style={{ height: 32, width: 100, borderRadius: 6 }} />
          </div>
        </div>

        {/* Charts grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, flex: 1 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="skeleton"
              style={{ borderRadius: 16, minHeight: 280 }}
            />
          ))}
        </div>

        {/* Table */}
        <div className="skeleton" style={{ height: 200, borderRadius: 16 }} />
      </div>
    </div>
  );
}
