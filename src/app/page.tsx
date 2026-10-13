import Link from "next/link";
import { Suspense } from "react";
import { RadarGlyph } from "@/components/insight-ui";
import { NextWave } from "@/components/next-wave";
import { RadarDashboard } from "@/components/radar-dashboard";
import { getRadarSnapshot } from "@/lib/radar/get-radar";
import { buildInsights } from "@/lib/radar/insights";
import { buildOutlook } from "@/lib/radar/outlook";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <header className="relative mb-8 flex flex-col gap-3">
        <RadarGlyph className="pointer-events-none absolute -right-24 -top-24 hidden size-80 opacity-60 md:block" />
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">Live radar</p>
        <h1 className="relative max-w-3xl text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
          Spot the next AI wave before everyone else
        </h1>
        <p className="relative max-w-2xl text-muted text-pretty">
          Ranked signals from X, Hacker News, Reddit and GitHub, scored for momentum so you can see which technologies are about to matter and
          what to do about them this week.{" "}
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
  const outlook = buildOutlook(buildInsights(snapshot));
  return (
    <div className="flex flex-col gap-10">
      <NextWave outlook={outlook} now={Date.parse(snapshot.generatedAt)} />
      <section className="flex flex-col gap-4" aria-labelledby="all-signals">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-accent">Live feed</p>
          <h2 id="all-signals" className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
            Every signal, ranked
          </h2>
        </div>
        <RadarDashboard snapshot={snapshot} meta={outlook.meta} />
      </section>
    </div>
  );
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
