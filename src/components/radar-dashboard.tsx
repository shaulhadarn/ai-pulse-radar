"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { refreshRadar } from "@/app/actions";
import { MomentumBadge } from "@/components/insight-ui";
import { age, SOURCE_STYLE } from "@/lib/radar/format";
import type { Outlook } from "@/lib/radar/outlook";
import { techniqueLabel } from "@/lib/radar/taxonomy";
import type { RadarItem, RadarSnapshot, SourceId, TechniqueId } from "@/lib/radar/types";

type SortKey = "rank" | "breakout" | "newest" | "engagement";

export function RadarDashboard({ snapshot, meta = {} }: { snapshot: RadarSnapshot; meta?: Outlook["meta"] }) {
  const [sources, setSources] = useState<Set<SourceId>>(new Set());
  const [nextWaveOnly, setNextWaveOnly] = useState(false);
  const [technique, setTechnique] = useState<TechniqueId | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("rank");
  const [refreshing, startRefresh] = useTransition();

  const now = Date.parse(snapshot.generatedAt);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = snapshot.items.filter(
      (item) =>
        (sources.size === 0 || sources.has(item.source)) &&
        (!technique || item.techniques.includes(technique)) &&
        (!nextWaveOnly || item.techniques.some((t) => meta[t]?.nextWave)) &&
        (!q || `${item.title} ${item.summary ?? ""} ${item.author ?? ""} ${item.channel ?? ""}`.toLowerCase().includes(q)),
    );
    if (sort === "breakout") return filtered.toSorted((a, b) => breakoutRank(b, meta) - breakoutRank(a, meta));
    if (sort === "newest") return filtered.toSorted((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
    if (sort === "engagement") return filtered.toSorted((a, b) => b.engagement.score - a.engagement.score);
    return filtered;
  }, [snapshot.items, sources, technique, query, sort, nextWaveOnly, meta]);

  const maxHeat = snapshot.trends[0]?.heat ?? 1;
  const liveSources = snapshot.sources.filter((s) => s.ok).length;

  function toggleSource(id: SourceId) {
    setSources((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Scan summary">
        <Stat label="Signals ranked" value={snapshot.items.length.toLocaleString("en-US")} />
        <Stat label="Sources live" value={`${liveSources} / ${snapshot.sources.length}`} />
        <Stat label="Top technique" value={snapshot.trends[0]?.label ?? "None yet"} />
        <Stat label="Techniques seen" value={String(snapshot.trends.length)} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* The sidebar scrolls on its own so its bottom is never cut off by the viewport. */}
        <aside className="scroll-thin flex flex-col gap-4 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
          <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Sources</h2>
              <button
                type="button"
                disabled={refreshing}
                onClick={() => startRefresh(() => refreshRadar())}
                className="rounded-full border border-border px-3 py-1 text-xs font-medium transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
              >
                {refreshing ? "Scanning…" : "Rescan"}
              </button>
            </div>
            <ul className="flex flex-col gap-2 text-sm">
              {snapshot.sources.map((s) => (
                <li key={s.id} className="flex flex-col gap-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span
                        className={`size-2 rounded-full ${s.ok ? "bg-emerald-500 shadow-[0_0_0_3px] shadow-emerald-500/20" : s.enabled ? "bg-red-500" : "bg-zinc-400"}`}
                        aria-hidden
                      />
                      {s.label}
                    </span>
                    <span className="font-mono text-xs text-muted">
                      {s.ok && s.viaJina && (
                        <span className="mr-1.5 rounded bg-surface-2 px-1 py-0.5 text-[10px]" title="Fetched through Jina Reader">
                          Jina
                        </span>
                      )}
                      {s.ok ? `${s.count} ${s.count === 1 ? "item" : "items"}` : s.enabled ? "error" : "off"}
                    </span>
                  </div>
                  {!s.ok && <p className="pl-4 text-xs text-muted">{s.enabled ? s.error : s.setupHint}</p>}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted" suppressHydrationWarning>
              Scanned {new Date(snapshot.generatedAt).toLocaleString()}
            </p>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
            <h2 className="mb-1 text-sm font-semibold">Technique momentum</h2>
            <p className="mb-4 text-xs text-muted">
              Heat sums the rank of every item using a technique. Click to filter, or{" "}
              <Link href="/insights" className="underline underline-offset-2 hover:text-foreground">
                open the analysis
              </Link>
              .
            </p>
            {snapshot.trends.length === 0 ? (
              <p className="text-sm text-muted">No signals yet.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {snapshot.trends.map((trend) => {
                  const active = technique === trend.technique;
                  return (
                    <li key={trend.technique}>
                      <button
                        type="button"
                        onClick={() => setTechnique(active ? null : trend.technique)}
                        aria-pressed={active}
                        className={`w-full rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface-2 ${active ? "bg-surface-2 ring-1 ring-accent" : ""}`}
                      >
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="flex min-w-0 items-center gap-1.5">
                            <span className="truncate">{trend.label}</span>
                            {meta[trend.technique]?.nextWave && (
                              <span className="shrink-0 text-[10px] font-semibold text-accent" title="Next wave: accelerating and not yet mainstream">
                                ▲ next
                              </span>
                            )}
                          </span>
                          <span className="flex shrink-0 items-center gap-1.5">
                            {meta[trend.technique] && meta[trend.technique]?.momentum !== "steady" && <MomentumBadge momentum={meta[trend.technique]!.momentum} />}
                            <span className="font-mono text-xs text-muted">{trend.mentions}</span>
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2"
                            style={{ width: `${Math.max(4, (trend.heat / maxHeat) * 100)}%` }}
                          />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </aside>

        <section className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search titles, authors, subreddits…"
              aria-label="Search signals"
              className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3.5 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-accent"
            />
            <div className="flex gap-1.5">
              {(Object.keys(SOURCE_STYLE) as SourceId[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleSource(id)}
                  aria-pressed={sources.has(id)}
                  className={`rounded-xl border px-2.5 py-1.5 text-xs font-medium transition-colors ${sources.has(id) ? "border-accent bg-surface-2 text-accent" : "border-border bg-surface hover:bg-surface-2"}`}
                >
                  {SOURCE_STYLE[id].label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setNextWaveOnly((v) => !v)}
              aria-pressed={nextWaveOnly}
              className={`rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition-colors ${nextWaveOnly ? "border-accent bg-accent text-background" : "border-border bg-surface text-accent hover:bg-surface-2"}`}
              title="Only signals about the upcoming technologies"
            >
              ▲ Next wave
            </button>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="Sort by"
              className="rounded-xl border border-border bg-surface px-2 py-1.5 text-sm shadow-sm"
            >
              <option value="rank">Top ranked</option>
              <option value="breakout">Breakout first</option>
              <option value="newest">Newest</option>
              <option value="engagement">Most engagement</option>
            </select>
          </div>

          {(technique || sources.size > 0 || query || nextWaveOnly) && (
            <p className="text-sm text-muted">
              {visible.length} of {snapshot.items.length} signals
              {technique && <> · {techniqueLabel(technique)}</>}
              {nextWaveOnly && <> · next wave</>}{" "}
              <button
                type="button"
                className="underline underline-offset-2 hover:text-foreground"
                onClick={() => {
                  setTechnique(null);
                  setNextWaveOnly(false);
                  setSources(new Set());
                  setQuery("");
                }}
              >
                Clear filters
              </button>
            </p>
          )}

          {visible.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted">
              {snapshot.items.length === 0 ? "No sources returned signals on the last scan. Try Rescan." : "Nothing matches these filters."}
            </div>
          ) : (
            <ol className="flex flex-col gap-3">
              {visible.map((item) => (
                <SignalCard key={item.id} item={item} now={now} meta={meta} onTechnique={setTechnique} />
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-4 py-3 shadow-sm">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function SignalCard({ item, now, meta, onTechnique }: { item: RadarItem; now: number; meta: Outlook["meta"]; onTechnique: (t: TechniqueId) => void }) {
  const style = SOURCE_STYLE[item.source];
  const engagement = engagementLabel(item);
  return (
    <li className="group rounded-2xl border border-border bg-surface p-4 shadow-sm transition-all hover:-translate-y-px hover:border-accent/50 hover:shadow-md">
      <div className="flex gap-4">
        <div className="flex w-12 shrink-0 flex-col items-center gap-1.5 pt-0.5">
          <span className="font-mono text-lg font-semibold text-accent">{Math.round(item.rank)}</span>
          <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${style.className}`}>{style.label}</span>
        </div>
        <div className="min-w-0 flex-1">
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="font-medium leading-snug text-pretty group-hover:text-accent">
            {item.title}
          </a>
          {item.summary && <p className="mt-1 line-clamp-2 text-sm text-muted">{item.summary}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            {engagement && <span>{engagement}</span>}
            {item.channel && <span>{item.channel}</span>}
            {item.author && <span>{item.author}</span>}
            <span>{age(item.publishedAt, now)}</span>
            {item.discussionUrl && item.discussionUrl !== item.url && (
              <a href={item.discussionUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
                discussion
              </a>
            )}
          </div>
          {item.techniques.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {item.techniques.map((t) => {
                const next = meta[t]?.nextWave;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => onTechnique(t)}
                    title={next ? "Next wave: accelerating and not yet mainstream" : undefined}
                    className={`rounded-full border px-2 py-0.5 text-[11px] transition-colors hover:border-accent hover:text-accent ${next ? "border-accent/40 bg-accent/10 font-medium text-accent" : "border-border bg-surface-2"}`}
                  >
                    {next && "▲ "}
                    {techniqueLabel(t)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

/** Rank boosted by the strongest breakout score among the item's techniques, so next-wave posts rise. */
function breakoutRank(item: RadarItem, meta: Outlook["meta"]): number {
  const best = Math.max(0, ...item.techniques.map((t) => meta[t]?.breakout ?? 0));
  return item.rank * (1 + best / 100);
}

function engagementLabel(item: RadarItem): string | null {
  const { score, comments } = item.engagement;
  // Sources read without counts (X through Jina, the Reddit archive) have nothing to show.
  if (score === 0 && !comments) return null;
  switch (item.source) {
    case "github":
      return `★ ${score.toLocaleString("en-US")} · ${comments ?? 0} forks`;
    case "x":
      return `${score.toLocaleString("en-US")} engagement · ${comments ?? 0} replies`;
    default:
      return `▲ ${score.toLocaleString("en-US")} · ${comments ?? 0} comments`;
  }
}
