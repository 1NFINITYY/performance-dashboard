import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PerformanceDash — Real-time Data Visualization at 60fps",
  description:
    "High-performance real-time dashboard rendering 10,000+ data points at 60fps using Next.js 14 App Router, Canvas, and Web Workers.",
  keywords: [
    "real-time dashboard",
    "data visualization",
    "performance",
    "canvas",
    "next.js",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
