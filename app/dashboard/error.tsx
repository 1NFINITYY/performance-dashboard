"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        background: "var(--color-bg-base)",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div
        style={{
          fontSize: "3rem",
          lineHeight: 1,
        }}
      >
        ⚠️
      </div>
      <h2
        style={{
          fontSize: "1.25rem",
          fontWeight: 600,
          color: "var(--color-text-primary)",
          margin: 0,
        }}
      >
        Something went wrong
      </h2>
      <p
        style={{
          fontSize: "0.875rem",
          color: "var(--color-text-secondary)",
          maxWidth: 400,
          textAlign: "center",
        }}
      >
        {error.message || "An unexpected error occurred while loading the dashboard."}
      </p>
      <button
        className="btn btn--primary"
        onClick={reset}
      >
        ↺ Try Again
      </button>
    </div>
  );
}
