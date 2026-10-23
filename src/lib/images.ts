/**
 * Image slots used across the site. Each slot shows a labelled placeholder until
 * `src` is set. Files live in `public/images/`.
 */
export type ImageSlotId =
  | "IMG-01" | "IMG-02" | "IMG-03" | "IMG-04" | "IMG-05" | "IMG-06" | "IMG-07" | "IMG-08" | "IMG-09"
  | "IMG-10" | "IMG-11" | "IMG-12" | "IMG-13" | "IMG-14" | "IMG-15" | "IMG-16" | "IMG-17" | "IMG-18";

export type ImageSlot = {
  label: string;
  ratio: string;
  alt: string;
  src?: string;
};

export const images: Record<ImageSlotId, ImageSlot> = {
  "IMG-01": { label: "Home hero background", ratio: "16:9", alt: "The Ledobiz team building software together in the Lagos office", src: "/images/img-01-hero-team.webp" },
  "IMG-02": { label: "Web development", ratio: "4:3", alt: "A responsive website shown on a laptop, monitor and phone", src: "/images/img-02-web-development.webp" },
  "IMG-03": { label: "Mobile app development", ratio: "4:3", alt: "Hands holding a phone with a travel booking app", src: "/images/img-03-mobile-apps.webp" },
  "IMG-04": { label: "Desktop applications", ratio: "4:3", alt: "Point-of-sale desktop software at a shop counter", src: "/images/img-04-desktop-pos.webp" },
  "IMG-05": { label: "Cloud and DevOps", ratio: "4:3", alt: "Cloud servers connected by streams of data", src: "/images/img-05-cloud.webp" },
  "IMG-06": { label: "API development", ratio: "4:3", alt: "Modular blocks linked by data lines, representing connected systems", src: "/images/img-06-api.webp" },
  "IMG-07": { label: "Security and audit", ratio: "4:3", alt: "A security engineer reviewing system checks on two monitors", src: "/images/img-07-security.webp" },
  "IMG-08": { label: "Team at work", ratio: "4:5", alt: "Ledobiz team planning user flows at a whiteboard", src: "/images/img-08-team-whiteboard.webp" },
  "IMG-09": { label: "MetroEyes screenshot", ratio: "16:10", alt: "MetroEyes website home page", src: "/images/img-09-metroeyes.webp" },
  "IMG-10": { label: "Women Skills Hub screenshot", ratio: "16:10", alt: "Women Skills Hub learning platform home page", src: "/images/img-10-women-skills-hub.webp" },
  "IMG-11": { label: "PanAtlantic screenshot", ratio: "16:10", alt: "PanAtlantic School of Business & Management home page", src: "/images/img-11-panatlantic.webp" },
  "IMG-12": { label: "Crest Pass product shot", ratio: "4:3", alt: "Crest Pass attendance dashboard on a tablet beside student ID cards", src: "/images/img-12-crest-pass.webp" },
  "IMG-13": { label: "Web development hero", ratio: "16:9", alt: "", src: "/images/img-13-hero-web.webp" },
  "IMG-14": { label: "Mobile apps hero", ratio: "16:9", alt: "", src: "/images/img-14-hero-mobile.webp" },
  "IMG-15": { label: "Desktop apps hero", ratio: "16:9", alt: "", src: "/images/img-15-hero-desktop.webp" },
  "IMG-16": { label: "Cloud and DevOps hero", ratio: "16:9", alt: "", src: "/images/img-16-hero-cloud.webp" },
  "IMG-17": { label: "API development hero", ratio: "16:9", alt: "", src: "/images/img-17-hero-api.webp" },
  "IMG-18": { label: "Security and audit hero", ratio: "16:9", alt: "", src: "/images/img-18-hero-security.webp" },
};
