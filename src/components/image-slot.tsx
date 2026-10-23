import Image from "next/image";
import { ImageIcon } from "@/components/icons";
import { images, type ImageSlotId } from "@/lib/images";

type ImageSlotProps = {
  id: ImageSlotId;
  /** Tailwind classes for size and aspect ratio, e.g. "aspect-4/3". */
  className?: string;
  sizes?: string;
  priority?: boolean;
  /** Text shown on the placeholder instead of the slot's label. */
  caption?: string;
  /** Compact placeholder for thumbnails: shows only the slot id. */
  compact?: boolean;
  /** Crop anchor for photos; screenshots read best anchored to the top. */
  anchor?: "center" | "top";
};

/** Shows the slot's photo once `src` is set in lib/images.ts, otherwise a labelled placeholder. */
export function ImageSlot({ id, className = "", sizes = "100vw", priority = false, caption, compact = false, anchor = "center" }: ImageSlotProps) {
  const slot = images[id];

  if (slot.src) {
    return (
      <div className={`relative overflow-hidden bg-surface ${className}`}>
        <Image src={slot.src} alt={slot.alt} fill sizes={sizes} priority={priority} className={`object-cover ${anchor === "top" ? "object-top" : "object-center"}`} />
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={`${slot.label} image placeholder`}
      className={`flex flex-col items-center justify-center gap-1.5 border border-dashed border-control bg-surface p-4 text-center text-[13px] leading-[18px] text-muted ${className}`}
    >
      <ImageIcon size={compact ? 18 : 24} />
      <strong className="text-midnight">{id}</strong>
      {!compact && <span>{caption ?? `${slot.label} · ${slot.ratio}`}</span>}
    </div>
  );
}

/** Full-bleed background for the dark hero bands, under a Midnight overlay. */
export function HeroBackground({ id }: { id: ImageSlotId }) {
  const slot = images[id];

  if (slot.src) {
    return (
      <div aria-hidden="true" className="absolute inset-0">
        <Image src={slot.src} alt="" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-midnight/75" />
      </div>
    );
  }

  return (
    <div aria-hidden="true" className="absolute inset-2 flex items-start justify-end rounded-xl border border-dashed border-river/45 p-2 md:inset-4 md:items-end md:rounded-2xl md:p-4">
      <span className="hidden items-center gap-2 rounded bg-midnight/80 px-2 py-1 text-[10px] md:flex leading-[14px] text-haze md:px-2.5 md:py-1.5 md:text-xs md:leading-4">
        <ImageIcon size={16} className="hidden md:block" />
        {id} · {slot.label} · {slot.ratio}
      </span>
    </div>
  );
}
