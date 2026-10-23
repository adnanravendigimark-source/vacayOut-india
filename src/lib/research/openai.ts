/**
 * Minimal OpenAI Responses API client (fetch, no SDK). Server-side only: the
 * key never reaches the browser. Retries once on 429/5xx.
 */

export type ResponseUsage = {
  input_tokens: number;
  output_tokens: number;
  input_tokens_details?: { cached_tokens?: number };
};

export type ResponsesResult = {
  id: string;
  status: string;
  output: Array<Record<string, unknown> & { type: string }>;
  usage?: ResponseUsage;
  error?: { message?: string } | null;
  incomplete_details?: { reason?: string } | null;
};

export type CallModel = (body: Record<string, unknown>) => Promise<ResponsesResult>;

export class OpenAIError extends Error {}

export function openaiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export const createResponse: CallModel = async (body) => {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new OpenAIError("OPENAI_API_KEY is not set.");
  const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${base}/responses`, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(240_000),
    });
    if (res.ok) return (await res.json()) as ResponsesResult;
    if (attempt === 0 && (res.status === 429 || res.status >= 500)) {
      await new Promise((r) => setTimeout(r, 2500));
      continue;
    }
    let detail = "";
    try {
      detail = ((await res.json()) as { error?: { message?: string } }).error?.message ?? "";
    } catch {}
    throw new OpenAIError(`OpenAI request failed (${res.status})${detail ? `: ${detail.slice(0, 300)}` : ""}`);
  }
};

/** The final text answer of a response. */
export function outputText(r: ResponsesResult): string {
  const parts: string[] = [];
  for (const item of r.output) {
    if (item.type !== "message") continue;
    for (const c of (item.content as Array<{ type: string; text?: string }>) ?? []) if (c.type === "output_text" && c.text) parts.push(c.text);
  }
  return parts.join("");
}

/** Every URL the web search tool actually returned or opened during this response. */
export function consultedUrls(r: ResponsesResult): string[] {
  const urls: string[] = [];
  for (const item of r.output) {
    if (item.type !== "web_search_call") continue;
    const action = item.action as { url?: string; sources?: { url?: string }[] } | undefined;
    if (action?.url) urls.push(action.url);
    for (const s of action?.sources ?? []) if (s.url) urls.push(s.url);
  }
  for (const item of r.output) {
    if (item.type !== "message") continue;
    for (const c of (item.content as Array<{ annotations?: { type: string; url?: string }[] }>) ?? [])
      for (const a of c.annotations ?? []) if (a.type === "url_citation" && a.url) urls.push(a.url);
  }
  return urls;
}

/** Number of web search tool calls (billed per call). Counted conservatively: every call item. */
export function searchCallCount(r: ResponsesResult): number {
  return r.output.filter((i) => i.type === "web_search_call").length;
}

/** Thrown while a background response is still running; the caller retries later (no new request). */
export class StillRunning extends Error {}

async function getResponse(id: string): Promise<ResponsesResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new OpenAIError("OPENAI_API_KEY is not set.");
  const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const res = await fetch(`${base}/responses/${encodeURIComponent(id)}`, { headers: { authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new OpenAIError(`OpenAI request failed (${res.status})`);
  return (await res.json()) as ResponsesResult;
}

/**
 * Background-mode call for long, expensive requests. The response id is saved
 * (via `saveId`) BEFORE we wait, so a retried step resumes the same request
 * instead of paying for a new one. Polls up to `waitMs`, then throws
 * StillRunning so the step can retry later.
 */
export async function durableCall(
  body: Record<string, unknown>,
  opts: { savedId: string | null; saveId: (id: string) => Promise<void>; waitMs?: number; pollMs?: number },
): Promise<ResponsesResult> {
  let id = opts.savedId;
  if (!id) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new OpenAIError("OPENAI_API_KEY is not set.");
    const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
    const res = await fetch(`${base}/responses`, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ ...body, background: true, store: true }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) throw new OpenAIError(`OpenAI request failed (${res.status})`);
    const created = (await res.json()) as ResponsesResult;
    id = created.id;
    await opts.saveId(id);
  }
  const until = Date.now() + (opts.waitMs ?? 200_000);
  for (;;) {
    const r = await getResponse(id);
    if (r.status === "completed" || r.status === "incomplete") return r;
    if (r.status === "failed" || r.status === "cancelled") throw new OpenAIError(`OpenAI request ${r.status}${r.error?.message ? `: ${r.error.message}` : ""}`);
    if (Date.now() > until) throw new StillRunning(`Still researching (${id})`);
    await new Promise((res) => setTimeout(res, opts.pollMs ?? 4000));
  }
}
