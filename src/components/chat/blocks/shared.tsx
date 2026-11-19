import Image from "@/components/media/image";
import { Icon, type Name } from "@/components/icons/icon";
import { isLocalImage } from "@/lib/chat/constants";

type BlockPhoto = { src: string; alt: string; position?: string };

/**
 * Renders only our own images; anything else (e.g. tampered saved chats) shows a neutral tile.
 * `className` must position the box (relative/absolute) and give it a size.
 */
export function BlockImage({ photo, sizes, className = "" }: { photo?: BlockPhoto; sizes: string; className?: string }) {
  if (!photo || !isLocalImage(photo.src)) {
    return (
      <div className={`flex items-center justify-center overflow-hidden bg-[#EFECE6] text-[#B9B4AA] ${className}`}>
        <Icon name="image" size={22} />
      </div>
    );
  }
  return (
    <div className={`overflow-hidden ${className}`}>
      <Image src={photo.src} alt={photo.alt} fill sizes={sizes} className="object-cover" style={{ objectPosition: photo.position }} />
    </div>
  );
}

/** Card heading: a small ink icon and a serif title (no coloured tile). */
export function BlockTitle({ icon, children }: { icon: Name; children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 font-serif text-[1.125rem] font-normal leading-tight text-ink">
      <Icon name={icon} size={17} className="shrink-0 text-[#666666]" />
      {children}
    </h3>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-white ${className}`}>{children}</div>;
}

export function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="mt-2 space-y-1">
      {items.map((t) => (
        <li key={t} className="flex gap-2">
          <span aria-hidden className="mt-[0.6rem] size-1.5 shrink-0 rounded-full bg-[#B5AFA5]" />
          {t}
        </li>
      ))}
    </ul>
  );
}
