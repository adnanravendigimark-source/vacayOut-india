import "server-only";

/**
 * Google reCAPTCHA v2 ("I'm not a robot" checkbox), verified on the server.
 * Keys: NEXT_PUBLIC_RECAPTCHA_SITE_KEY (public) and RECAPTCHA_SECRET_KEY.
 * Without keys the check is skipped in development and FAILS CLOSED in production.
 */
const VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

export function captchaSiteKey(): string | null {
  return process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && process.env.RECAPTCHA_SECRET_KEY ? process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY : null;
}

export async function verifyCaptcha(token: unknown, ip: string | null): Promise<boolean> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!secret || !captchaSiteKey()) return process.env.NODE_ENV !== "production";
  if (typeof token !== "string" || token.length < 20 || token.length > 4000) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (ip && ip !== "unknown") body.set("remoteip", ip);
  try {
    const res = await fetch(VERIFY_URL, { method: "POST", body, signal: AbortSignal.timeout(8000), cache: "no-store" });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false; // network error or timeout: treat as not verified
  }
}
