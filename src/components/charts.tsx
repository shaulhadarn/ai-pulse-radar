import Link from "next/link";
import type { TechniqueInsight } from "@/lib/radar/insights";
import { SOURCE_IDS, type SourceId } from "@/lib/radar/types";

/** Validated categorical slots (see globals.css --series-*), one per source, fixed order. */
export const SOURCE_SERIES: Record<SourceId, { label: string; color: string }> = {
  x: { label: "X", color: "var(--series-1)" },
  hackernews: { label: "Hacker News", color: "var(--series-2)" },
  reddit: { label: "Reddit", color: "var(--series-3)" },
  github: { label: "GitHub", color: "var(--series-4)" },
};

const BUCKET_LABELS = ["42-48h ago", "36-42h ago", "30-36h ago", "24-30h ago", "18-24h ago", "12-18h ago", "6-12h ago", "last 6h"];

/** Posts per 6-hour bucket over 48 hours. One series, so no legend; the caption names it. */
export function ActivityBars({ activity, height = 36, label }: { activity: number[]; height?: number; label: string }) {
  const max = Math.max(1, ...activity);
  const width = 100;
  const gap = 2;
  const barWidth = (width - gap * (activity.length - 1)) / activity.length;
  return (
    <figure className="flex flex-col gap-1">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }} role="img" aria-label={label}>
        <line x1="0" x2={width} y1={height - 0.5} y2={height - 0.5} stroke="var(--border)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        {activity.map((count, i) => {
          const h = count === 0 ? 0 : Math.max(2, ((height - 2) * count) / max);
          return (
            <g key={i}>
              {/* Full-height hit target, bigger than the bar, carries the tooltip. */}
              <rect x={i * (barWidth + gap)} y={0} width={barWidth} height={height} fill="transparent">
                <title>{`${BUCKET_LABELS[i] ?? ""}: ${count} ${count === 1 ? "post" : "posts"}`}</title>
              </rect>
              {h > 0 && <rect x={i * (barWidth + gap)} y={height - h} width={barWidth} height={h} rx="1.5" fill="var(--series-1)" pointerEvents="none" />}
            </g>
          );
        })}
      </svg>
      <figcaption className="flex justify-between font-mono text-[10px] text-muted">
        <span>48h ago</span>
        <span>now</span>
      </figcaption>
    </figure>
  );
}

