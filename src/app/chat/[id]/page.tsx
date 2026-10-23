import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChatView } from "@/components/chat/chat-view";
import { getHomepageData } from "@/lib/data/homepage";

export const metadata: Metadata = {
  title: "Your trip",
  robots: { index: false, follow: false },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export default async function ChatThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const { examplePrompts } = await getHomepageData();
  return <ChatView key={id} chatId={id} examples={examplePrompts} />;
}
