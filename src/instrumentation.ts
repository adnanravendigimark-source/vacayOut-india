import type { Instrumentation } from "next";

/** Records server errors (rendering, route handlers, server actions) for the admin System page. */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { logError } = await import("@/lib/ops/log");
  const digest = typeof err === "object" && err !== null && "digest" in err ? String((err as { digest: unknown }).digest) : undefined;
  await logError(`${context.routeType}:${context.routerKind}`, err, { path: request.path, digest });
};
