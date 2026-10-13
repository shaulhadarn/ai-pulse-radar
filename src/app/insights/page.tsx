import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ActivityBars, MomentumMap, SourceMix } from "@/components/charts";
import { EvidenceList, MomentumBadge, PulseStat, RadarGlyph, SectionTitle, VelocityChip } from "@/components/insight-ui";
import { briefingEnabled, getAiBriefing, type Briefing } from "@/lib/radar/briefing";
import { age, SOURCE_STYLE } from "@/lib/radar/format";
import { getRadarSnapshot } from "@/lib/radar/get-radar";
import { buildInsights, type TechniqueInsight } from "@/lib/radar/insights";
import type { RadarItem } from "@/lib/radar/types";

export const metadata: Metadata = {
  title: "Insights · AI Pulse Radar",
  description: "Which AI building techniques, tools and ways of working are gaining traction right now, and where the room to build is.",
};

export default function InsightsPage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <Suspense fallback={<InsightsSkeleton />}>
        <InsightsContent />
      </Suspense>
    </main>
  );
}

async function InsightsContent() {
  const snapshot = await getRadarSnapshot();
  const insights = buildInsights(snapshot);
  const { pulse } = insights;
  const now = Date.parse(snapshot.generatedAt);
  const [featured, rest] = [insights.techniques.slice(0, 9), insights.techniques.slice(9)];
  const maxShare = insights.techniques[0]?.share ?? 1;

  return (
    <div className="flex flex-col gap-12">
      <header className="relative overflow-hidden rounded-3xl border border-border bg-surface/70 p-6 shadow-sm backdrop-blur sm:p-8">
        <RadarGlyph className="pointer-events-none absolute -right-16 -top-16 size-72 opacity-70 sm:-right-8 sm:size-80" />
        <div className="relative flex max-w-3xl flex-col gap-3">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">Insights · live intelligence</p>
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{insights.headline}</h1>
          <p className="text-sm text-muted" suppressHydrationWarning>
            Synthesised from {pulse.totalSignals} ranked signals across X, Hacker News, Reddit and GitHub · scanned{" "}
            {new Date(insights.generatedAt).toLocaleString()}
          </p>
        </div>
        <div className="relative mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <PulseStat label="Signals ranked" value={pulse.totalSignals.toLocaleString("en-US")} detail={`${pulse.techniquesSeen} techniques tracked`} />
          <PulseStat label="Posted in the last 24h" value={pulse.last24h.toLocaleString("en-US")} detail={`${Math.round((100 * pulse.last24h) / Math.max(1, pulse.totalSignals))}% of today's signal`} />
          <PulseStat label="Sources live" value={`${pulse.liveSources} / ${snapshot.sources.length}`} detail="X, HN, Reddit, GitHub" />
          <PulseStat
            label="Fastest rising"
            value={pulse.fastest?.label ?? "Not enough data"}
            detail={pulse.fastest?.velocity ? `${pulse.fastest.velocity}× the radar's pace` : undefined}
          />
        </div>
      </header>

      <Suspense fallback={<div className="h-48 animate-pulse rounded-3xl bg-surface" aria-label="Writing the briefing" />}>
        <AiBriefing items={snapshot.items} now={now} />
      </Suspense>

      {insights.opportunities.length > 0 && (
        <section className="flex flex-col gap-4">
          <SectionTitle
            eyebrow="Where the money is"
            title="Build opportunities"
            hint="Techniques with lots of discussion on X, Hacker News and Reddit but few new GitHub projects. High demand with thin supply leaves room for a product."
          />
          <ol className="grid gap-4 lg:grid-cols-3">
            {insights.opportunities.map((t, index) => (
              <OpportunityCard key={t.technique} insight={t} index={index} />
            ))}
          </ol>
        </section>
      )}

      <section className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-6">
        <SectionTitle
          eyebrow="Momentum map"
          title="What is big, and what is accelerating"
          hint="Right means a bigger share of today's attention. Up means posting about it is speeding up faster than the rest of the radar. Top left is where the next big thing usually starts."
        />
        <MomentumMap techniques={insights.techniques} />
      </section>

      <section className="flex flex-col gap-4">
        <SectionTitle eyebrow="Techniques" title="Gaining traction" hint="Ranked by heat: the combined rank of every signal using the technique. Open one for the full breakdown." />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {featured.map((t) => (
            <TechniqueCard key={t.technique} insight={t} maxShare={maxShare} now={now} />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {insights.topRepos.length > 0 && (
          <section className="flex min-w-0 flex-col gap-4">
            <SectionTitle eyebrow="Try these" title="Top new repos" hint="Fresh GitHub projects with the most stars." />
            <ItemList items={insights.topRepos} now={now} metric={(i) => `★ ${i.engagement.score.toLocaleString("en-US")}`} />
          </section>
        )}
        {insights.hottestDiscussions.length > 0 && (
          <section className="flex min-w-0 flex-col gap-4">
            <SectionTitle eyebrow="Join in" title="Hottest discussions" hint="The threads with the most replies right now." />
            <ItemList items={insights.hottestDiscussions} now={now} metric={(i) => `${(i.engagement.comments ?? 0).toLocaleString("en-US")} replies`} />
          </section>
        )}
      </div>

      {insights.tools.length > 0 && (
        <section className="flex flex-col gap-4">
          <SectionTitle eyebrow="Stack" title="Tools and models in play" hint="How many of today's signals mention each one." />
          <ul className="flex flex-wrap gap-2">
            {insights.tools.map((tool) => (
              <li key={tool.name} className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm shadow-sm">
                <span className="font-medium">{tool.name}</span>
                <span className="font-mono text-xs text-muted">{tool.mentions}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {rest.length > 0 && (
        <section className="flex flex-col gap-4">
          <SectionTitle title="Also on the radar" />
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((t) => (
              <li key={t.technique}>
                <Link
                  href={`/insights/${t.technique}`}
                  className="flex h-full flex-col rounded-2xl border border-border bg-surface p-4 shadow-sm transition-colors hover:border-accent/50"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-medium">{t.label}</span>
                    <MomentumBadge momentum={t.momentum} />
                  </span>
                  <span className="mt-1 text-sm text-muted">{t.play.apply}</span>
                  <span className="mt-2 font-mono text-xs text-muted">
                    {t.mentions} signals · {t.share}% of heat
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

async function AiBriefing({ items, now }: { items: RadarItem[]; now: number }) {
  if (!briefingEnabled()) {
    return (
      <aside className="rounded-3xl border border-dashed border-border bg-surface/60 p-5 text-sm text-muted">
        <span className="font-medium text-foreground">Want a Claude-written briefing here?</span> Add an{" "}
        <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-xs">ANTHROPIC_API_KEY</code> environment variable in
        Vercel. Until then, the analysis below is computed from the signals directly.
      </aside>
    );
  }
  const briefing = await getAiBriefing();
  if (!briefing) {
    return (
      <aside className="rounded-3xl border border-dashed border-border bg-surface/60 p-5 text-sm text-muted">
        The AI briefing could not be generated on this scan. The analysis below is computed from the signals directly.
      </aside>
    );
  }
  return <BriefingView briefing={briefing} items={items} now={now} />;
}

function BriefingView({ briefing, items, now }: { briefing: Briefing; items: RadarItem[]; now: number }) {
  const byId = new Map(items.map((i) => [i.id, i]));
  return (
    <section className="relative overflow-hidden rounded-3xl border border-accent/30 bg-surface p-6 shadow-sm sm:p-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent via-accent-2 to-accent" aria-hidden />
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-accent-2">Today&apos;s briefing · written by Claude</p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-balance">{briefing.headline}</h2>
      <p className="mt-2 max-w-3xl text-muted text-pretty">{briefing.summary}</p>

      <ol className="mt-6 grid gap-4 lg:grid-cols-2">
        {briefing.trends.map((trend, index) => {
          const evidence = trend.evidenceIds.flatMap((id) => byId.get(id) ?? []).slice(0, 3);
          return (
            <li key={trend.name} className="flex flex-col gap-3 rounded-2xl border border-border bg-background/60 p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold leading-snug">
                  <span className="mr-2 font-mono text-sm text-muted">{String(index + 1).padStart(2, "0")}</span>
                  {trend.name}
                </h3>
                <MomentumBadge momentum={trend.momentum} />
              </div>
              <p className="text-sm text-pretty">{trend.whatsHappening}</p>
              <dl className="grid gap-2 text-sm">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted">Why it matters</dt>
                  <dd className="text-pretty">{trend.whyItMatters}</dd>
                </div>
                <div className="rounded-xl bg-accent/10 p-3">
                  <dt className="text-xs font-medium uppercase tracking-wide text-accent">Try this</dt>
                  <dd className="text-pretty">{trend.howToApply}</dd>
                </div>
              </dl>
              {evidence.length > 0 && <EvidenceList items={evidence} now={now} />}
            </li>
          );
        })}
      </ol>

      {briefing.watchList.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold">On the watch list</h3>
          <ul className="mt-2 grid gap-1.5 text-sm text-muted">
            {briefing.watchList.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-accent-2" aria-hidden>
                  ◆
                </span>
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function OpportunityCard({ insight: t, index }: { insight: TechniqueInsight; index: number }) {
  const talk = t.mentions - t.sourceMix.github;
  return (
    <li className="relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-accent/30 bg-surface p-5 shadow-sm">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent to-accent-2" aria-hidden />
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold leading-snug">
          <span className="mr-2 font-mono text-sm text-muted">{String(index + 1).padStart(2, "0")}</span>
          {t.label}
        </h3>
        <span className="shrink-0 text-right">
          <span className="block font-mono text-2xl font-semibold leading-none text-accent">{t.opportunityScore}</span>
          <span className="text-[10px] uppercase tracking-wide text-muted">opportunity</span>
        </span>
      </div>
      <p className="text-sm text-pretty">{t.play.opportunity}</p>
      <dl className="mt-auto grid grid-cols-2 gap-2 border-t border-border pt-3 text-xs">
        <div>
          <dt className="text-muted">Demand</dt>
          <dd className="font-mono font-semibold">{talk} discussions</dd>
        </div>
        <div>
          <dt className="text-muted">Supply</dt>
          <dd className="font-mono font-semibold">{t.sourceMix.github} new repos</dd>
        </div>
      </dl>
      <Link href={`/insights/${t.technique}`} className="text-sm font-medium text-accent hover:underline">
        See the evidence →
      </Link>
    </li>
  );
}

function TechniqueCard({ insight: t, maxShare, now }: { insight: TechniqueInsight; maxShare: number; now: number }) {
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-sm transition-colors hover:border-accent/40">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">
            <Link href={`/insights/${t.technique}`} className="hover:text-accent">
              {t.label}
            </Link>
          </h3>
          <p className="mt-0.5 font-mono text-xs text-muted">
            {t.mentions} signals · {t.share}% of heat
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <MomentumBadge momentum={t.momentum} />
          <VelocityChip velocity={t.velocity} />
        </div>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2" style={{ width: `${Math.max(4, (t.share / maxShare) * 100)}%` }} />
      </div>
      <ActivityBars activity={t.activity} label={`${t.label}: posts per 6 hours over the last 48 hours`} />
      <SourceMix mix={t.sourceMix} />
      <p className="text-sm text-pretty">{t.play.what}</p>
      <div className="rounded-xl bg-accent/10 p-3 text-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">How to apply it</p>
        <p className="mt-0.5 text-pretty">{t.play.apply}</p>
      </div>
      {t.related.length > 0 && (
        <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
          Often paired with
          {t.related.map((r) => (
            <Link key={r.technique} href={`/insights/${r.technique}`} className="rounded-full border border-border bg-surface-2 px-2 py-0.5 text-foreground hover:border-accent hover:text-accent">
              {r.label}
            </Link>
          ))}
        </p>
      )}
      <EvidenceList items={t.evidence.slice(0, 3)} now={now} />
      <Link href={`/insights/${t.technique}`} className="text-sm font-medium text-accent hover:underline">
        Deep dive →
      </Link>
    </article>
  );
}

function ItemList({ items, now, metric }: { items: RadarItem[]; now: number; metric: (item: RadarItem) => string }) {
  return (
    <ol className="flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-3 p-3.5">
          <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${SOURCE_STYLE[item.source].className}`}>
            {SOURCE_STYLE[item.source].label}
          </span>
          <div className="min-w-0 flex-1">
            <a href={item.discussionUrl ?? item.url} target="_blank" rel="noopener noreferrer" className="line-clamp-2 text-sm font-medium [overflow-wrap:anywhere] hover:text-accent">
              {item.title}
            </a>
            {item.summary && <p className="mt-0.5 line-clamp-1 text-xs [overflow-wrap:anywhere] text-muted">{item.summary}</p>}
          </div>
          <span className="shrink-0 text-right font-mono text-[11px] text-muted">
            <span className="block font-semibold text-foreground">{metric(item)}</span>
            {age(item.publishedAt, now)}
          </span>
        </li>
      ))}
    </ol>
  );
}

function InsightsSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-label="Analysing signals">
      <div className="h-64 animate-pulse rounded-3xl bg-surface" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-72 animate-pulse rounded-2xl bg-surface" />
        ))}
      </div>
    </div>
  );
}
