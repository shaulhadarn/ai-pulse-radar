import type { Metadata } from "next";
import { Suspense } from "react";
import { briefingEnabled, getAiBriefing, type Briefing } from "@/lib/radar/briefing";
import { age, SOURCE_STYLE } from "@/lib/radar/format";
import { getRadarSnapshot } from "@/lib/radar/get-radar";
import { buildInsights, type Momentum, type TechniqueInsight } from "@/lib/radar/insights";
import type { RadarItem } from "@/lib/radar/types";

export const metadata: Metadata = {
  title: "Insights · AI Pulse Radar",
  description: "Which AI building techniques, tools and ways of working are gaining traction right now.",
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
  const now = Date.parse(snapshot.generatedAt);
  const [featured, rest] = [insights.techniques.slice(0, 9), insights.techniques.slice(9)];
  const maxShare = insights.techniques[0]?.share ?? 1;

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">Insights</p>
        <h1 className="max-w-4xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{insights.headline}</h1>
        <p className="text-sm text-muted" suppressHydrationWarning>
          Synthesised from {insights.totalSignals} ranked signals · scanned {new Date(insights.generatedAt).toLocaleString()}
        </p>
      </header>

      <Suspense fallback={<div className="h-48 animate-pulse rounded-3xl bg-surface" aria-label="Writing the briefing" />}>
        <AiBriefing items={snapshot.items} now={now} />
      </Suspense>

      <section className="flex flex-col gap-4">
        <SectionTitle title="Techniques gaining traction" hint="Ranked by heat: the combined rank of every signal using the technique." />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {featured.map((t) => (
            <TechniqueCard key={t.technique} insight={t} maxShare={maxShare} now={now} />
          ))}
        </div>
      </section>

      {insights.tools.length > 0 && (
        <section className="flex flex-col gap-4">
          <SectionTitle title="Tools and models in play" hint="How many of today's signals mention each one." />
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
              <li key={t.technique} className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{t.label}</span>
                  <MomentumBadge momentum={t.momentum} />
                </div>
                <p className="mt-1 text-sm text-muted">{t.play.apply}</p>
                <p className="mt-2 font-mono text-xs text-muted">
                  {t.mentions} signals · {t.share}% of heat
                </p>
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

function TechniqueCard({ insight: t, maxShare, now }: { insight: TechniqueInsight; maxShare: number; now: number }) {
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-sm transition-colors hover:border-accent/40">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{t.label}</h3>
          <p className="mt-0.5 font-mono text-xs text-muted">
            {t.mentions} signals · {t.share}% of heat · {t.freshShare}% new
          </p>
        </div>
        <MomentumBadge momentum={t.momentum} />
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2" style={{ width: `${Math.max(4, (t.share / maxShare) * 100)}%` }} />
      </div>
      <p className="text-sm text-pretty">{t.play.what}</p>
      <div className="rounded-xl bg-accent/10 p-3 text-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">How to apply it</p>
        <p className="mt-0.5 text-pretty">{t.play.apply}</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {t.sources.map((s) => (
          <span key={s} className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${SOURCE_STYLE[s].className}`}>
            {SOURCE_STYLE[s].label}
          </span>
        ))}
      </div>
      <EvidenceList items={t.evidence.slice(0, 3)} now={now} />
    </article>
  );
}

function EvidenceList({ items, now }: { items: RadarItem[]; now: number }) {
  return (
    <ul className="mt-auto flex flex-col gap-1.5 border-t border-border pt-3">
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-2 text-sm">
          <span className={`mt-0.5 shrink-0 rounded px-1 py-px text-[9px] font-semibold ${SOURCE_STYLE[item.source].className}`}>
            {SOURCE_STYLE[item.source].label}
          </span>
          <a href={item.discussionUrl ?? item.url} target="_blank" rel="noopener noreferrer" className="line-clamp-2 hover:text-accent">
            {item.title}
          </a>
          <span className="ml-auto shrink-0 font-mono text-[11px] text-muted">{age(item.publishedAt, now)}</span>
        </li>
      ))}
    </ul>
  );
}

const MOMENTUM_STYLE: Record<Momentum, { label: string; className: string }> = {
  hot: { label: "Hot", className: "bg-hot/12 text-hot ring-hot/30" },
  rising: { label: "Rising", className: "bg-rising/12 text-rising ring-rising/30" },
  emerging: { label: "Emerging", className: "bg-accent-2/12 text-accent-2 ring-accent-2/30" },
  steady: { label: "Steady", className: "bg-surface-2 text-muted ring-border" },
};

function MomentumBadge({ momentum }: { momentum: Momentum }) {
  const style = MOMENTUM_STYLE[momentum];
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${style.className}`}>{style.label}</span>;
}

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div>
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
    </div>
  );
}

function InsightsSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-label="Analysing signals">
      <div className="h-24 animate-pulse rounded-2xl bg-surface" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-72 animate-pulse rounded-2xl bg-surface" />
        ))}
      </div>
    </div>
  );
}
