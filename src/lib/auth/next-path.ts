/** Where to go after signing in: same-site paths only (open-redirect guard), never admin or API routes. */
export function safeNext(raw: unknown, fallback = "/account"): string {
  const v = typeof raw === "string" ? raw.trim() : "";
  if (v.length > 300 || !/^\/(?![/\\])[\w\-/?=&%.~]*$/.test(v) || /^\/(admin|api)(\/|$|\?)/.test(v)) return fallback;
  return v;
}
