import "server-only";

/**
 * Transactional email via Resend's HTTP API (RESEND_API_KEY, EMAIL_FROM).
 * In development without a key, the message is printed to the terminal so
 * links can be followed locally. In production without a key, sending fails
 * loudly instead of silently dropping the email.
 */
export class EmailNotConfigured extends Error {}

export async function sendEmail(msg: { to: string; subject: string; text: string; html: string }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) {
    if (process.env.NODE_ENV === "production") throw new EmailNotConfigured("RESEND_API_KEY / EMAIL_FROM are not set");
    console.info(`\n[email:dev] To: ${msg.to}\nSubject: ${msg.subject}\n${msg.text}\n`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to: [msg.to], subject: msg.subject, text: msg.text, html: msg.html }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Email send failed (${res.status})`);
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
