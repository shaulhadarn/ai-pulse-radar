import { Suspense } from "react";
import { RadarDashboard } from "@/components/radar-dashboard";
import { getRadarSnapshot } from "@/lib/radar/get-radar";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <header className="mb-8 flex flex-col gap-2">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">AI Pulse Radar</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">What builders are shipping with AI right now</h1>
        <p className="max-w-2xl text-muted">
          Ranked signals from X, Hacker News, Reddit and GitHub, grouped by technique so you can see which tools and
          methods are gaining momentum.
        </p>
      </header>
      <Suspense fallback={<RadarSkeleton />}>
        <Radar />
      </Suspense>
    </main>
  );
}

async function Radar() {
  const snapshot = await getRadarSnapshot();
  return <RadarDashboard snapshot={snapshot} />;
}

function RadarSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]" aria-busy="true" aria-label="Scanning sources">
      <div className="h-96 animate-pulse rounded-xl bg-surface" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-surface" />
        ))}
      </div>
    </div>
  );
}
