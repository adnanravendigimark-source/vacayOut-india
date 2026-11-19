import { auth } from "@/lib/auth";
import { answer } from "@/lib/chat/live/agent";
import { ANON_COOKIE, ANSWER_RESERVE_MICRO, LIMITS, admitMessage, chatBudget, quotaState, recordRequest, resolveVisitor, settleMessage, takeResearch } from "@/lib/chat/quota";
import { ANSWERED_OUTCOMES } from "@/lib/chat/quota-core";
import { blockSchema, chatRequestSchema, tripMemorySchema, type StreamEvent } from "@/lib/chat/schema";
import { openaiConfigured } from "@/lib/research/openai";
import { logError } from "@/lib/ops/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_BODY_BYTES = 32 * 1024;
/** Live research needs headroom in the monthly budget beyond the answer itself. */
const RESEARCH_RESERVE_MICRO = 40_000;

function json(status: number, body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...headers },
  });
}

/** Only our own pages may call the chat endpoint (blocks other sites from spending our AI budget). */
function isSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function anonCookie(value: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${ANON_COOKIE}=${value}; Path=/; Max-Age=${365 * 86_400}; HttpOnly; SameSite=Lax${secure}`;
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return json(403, { error: "Forbidden" });
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) return json(415, { error: "Send JSON" });

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return json(413, { error: "Conversation is too long. Start a new trip." });
  let parsed;
  try {
    parsed = chatRequestSchema.safeParse(JSON.parse(raw));
  } catch {
    return json(400, { error: "Invalid JSON" });
  }
  if (!parsed.success) return json(400, { error: "Invalid conversation" });

  // The monthly budget check doesn't depend on who is asking: start it now, use it later.
  const budgetP = chatBudget();
  budgetP.catch(() => {});
  const visitor = await resolveVisitor(req, await auth());
  const cookieHeader: Record<string, string> = visitor.newCookie ? { "set-cookie": anonCookie(visitor.newCookie) } : {};

  const chatId = parsed.data.chatId;
  const admission = await admitMessage(visitor, chatId);
  if (!admission.ok) {
    return json(
      admission.status,
      { error: admission.message, code: admission.code, authRequired: admission.code === "auth_required" || admission.code === "one_conversation" },
      { ...cookieHeader, ...(admission.retryAfter ? { "retry-after": String(admission.retryAfter) } : {}) },
    );
  }
  // Keep the reserved free question only for a real answer; give it back otherwise. Runs once.
  let settled: Promise<number | null> | null = null;
  const settle = (answered: boolean) => (settled ??= settleMessage(visitor, admission, { answered, chatId }).catch((err) => {
    console.error("[chat] settle failed", err instanceof Error ? err.message : err);
    return admission.freeLeft;
  }));

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let open = true;
      const send = (e: StreamEvent) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
        } catch {
          open = false; // the visitor went away; keep going so usage is still recorded
        }
      };
      const notice = async (text: string, outcome: string) => {
        const freeLeft = await settle(false);
        send({ type: "block", block: { type: "notice", tone: "warning", text } });
        send({ type: "done", summary: "No answer.", memory: parsed.data.memory ?? null, freeLeft });
        return recordRequest(visitor, { outcome, costMicroUsd: 0 });
      };
      let spent = 0;
      try {
        if (!openaiConfigured()) {
          await notice("The AI planner isn’t switched on yet. You can still browse our destination guides.", "not_configured");
          return;
        }
        const budget = await budgetP;
        if (budget.remaining < ANSWER_RESERVE_MICRO) {
          await notice("The AI planner has reached its limit for this month. Our destination guides are still open — browse them from Explore India.", "budget");
          return;
        }
        const result = await answer(
          { turns: parsed.data.messages, memory: parsed.data.memory ?? null },
          (e) => {
            if (e.type === "status" || e.type === "delta") return send(e);
            // Never stream anything that doesn't match the contract.
            const checked = blockSchema.safeParse(e.block);
            if (checked.success) send({ type: "block", block: checked.data });
            else console.error("[chat] dropped invalid block", e.block.type, checked.error.issues[0]?.message);
          },
          {
            allowResearch: async () => budget.remaining >= ANSWER_RESERVE_MICRO + RESEARCH_RESERVE_MICRO && (await takeResearch(visitor)),
            onCost: (c) => (spent += c),
          },
        );
        const memory = tripMemorySchema.safeParse(result.memory);
        const freeLeft = await settle(ANSWERED_OUTCOMES.has(result.meta.outcome));
        send({ type: "done", summary: result.summary.slice(0, 200), memory: memory.success ? memory.data : null, freeLeft });
        await recordRequest(visitor, result.meta);
      } catch (err) {
        await settle(false);
        await logError("chat", err, { path: "/api/chat" });
        send({ type: "error", message: "Something went wrong while planning. Please try again.", retry: true });
        await recordRequest(visitor, { outcome: "error", costMicroUsd: spent }).catch(() => {});
      } finally {
        try {
          controller.close();
        } catch {
          // already closed
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...cookieHeader,
    },
  });
}

/**
 * What the chat UI needs before the first question: whether the visitor is
 * signed in, free questions left and their one conversation. Reads only; never
 * sets a cookie or spends anything.
 */
export async function GET(req: Request) {
  try {
    // The monthly budget check doesn't depend on who is asking: start it now, use it later.
  const budgetP = chatBudget();
  budgetP.catch(() => {});
  const visitor = await resolveVisitor(req, await auth());
    // No cookie yet: a brand-new visitor with every free question left.
    if (visitor.newCookie) return json(200, { signedIn: false, limit: LIMITS.freeQuestions, left: LIMITS.freeQuestions, chatId: null });
    return json(200, await quotaState(visitor));
  } catch (err) {
    await logError("chat", err, { path: "/api/chat (quota)" });
    return json(503, { error: "Unavailable" });
  }
}
