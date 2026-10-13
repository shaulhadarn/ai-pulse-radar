import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import { getRadarSnapshot } from "./get-radar";
import type { RadarSnapshot } from "./types";

export const BRIEFING_CACHE_TAG = "briefing";

const briefingSchema = z.object({
  headline: z.string().describe("One sentence naming the biggest shift in how people build with AI today."),
  summary: z.string().describe("Two or three sentences a builder can read in ten seconds."),
  trends: z
    .array(
      z.object({
        name: z.string().describe("Short name of the technique or tool trend, e.g. 'Ralph loops for coding agents'."),
        momentum: z.enum(["hot", "rising", "emerging"]),
        whatsHappening: z.string().describe("What people are actually doing or shipping, with specifics from the signals."),
        whyItMatters: z.string().describe("Why a builder should care."),
        howToApply: z.string().describe("A concrete first step to use it in an app this week."),
        evidenceIds: z.array(z.string()).describe("Ids of the signals that support this trend, best first."),
      }),
    )
    .describe("The four to six most important trends, most important first."),
  watchList: z.array(z.string()).describe("Two to four early signals worth watching, one sentence each."),
});

export type Briefing = z.infer<typeof briefingSchema>;

const SYSTEM = `You are the analyst behind AI Pulse Radar. You read ranked posts from X, Hacker News, Reddit and GitHub and tell a developer who builds AI apps which techniques, tools and ways of working are actually gaining traction, such as agent loops, goal-driven agents, steering, sub-agents, skills, MCP and spec-driven development.

Ground every claim in the signals you are given and cite their ids. Prefer concrete techniques and tools over company news. Skip hype, launches with no builder angle, and anything the signals do not support. Write plainly, without marketing language.`;

/** True when an Anthropic API key is configured, so the Insights page can offer the AI briefing. */
export function briefingEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * Claude-written synthesis of the current radar snapshot. Cached separately from the
 * radar so a rescan doesn't trigger a new model call; returns null when no key is set
 * or the call fails, and the page falls back to the rule-based brief.
 */
export async function getAiBriefing(): Promise<Briefing | null> {
  "use cache";
  cacheLife("briefing");
  cacheTag(BRIEFING_CACHE_TAG);
  if (!briefingEnabled()) return null;

  const snapshot = await getRadarSnapshot();
  try {
    const client = new Anthropic();
    const response = await client.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      output_config: { effort: "medium", format: zodOutputFormat(briefingSchema) },
      system: SYSTEM,
      messages: [{ role: "user", content: briefingPrompt(snapshot) }],
    });
    if (response.stop_reason === "refusal") return null;
    return response.parsed_output ?? null;
  } catch (err) {
    if (err instanceof Anthropic.APIError) console.warn(`[briefing] Claude API ${err.status}:`, err.message);
    else console.warn("[briefing] failed:", err);
    return null;
  }
}

const MAX_SIGNALS = 60;

function briefingPrompt(snapshot: RadarSnapshot): string {
  const signals = snapshot.items.slice(0, MAX_SIGNALS).map((item) => ({
    id: item.id,
    source: item.source,
    title: item.title,
    summary: item.summary?.slice(0, 240),
    techniques: item.techniques,
    rank: Math.round(item.rank),
    engagement: item.engagement,
    publishedAt: item.publishedAt,
  }));
  const trends = snapshot.trends.map(({ label, mentions, heat, sources }) => ({ label, mentions, heat, sources }));
  return `Scan time: ${snapshot.generatedAt}

Technique stats (heat = summed rank of items using it):
${JSON.stringify(trends)}

Top ${signals.length} signals, highest rank first:
${JSON.stringify(signals)}

Write today's briefing.`;
}
