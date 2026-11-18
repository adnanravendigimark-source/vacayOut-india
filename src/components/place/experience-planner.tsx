"use client";

import { useRouter } from "next/navigation";
import { AiBanner, type AiBannerChip, type AiBannerPick } from "@/components/ai-planner/ai-banner";
import { routes } from "@/lib/routes";

/** The shared AI banner for an experience page; every prompt opens the chat. */
export function ExperiencePlanner({ name, where, chips, picks }: { name: string; where: string; chips: AiBannerChip[]; picks: AiBannerPick[] }) {
  const router = useRouter();
  return (
    <AiBanner
      title={`Plan a trip around ${name}`}
      accent={name}
      text={`Tell the AI planner your dates. It fits ${name} into a day-by-day plan with the places nearby, using our reviewed guides.`}
      chipsLabel="Ask about this place"
      chips={chips}
      cta={{ label: "Plan with AI", prompt: `Plan a trip to ${where} that includes ${name}` }}
      question={`How do I fit ${name} into my trip?`}
      answer="These places nearby have guides too:"
      picks={picks}
      onAsk={(p) => router.push(routes.chatWithPrompt(p))}
    />
  );
}