/** Where a technique is being discussed: a stacked bar with a counted legend, so identity never rests on color alone. */
export function SourceMix({ mix }: { mix: Record<SourceId, number> }) {
  const total = SOURCE_IDS.reduce((sum, s) => sum + mix[s], 0) || 1;
  const present = SOURCE_IDS.filter((s) => mix[s] > 0);
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="flex h-2 w-full gap-[2px] overflow-hidden rounded-full"
        role="img"
        aria-label={present.map((s) => `${SOURCE_SERIES[s].label} ${mix[s]}`).join(", ")}
      >
        {present.map((s) => (
          <div
            key={s}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ width: `${(100 * mix[s]) / total}%`, background: SOURCE_SERIES[s].color }}
          >
            <span className="sr-only">
              {SOURCE_SERIES[s].label}: {mix[s]}
            </span>
          </div>
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted">
        {present.map((s) => (
          <li key={s} className="flex items-center gap-1">
            <span className="size-2 rounded-full" style={{ background: SOURCE_SERIES[s].color }} aria-hidden />
            {SOURCE_SERIES[s].label} <span className="font-mono">{mix[s]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Momentum map: share of today's attention (x, log scale) against acceleration relative to
 * the whole radar (y, log scale centred on 1×). Top right is big and speeding up; top left
 * is small but taking off.
 */
export function MomentumMap({ techniques }: { techniques: TechniqueInsight[] }) {
  const points = techniques.filter((t) => t.velocity !== null && t.velocity > 0 && t.share > 0);
  if (points.length < 3) {
    return (
      <p className="rounded-2xl bg-surface-2 p-6 text-center text-sm text-muted">
        Too few posts from the last 48 hours on this scan to measure acceleration. The map fills in as fresh posts arrive.
      </p>
    );
  }
  const W = 720;
  const H = 380;
  const pad = { l: 52, r: 20, t: 20, b: 36 };
  const minShare = Math.min(...points.map((p) => p.share));
  const maxShare = Math.max(...points.map((p) => p.share));
  const lx0 = Math.log(Math.max(0.1, minShare * 0.7));
  const lx1 = Math.log(maxShare * 1.4);
  const LIMIT = 2; // log2 range either side of 1×: ¼× to 4×
  const x = (share: number) => pad.l + ((Math.log(share) - lx0) / (lx1 - lx0)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + ((LIMIT - Math.max(-LIMIT, Math.min(LIMIT, Math.log2(v)))) / (2 * LIMIT)) * (H - pad.t - pad.b);
  const yTicks = [0.25, 0.5, 1, 2, 4];

  // Label the biggest bubbles first and skip any label that would collide with one already placed.
  const placed: { x0: number; x1: number; y0: number; y1: number }[] = [];
  const labels = new Map<string, { x: number; y: number; anchor: "start" | "end" }>();
  for (const p of points.toSorted((a, b) => b.heat - a.heat)) {
    const cx = x(p.share);
    const cy = y(p.velocity ?? 1);
    const r = 5 + Math.sqrt(p.mentions);
    const width = p.label.length * 6.6;
    const anchor = cx + r + 4 + width > W - pad.r ? "end" : "start";
    const lx = anchor === "end" ? cx - r - 4 : cx + r + 4;
    const box = { x0: anchor === "end" ? lx - width : lx, x1: anchor === "end" ? lx : lx + width, y0: cy - 9, y1: cy + 7 };
    if (placed.some((b) => box.x0 < b.x1 && box.x1 > b.x0 && box.y0 < b.y1 && box.y1 > b.y0)) continue;
    placed.push(box);
    labels.set(p.technique, { x: lx, y: cy + 4, anchor });
  }

  return (
    <figure className="flex flex-col gap-2">
      {/* Below ~600px the labels get too small to read, so the map scrolls sideways instead of shrinking. */}
      <div className="scroll-thin -mx-1 overflow-x-auto px-1">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full min-w-[600px]"
          role="img"
          aria-label="Momentum map of techniques by share of attention and acceleration"
        >
          {yTicks.map((v) => (
            <g key={v}>
              <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeDasharray={v === 1 ? undefined : "2 4"} />
              <text x={pad.l - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">
                {v === 0.25 ? "¼×" : v === 0.5 ? "½×" : `${v}×`}
              </text>
            </g>
          ))}
          <text x={pad.l + 6} y={y(1) - 6} fontSize="11" fill="var(--muted)">
            ↑ faster than the radar
          </text>
          <text x={pad.l + 6} y={y(1) + 16} fontSize="11" fill="var(--muted)">
            ↓ slower
          </text>
          <text x={(W + pad.l) / 2} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--muted)">
            Share of today&apos;s attention (log scale) →
          </text>
          {points.map((p) => {
            const cx = x(p.share);
            const cy = y(p.velocity ?? 1);
            const r = 5 + Math.sqrt(p.mentions);
            const label = labels.get(p.technique);
            return (
              <Link key={p.technique} href={`/insights/${p.technique}`}>
                <g className="cursor-pointer [&:hover>circle]:stroke-foreground">
                  <circle cx={cx} cy={cy} r={r + 6} fill="transparent" />
                  <circle cx={cx} cy={cy} r={r} fill="var(--series-1)" fillOpacity="0.85" stroke="var(--surface)" strokeWidth="2" />
                  <title>{`${p.label}: ${p.share}% of attention, ${p.velocity}× the radar's pace, ${p.mentions} posts`}</title>
                  {label && (
                    <text x={label.x} y={label.y} textAnchor={label.anchor} fontSize="12" fill="var(--foreground)">
                      {p.label}
                    </text>
                  )}
                </g>
              </Link>
            );
          })}
        </svg>
      </div>
      <figcaption className="text-xs text-muted">
        Bubble size is post count. Pace compares each technique&apos;s posting rate in the last 12 hours with the 36 hours before, relative to the whole radar.
        Hover for numbers, click to open.
      </figcaption>
    </figure>
  );
}
