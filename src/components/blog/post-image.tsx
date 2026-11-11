import Image from "@/components/media/image";

/** Hosts next/image may optimise (next.config.ts remotePatterns). Other URLs render as a plain <img>. */
const OPTIMISABLE = [/\.public\.blob\.vercel-storage\.com$/, /^images\.unsplash\.com$/, /^upload\.wikimedia\.org$/, /^commons\.wikimedia\.org$/];

function optimisable(src: string) {
  if (src.startsWith("/") && !src.startsWith("//")) return true;
  try {
    const u = new URL(src);
    return u.protocol === "https:" && OPTIMISABLE.some((re) => re.test(u.hostname));
  } catch {
    return false;
  }
}

/** A cover/card image that fills its (relative) parent. Shows a soft placeholder when there is no image. */
export function PostImage({ src, alt, sizes, className = "", preload = false }: { src: string; alt: string; sizes: string; className?: string; preload?: boolean }) {
  if (!src) return <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-sand to-[#E4DED3]" />;
  if (optimisable(src)) return <Image src={src} alt={alt} fill sizes={sizes} preload={preload} className={className} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading={preload ? "eager" : "lazy"} decoding="async" className={`absolute inset-0 h-full w-full ${className}`} />;
}
