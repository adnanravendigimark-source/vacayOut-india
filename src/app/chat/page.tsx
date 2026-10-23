import type { Metadata } from "next";
import { ChatView } from "@/components/chat/chat-view";
import { getHomepageData } from "@/lib/data/homepage";
import { MAX_MESSAGE_CHARS } from "@/lib/chat/constants";

export const metadata: Metadata = {
  title: "Plan a trip with AI",
  robots: { index: false, follow: true },
};

export default async function ChatPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = (await searchParams).q;
  const prompt = (Array.isArray(q) ? q[0] : q)?.trim().slice(0, MAX_MESSAGE_CHARS) || undefined;
  const { examplePrompts } = await getHomepageData();
  // Keyed by the question so a new ?q= starts a fresh conversation.
  return <ChatView key={prompt ?? "new"} initialPrompt={prompt} examples={examplePrompts} />;
}
