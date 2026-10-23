import Image from "next/image";

/** Small destination thumbnail. AI illustrations carry a visible "AI" mark. */
export function DestinationThumb({ url, kind, name }: { url: string | null; kind: string | null; name: string }) {
  return (
    <span className="relative block h-11 w-16 shrink-0 overflow-hidden rounded-md bg-sand">
      {url ? <Image src={url} alt="" fill sizes="64px" className="object-cover" /> : <span className="flex h-full items-center justify-center text-[10px] text-muted">No image</span>}
      {url && kind === "ai_generated" ? <span className="absolute bottom-0.5 left-0.5 rounded bg-black/70 px-1 text-[9px] font-bold text-white" title={`AI-generated illustration of ${name}`}>AI</span> : null}
    </span>
  );
}
