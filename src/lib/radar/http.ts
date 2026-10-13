import type { z } from "zod";

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
  { schema, headers, method = "GET", body, timeoutMs = 10_000 }: FetchJsonOptions<T>,
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
