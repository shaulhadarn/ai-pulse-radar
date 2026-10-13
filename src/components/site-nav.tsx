"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Radar" },
  { href: "/insights", label: "Insights" },
] as const;

export function SiteNav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/75 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <RadarMark />
          <span>AI Pulse Radar</span>
        </Link>
        <nav className="flex items-center gap-1 rounded-full border border-border bg-surface p-1 text-sm">
          {LINKS.map(({ href, label }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-3.5 py-1 transition-colors ${active ? "bg-foreground text-background" : "text-muted hover:text-foreground"}`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

function RadarMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-6 text-accent" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="9" opacity="0.35" />
      <circle cx="12" cy="12" r="5" opacity="0.6" />
      <path d="M12 12 19 6" strokeLinecap="round" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}
