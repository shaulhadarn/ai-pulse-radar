/**
 * Jina Reader (https://jina.ai/reader) fetches any public URL from Jina's own
 * servers and returns its content. That lets the radar read sources that block
 * cloud hosts (Reddit) or need paid API keys (X), with no key at all.
 *
 * Without JINA_API_KEY Jina allows about 20 requests a minute, which fits the
 * radar's 15-minute refresh. A free key raises the limit.
 */

export type JinaMode = "off" | "fallback" | "always";

/**
 * JINA_MODE:
 * - `fallback` (default): call sources directly, and retry through Jina when they block us.
 * - `always`: send every source request through Jina.
 * - `off`: never use Jina.
 */
export function jinaMode(): JinaMode {
  const mode = process.env.JINA_MODE?.trim().toLowerCase();
  return mode === "off" || mode === "always" ? mode : "fallback";
}

export class JinaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JinaError";
  }
}

interface ReadOptions {
  /** `text` returns a page's raw body (right for JSON APIs); `markdown` renders HTML pages. */
  format?: "text" | "markdown";
  timeoutMs?: number;
  /** CSS selector to wait for before capturing, for pages that render with JavaScript. */
  waitForSelector?: string;
}

export async function readWithJina(url: string, { format = "text", timeoutMs = 25_000, waitForSelector }: ReadOptions = {}): Promise<string> {
  const headers: Record<string, string> = { "X-Return-Format": format, Accept: "text/plain" };
  if (waitForSelector) headers["X-Wait-For-Selector"] = waitForSelector;
  if (process.env.JINA_API_KEY) headers.Authorization = `Bearer ${process.env.JINA_API_KEY}`;

  const res = await fetch(`https://r.jina.ai/${url}`, { headers, signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) {
    // Jina explains blocks and quota errors in the body, so surface the start of it.
    const detail = (await res.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 160);
    throw new JinaError(`Jina Reader HTTP ${res.status} for ${new URL(url).host}${detail ? `: ${detail}` : ""}`);
  }
  return res.text();
}

/** Jina may prefix a short header (Title, URL Source…) before the body, so cut the JSON out. */
export function extractJson(text: string): unknown {
  const start = text.search(/[{[]/);
  const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  if (start === -1 || end < start) throw new JinaError("Jina Reader returned no JSON");
  return JSON.parse(text.slice(start, end + 1));
}
