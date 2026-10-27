import { NextResponse } from "next/server";
import { consumeVerification } from "@/lib/auth/travellers";

export const dynamic = "force-dynamic";

/** Confirms an email from the link we sent, then shows the sign-in page. */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const id = await consumeVerification(token);
  const to = new URL(id ? "/login?account=verified" : "/login?account=link-invalid", req.url);
  return NextResponse.redirect(to, { headers: { "referrer-policy": "no-referrer", "cache-control": "no-store" } });
}
