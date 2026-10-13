"use client";

import { useMemo, useState, useTransition } from "react";
import { refreshRadar } from "@/app/actions";
import { techniqueLabel } from "@/lib/radar/taxonomy";
import type { RadarItem, RadarSnapshot, SourceId, TechniqueId } from "@/lib/radar/types";

const SOURCE_STYLE: Record<SourceId, { label: string; className: string }> = {
  x: { label: "X", className: "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" },
  hackernews: { label: "HN", className: "bg-orange-500 text-white" },
  reddit: { label: "Reddit", className: "bg-[#ff4500] text-white" },
  github: { label: "GitHub", className: "bg-violet-600 text-white" },
};

type SortKey = "rank" | "newest" | "engagement";

export function RadarDashboard({ snapshot }: { snapshot: RadarSnapshot }) {
  const [sources, setSources] = useState<Set<SourceId>>(new Set());
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
        (!q || `${item.title} ${item.summary ?? ""} ${item.author ?? ""} ${item.channel ?? ""}`.toLowerCase().includes(q)),
    );
    if (sort === "newest") return filtered.toSorted((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
    if (sort === "engagement") return filtered.toSorted((a, b) => b.engagement.score - a.engagement.score);
    return filtered;
  }, [snapshot.items, sources, technique, query, sort]);

  const maxHeat = snapshot.trends[0]?.heat ?? 1;

  function toggleSource(id: SourceId) {
    setSources((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <aside className="flex flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="mb-1 text-sm font-semibold">Technique momentum</h2>
          <p className="mb-4 text-xs text-muted">Heat sums the rank of every item using a technique. Click to filter.</p>
          {snapshot.trends.length === 0 ? (
            <p className="text-sm text-muted">No signals yet.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
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
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="truncate">{trend.label}</span>
                        <span className="shrink-0 font-mono text-xs text-muted">
                          {trend.mentions} · {trend.sources.length} src
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(4, (trend.heat / maxHeat) * 100)}%` }} />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Sources</h2>
            <button
              type="button"
              disabled={refreshing}
              onClick={() => startRefresh(() => refreshRadar())}
              className="rounded-md border border-border px-2 py-1 text-xs hover:bg-surface-2 disabled:opacity-50"
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
                      className={`size-2 rounded-full ${s.ok ? "bg-emerald-500" : s.enabled ? "bg-red-500" : "bg-zinc-400"}`}
                      aria-hidden
                    />
                    {s.label}
                  </span>
                  <span className="font-mono text-xs text-muted">{s.ok ? `${s.count} ${s.count === 1 ? "item" : "items"}` : s.enabled ? "error" : "off"}</span>
                </div>
                {!s.ok && <p className="pl-4 text-xs text-muted">{s.enabled ? s.error : s.setupHint}</p>}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted" suppressHydrationWarning>
            Scanned {new Date(snapshot.generatedAt).toLocaleString()}
          </p>
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
            className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
          <div className="flex gap-1.5">
            {(Object.keys(SOURCE_STYLE) as SourceId[]).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => toggleSource(id)}
                aria-pressed={sources.has(id)}
                className={`rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${sources.has(id) ? "border-accent bg-surface-2" : "border-border bg-surface hover:bg-surface-2"}`}
              >
                {SOURCE_STYLE[id].label}
              </button>
            ))}
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Sort by"
            className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
          >
            <option value="rank">Top ranked</option>
            <option value="newest">Newest</option>
            <option value="engagement">Most engagement</option>
          </select>
        </div>

        {(technique || sources.size > 0 || query) && (
          <p className="text-sm text-muted">
            {visible.length} of {snapshot.items.length} signals
            {technique && <> · {techniqueLabel(technique)}</>}{" "}
            <button
              type="button"
              className="underline underline-offset-2 hover:text-foreground"
              onClick={() => {
                setTechnique(null);
                setSources(new Set());
                setQuery("");
              }}
            >
              Clear filters
            </button>
          </p>
        )}

        {visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted">
            {snapshot.items.length === 0 ? "No sources returned signals on the last scan. Try Rescan." : "Nothing matches these filters."}
          </div>
        ) : (
          <ol className="flex flex-col gap-3">
            {visible.map((item) => (
              <SignalCard key={item.id} item={item} now={now} onTechnique={setTechnique} />
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function SignalCard({ item, now, onTechnique }: { item: RadarItem; now: number; onTechnique: (t: TechniqueId) => void }) {
  const style = SOURCE_STYLE[item.source];
  return (
    <li className="rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent/50">
      <div className="flex gap-4">
        <div className="flex w-12 shrink-0 flex-col items-center gap-1 pt-0.5">
          <span className="font-mono text-lg font-semibold text-accent">{Math.round(item.rank)}</span>
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${style.className}`}>{style.label}</span>
        </div>
        <div className="min-w-0 flex-1">
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="font-medium leading-snug hover:text-accent">
            {item.title}
          </a>
          {item.summary && <p className="mt-1 line-clamp-2 text-sm text-muted">{item.summary}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span>{engagementLabel(item)}</span>
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
            <div className="mt-2 flex flex-wrap gap-1.5">
              {item.techniques.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onTechnique(t)}
                  className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] hover:text-accent"
                >
                  {techniqueLabel(t)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function engagementLabel(item: RadarItem): string {
  const { score, comments } = item.engagement;
  switch (item.source) {
    case "github":
      return `★ ${score.toLocaleString("en-US")} · ${comments ?? 0} forks`;
    case "x":
      return `${score.toLocaleString("en-US")} engagement · ${comments ?? 0} replies`;
    default:
      return `▲ ${score.toLocaleString("en-US")} · ${comments ?? 0} comments`;
  }
}

/** Age relative to the scan time, so server and client render the same text. */
function age(iso: string, now: number): string {
  const hours = Math.max(0, (now - Date.parse(iso)) / 3_600_000);
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m ago`;
  if (hours < 48) return `${Math.round(hours)}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
