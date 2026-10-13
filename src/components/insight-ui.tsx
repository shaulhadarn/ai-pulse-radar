import { age, SOURCE_STYLE } from "@/lib/radar/format";
import type { Momentum } from "@/lib/radar/insights";
import type { Verdict } from "@/lib/radar/outlook";
import type { RadarItem } from "@/lib/radar/types";

const MOMENTUM_STYLE: Record<Momentum, { label: string; className: string }> = {
  hot: { label: "Hot", className: "bg-hot/12 text-hot ring-hot/30" },
  rising: { label: "Rising", className: "bg-rising/12 text-rising ring-rising/30" },
  emerging: { label: "Emerging", className: "bg-accent-2/12 text-accent-2 ring-accent-2/30" },
  steady: { label: "Steady", className: "bg-surface-2 text-muted ring-border" },
};

export function MomentumBadge({ momentum }: { momentum: Momentum }) {
  const style = MOMENTUM_STYLE[momentum];
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${style.className}`}>{style.label}</span>;
}

/** Acceleration relative to the whole radar; arrows and words carry the meaning, not just color. */
export function VelocityChip({ velocity }: { velocity: number | null }) {
  if (velocity === null) return <span className="font-mono text-[11px] text-muted">velocity n/a</span>;
  const up = velocity >= 1.15;
  const down = velocity <= 0.85;
  const className = up ? "text-accent" : down ? "text-muted" : "text-foreground";
  return (
    <span className={`font-mono text-[11px] font-semibold ${className}`} title="How fast posting is speeding up, compared with the whole radar">
      {up ? "▲" : down ? "▼" : "■"} {velocity}× pace
    </span>
  );
}

export function EvidenceList({ items, now }: { items: RadarItem[]; now: number }) {
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

export function SectionTitle({ eyebrow, title, hint }: { eyebrow?: string; title: string; hint?: string }) {
  return (
    <div>
      {eyebrow && <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-accent">{eyebrow}</p>}
      <h2 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
      {hint && <p className="mt-1 max-w-3xl text-sm text-muted text-pretty">{hint}</p>}
    </div>
  );
}

export function PulseStat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface/80 px-4 py-3 shadow-sm backdrop-blur">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 truncate text-2xl font-semibold tracking-tight">{value}</p>
      {detail && <p className="mt-0.5 truncate text-xs text-muted">{detail}</p>}
    </div>
  );
}

/** Decorative radar with a rotating sweep; motion stops under prefers-reduced-motion (see globals.css). */
export function RadarGlyph({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden>
      <defs>
        <radialGradient id="radar-bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="radar-beam" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.45" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="96" fill="url(#radar-bg)" />
      {[32, 60, 88].map((r) => (
        <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="var(--accent)" strokeOpacity="0.25" />
      ))}
      <line x1="4" y1="100" x2="196" y2="100" stroke="var(--accent)" strokeOpacity="0.15" />
      <line x1="100" y1="4" x2="100" y2="196" stroke="var(--accent)" strokeOpacity="0.15" />
      <g className="radar-sweep">
        <path d="M100 100 L100 12 A88 88 0 0 1 176 56 Z" fill="url(#radar-beam)" />
      </g>
      {[
        [138, 62, 0],
        [70, 130, 0.8],
        [128, 146, 1.6],
        [64, 74, 1.2],
      ].map(([cx, cy, delay]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.5" fill="var(--accent)" className="radar-ping" style={{ animationDelay: `${delay}s` }} />
      ))}
    </svg>
  );
}

const VERDICT_STYLE: Record<Verdict, { label: string; className: string }> = {
  adopt: { label: "Adopt now", className: "bg-accent text-background" },
  try: { label: "Try this week", className: "bg-rising/15 text-rising ring-1 ring-rising/30" },
  watch: { label: "Watch", className: "bg-surface-2 text-muted ring-1 ring-border" },
};

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const style = VERDICT_STYLE[verdict];
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${style.className}`}>{style.label}</span>;
}
