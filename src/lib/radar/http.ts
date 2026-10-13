import type { z } from "zod";
import { extractJson, jinaMode, readWithJina } from "./jina";
import type { FetchContext } from "./types";

export const USER_AGENT = "ai-pulse-radar/0.1 (+https://github.com/shaulhadarn/ai-pulse-radar)";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly url: string,
  ) {
    super(`HTTP ${status} from ${new URL(url).host}`);
    this.name = "HttpError";
  }
}

interface FetchJsonOptions<T extends z.ZodType> {
  schema: T;
  /** Allow routing this request through Jina Reader. Only for public GET URLs, since headers are not forwarded. */
  jina?: boolean;
  ctx?: FetchContext;
  headers?: Record<string, string>;
  method?: "GET" | "POST";
  body?: BodyInit;
  timeoutMs?: number;
}

/**
 * Fetches JSON with a timeout and validates it, so a changed upstream API
 * fails loudly at the boundary instead of deep in the UI.
 */
export async function fetchJson<T extends z.ZodType>(
  url: string,
  { schema, headers, method = "GET", body, timeoutMs = 10_000, jina = false, ctx }: FetchJsonOptions<T>,
): Promise<z.infer<T>> {
  const mode = jina ? jinaMode() : "off";
  const viaJina = async () => {
    const data = schema.parse(extractJson(await readWithJina(url)));
    ctx?.usedJina();
    return data;
  };

  if (mode === "always") return viaJina();
  try {
    return await fetchDirect(url, { schema, headers, method, body, timeoutMs });
  } catch (err) {
    if (mode !== "fallback" || !isBlocked(err)) throw err;
    try {
      return await viaJina();
    } catch (jinaErr) {
      throw new Error(`${(err as Error).message}; Jina fallback failed: ${(jinaErr as Error).message}`);
    }
  }
}

/** Errors that a different network origin can get around: blocks, rate limits, bad keys, unreachable hosts. */
export function isBlocked(err: unknown): boolean {
  if (err instanceof HttpError) return [401, 403, 429].includes(err.status);
  return err instanceof TypeError;
}

async function fetchDirect<T extends z.ZodType>(
  url: string,
  { schema, headers, method, body, timeoutMs }: Required<Pick<FetchJsonOptions<T>, "schema" | "method" | "timeoutMs">> & Pick<FetchJsonOptions<T>, "headers" | "body">,
): Promise<z.infer<T>> {
  const res = await fetch(url, {
    method,
    body,
    headers: { "User-Agent": USER_AGENT, Accept: "application/json", ...headers },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new HttpError(res.status, url);
  return schema.parse(await res.json());
}

export function hoursAgo(hours: number, now = Date.now()): Date {
  return new Date(now - hours * 3_600_000);
}
