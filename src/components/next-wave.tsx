import Link from "next/link";
import { ActivityBars } from "@/components/charts";
import { VerdictBadge } from "@/components/insight-ui";
import { age, SOURCE_STYLE } from "@/lib/radar/format";
import type { Outlook, PlanStep } from "@/lib/radar/outlook";
import { techniqueLabel } from "@/lib/radar/taxonomy";

/** The forward-looking half of the radar: what is about to matter and what to do about it. */
export function NextWave({ outlook, now }: { outlook: Outlook; now: number }) {
  if (outlook.upcoming.length === 0) return null;
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4" aria-labelledby="next-wave">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-accent">Next wave</p>
            <h2 id="next-wave" className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
              Upcoming technologies worth your time
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-muted text-pretty">
              Not yet mainstream, but speeding up faster than the rest of the radar, posted recently, ranking well and spreading across platforms.
            </p>
          </div>
          <Link href="/insights" className="text-sm font-medium text-accent hover:underline">
            Full analysis →
          </Link>
        </div>
        <ol className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {outlook.upcoming.map((u, index) => (
            <li key={u.insight.technique}>
              <Link
                href={`/insights/${u.insight.technique}`}
                className="group flex h-full flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm transition-all hover:-translate-y-px hover:border-accent/50 hover:shadow-md"
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="font-mono text-xs text-muted">#{index + 1}</span>
                  <VerdictBadge verdict={u.verdict} />
                </span>
                <span className="flex items-end justify-between gap-2">
                  <span className="text-lg font-semibold leading-tight group-hover:text-accent">{u.insight.label}</span>
                  <span className="shrink-0 text-right">
                    <span className="block font-mono text-2xl font-semibold leading-none text-accent">{u.breakout}</span>
                    <span className="text-[10px] uppercase tracking-wide text-muted">breakout</span>
                  </span>
                </span>
                <ActivityBars activity={u.insight.activity} height={28} label={`${u.insight.label}: posts per 6 hours over the last 48 hours`} />
                <span className="flex flex-wrap gap-1">
                  {u.reasons.map((r) => (
                    <span key={r} className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-muted">
                      {r}
                    </span>
                  ))}
                </span>
                <span className="mt-auto border-t border-border pt-3 text-sm text-pretty">
                  <span className="text-xs font-medium uppercase tracking-wide text-accent">Do this · </span>
                  {u.insight.play.apply}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_1fr]">
        <section className="relative overflow-hidden rounded-3xl border border-accent/30 bg-surface p-5 shadow-sm sm:p-6" aria-labelledby="plan">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent via-accent-2 to-accent" aria-hidden />
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-accent-2">Action plan</p>
          <h2 id="plan" className="mt-1 text-lg font-semibold tracking-tight">
            Your plan this week
          </h2>
          <ol className="mt-4 flex flex-col gap-4">
            {outlook.plan.map((step, i) => (
              <PlanRow key={step.kind} step={step} index={i} />
            ))}
          </ol>
        </section>

        {outlook.earlySignals.length > 0 && (
          <section className="flex min-w-0 flex-col rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-6" aria-labelledby="early">
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-accent">Early signals</p>
            <h2 id="early" className="mt-1 text-lg font-semibold tracking-tight">
              First posts on the next wave
            </h2>
            <ul className="mt-3 flex flex-col divide-y divide-border">
              {outlook.earlySignals.map((item) => (
                <li key={item.id} className="flex items-start gap-3 py-2.5">
                  <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${SOURCE_STYLE[item.source].className}`}>
                    {SOURCE_STYLE[item.source].label}
                  </span>
                  <span className="min-w-0 flex-1">
                    <a
                      href={item.discussionUrl ?? item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="line-clamp-2 text-sm font-medium [overflow-wrap:anywhere] hover:text-accent"
                    >
                      {item.title}
                    </a>
                    <span className="mt-0.5 block truncate text-xs text-muted">
                      {item.techniques
                        .filter((t) => outlook.meta[t]?.nextWave)
                        .map(techniqueLabel)
                        .join(" · ")}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-muted">{age(item.publishedAt, now)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

const STEP_LABEL: Record<PlanStep["kind"], string> = { adopt: "Adopt", experiment: "Experiment", build: "Build & sell" };

function PlanRow({ step, index }: { step: PlanStep; index: number }) {
  return (
    <li className="flex gap-4">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent/12 font-mono text-sm font-semibold text-accent ring-1 ring-accent/30">
        {index + 1}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{STEP_LABEL[step.kind]}</p>
        <Link href={`/insights/${step.technique}`} className="font-semibold hover:text-accent">
          {step.title}
        </Link>
        <p className="mt-0.5 text-sm text-muted text-pretty">{step.body}</p>
      </div>
    </li>
  );
}
