import Link from "next/link";
import { Suspense } from "react";
import { RadarDashboard } from "@/components/radar-dashboard";
import { getRadarSnapshot } from "@/lib/radar/get-radar";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-8 flex flex-col gap-3">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">Live radar</p>
        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
          What builders are shipping with AI right now
        </h1>
        <p className="max-w-2xl text-muted text-pretty">
          Ranked signals from X, Hacker News, Reddit and GitHub, grouped by technique so you can see which tools and
          methods are gaining momentum.{" "}
          <Link href="/insights" className="font-medium text-accent underline-offset-4 hover:underline">
            Read today&apos;s insights →
          </Link>
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
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Scanning sources">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="h-96 animate-pulse rounded-2xl bg-surface" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-surface" />
          ))}
        </div>
      </div>
    </div>
  );
}
