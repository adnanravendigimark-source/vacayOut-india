import { redirect } from "next/navigation";
import { routes } from "@/lib/routes";

/** Old planner address: forwards to the conversation, keeping any question. */
export default async function PlanRedirect({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = (await searchParams).q;
  const text = (Array.isArray(q) ? q[0] : q)?.trim().slice(0, 500);
  redirect(text ? routes.chatWithPrompt(text) : routes.chat);
}
