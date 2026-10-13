import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ActivityBars, SourceMix } from "@/components/charts";
import { EvidenceList, MomentumBadge, PulseStat, SectionTitle, VelocityChip } from "@/components/insight-ui";
import { getRadarSnapshot } from "@/lib/radar/get-radar";
import { buildInsights } from "@/lib/radar/insights";
import { PLAYBOOK } from "@/lib/radar/playbook";
import { TECHNIQUES } from "@/lib/radar/taxonomy";
import type { TechniqueId } from "@/lib/radar/types";

type Params = Promise<{ technique: string }>;

export function generateStaticParams() {
  return TECHNIQUES.map((t) => ({ technique: t.id }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { technique } = await params;
  const meta = TECHNIQUES.find((t) => t.id === technique);
  if (!meta) return { title: "Not found · AI Pulse Radar" };
  return { title: `${meta.label} · AI Pulse Radar`, description: PLAYBOOK[meta.id].what };
}

export default function TechniquePage({ params }: { params: Params }) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-surface" aria-busy="true" />}>
        <TechniqueContent params={params} />
      </Suspense>
    </main>
  );
}

async function TechniqueContent({ params }: { params: Params }) {
  const { technique } = await params;
  const meta = TECHNIQUES.find((t) => t.id === technique);
  if (!meta) notFound();

  const snapshot = await getRadarSnapshot();
  const insights = buildInsights(snapshot);
  const now = Date.parse(snapshot.generatedAt);
  const t = insights.techniques.find((i) => i.technique === (meta.id as TechniqueId));
  const play = PLAYBOOK[meta.id];
  const rank = t ? insights.techniques.indexOf(t) + 1 : null;

  return (
    <div className="flex flex-col gap-10">
      <nav className="text-sm text-muted">
        <Link href="/insights" className="hover:text-accent">
          ← All insights
        </Link>
      </nav>

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">Technique{rank ? ` · #${rank} today` : ""}</p>
          {t && <MomentumBadge momentum={t.momentum} />}
          {t && <VelocityChip velocity={t.velocity} />}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{meta.label}</h1>
        <p className="max-w-3xl text-lg text-muted text-pretty">{play.what}</p>
      </header>

      {!t ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-muted">
          No signals mention {meta.label} on the latest scan. Check back after the next rescan.
        </p>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Key numbers">
            <PulseStat label="Signals" value={String(t.mentions)} detail={`${t.freshShare}% from the last 12h`} />
            <PulseStat label="Share of heat" value={`${t.share}%`} detail={`Average rank ${t.avgRank}`} />
            <PulseStat label="Posting pace" value={t.velocity === null ? "n/a" : `${t.velocity}×`} detail="Acceleration vs the whole radar" />
            <PulseStat label="Opportunity" value={`${t.opportunityScore} / 100`} detail={`${plural(t.sourceMix.github, "new repo")} vs ${plural(t.mentions - t.sourceMix.github, "discussion")}`} />
          </section>

          <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <div className="rounded-3xl border border-border bg-surface p-5 shadow-sm">
              <h2 className="text-sm font-semibold">Posts over the last 48 hours</h2>
              <p className="mb-3 text-xs text-muted">Each bar is six hours. Hover a bar for its count.</p>
              {t.activity.some((n) => n > 0) ? (
                <ActivityBars activity={t.activity} height={120} label={`${meta.label}: posts per 6 hours over the last 48 hours`} />
              ) : (
                <p className="flex h-[120px] items-center justify-center rounded-xl bg-surface-2 text-sm text-muted">No posts in the last 48 hours; the signals below are older.</p>
              )}
            </div>
            <div className="flex flex-col gap-5 rounded-3xl border border-border bg-surface p-5 shadow-sm">
              <div>
                <h2 className="mb-3 text-sm font-semibold">Where it is discussed</h2>
                <SourceMix mix={t.sourceMix} />
              </div>
              {t.related.length > 0 && (
                <div>
                  <h2 className="mb-2 text-sm font-semibold">Often paired with</h2>
                  <ul className="flex flex-col gap-1.5 text-sm">
                    {t.related.map((r) => (
                      <li key={r.technique} className="flex items-center justify-between gap-2">
                        <Link href={`/insights/${r.technique}`} className="hover:text-accent">
                          {r.label}
                        </Link>
                        <span className="font-mono text-xs text-muted">{r.together} shared posts</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        </>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl bg-accent/10 p-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-accent">Apply it this week</p>
          <p className="mt-2 text-pretty">{play.apply}</p>
        </div>
        <div className="relative overflow-hidden rounded-3xl border border-accent/30 bg-surface p-6 shadow-sm">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent to-accent-2" aria-hidden />
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-accent-2">Product idea</p>
          <p className="mt-2 text-pretty">{play.opportunity}</p>
        </div>
      </section>

      {t && (
        <section className="flex flex-col gap-4">
          <SectionTitle title={t.items.length === 1 ? "The one signal" : `All ${t.items.length} signals`} hint="Ranked by the radar score: engagement, freshness and source weight." />
          <div className="rounded-3xl border border-border bg-surface px-5 pb-5 shadow-sm [&>ul]:border-t-0">
            <EvidenceList items={t.items} now={now} />
          </div>
        </section>
      )}
    </div>
  );
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}
