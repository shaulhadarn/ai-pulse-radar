import type { SourceId } from "./types";

export const SOURCE_STYLE: Record<SourceId, { label: string; className: string }> = {
  x: { label: "X", className: "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" },
  hackernews: { label: "HN", className: "bg-orange-500 text-white" },
  reddit: { label: "Reddit", className: "bg-[#ff4500] text-white" },
  github: { label: "GitHub", className: "bg-violet-600 text-white" },
};

/** Age relative to the scan time, so server and client render the same text. */
export function age(iso: string, now: number): string {
  const hours = Math.max(0, (now - Date.parse(iso)) / 3_600_000);
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m ago`;
  if (hours < 48) return `${Math.round(hours)}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
