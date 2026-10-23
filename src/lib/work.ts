import type { ImageSlotId } from "@/lib/images";

export type Project = {
  img: ImageSlotId;
  kind: string;
  title: string;
  /** Live site URL. Leave empty until the link is confirmed. */
  url: string;
  desc: string;
  mobileDesc: string;
  tech: string[];
  metrics: { value: string; label: string }[];
};

export const projects: Project[] = [
  {
    img: "IMG-09",
    kind: "Web application",
    title: "MetroEyes",
    url: "https://metroeyesng.com",
    desc: "Website and appointment booking for MetroEyes Nigeria, an eye-care provider with clinics across the country. Patients explore services, book visits and read vision-care guides.",
    mobileDesc: "Website and appointment booking for an eye-care provider with clinics across Nigeria.",
    tech: ["Laravel", "Node.js", "PostgreSQL", "AWS"],
    metrics: [
      { value: "99.9%", label: "Uptime" },
      { value: "20k+", label: "Consultations" },
    ],
  },
  {
    img: "IMG-10",
    kind: "Learning platform",
    title: "Women Skills Hub",
    url: "https://womenskillshub.com",
    desc: "An online learning platform helping women build practical, income-boosting skills through expert-led online and in-person courses.",
    mobileDesc: "Expert-led online and in-person courses helping women build income-boosting skills.",
    tech: ["React", "Next.js", "Node.js", "PostgreSQL"],
    metrics: [
      { value: "150+", label: "Students" },
      { value: "30+", label: "Courses" },
    ],
  },
  {
    img: "IMG-11",
    kind: "Education platform",
    title: "PanAtlantic School of Business",
    url: "https://panatlantic.org",
    desc: "A global online school with course discovery, streamlined enrolment and programmes from short executive courses to full online degrees.",
    mobileDesc: "Course discovery and enrolment for programmes from short courses to online degrees.",
    tech: ["Laravel", "MySQL"],
    metrics: [
      { value: "99.9%", label: "Uptime" },
      { value: "CRM", label: "Admin portal" },
    ],
  },
];

export const testimonials = [
  {
    quote: "The team delivered our platform ahead of schedule with exceptional quality. Sales increased by 200% within the first quarter.",
    initials: "SA",
    name: "Sherifat A.",
    role: "Founder, Women Skills Hub",
    color: "bg-river",
  },
  {
    quote: "We are extremely satisfied with Ledobiz’s professionalism and expertise. Their solutions significantly improved our operational efficiency.",
    initials: "BL",
    name: "Blessing",
    role: "Business Manager, MetroEyes",
    color: "bg-salsify",
  },
  {
    quote: "Ledobiz turned our ideas into a robust application that exceeded our expectations. Their support with the CRM on our admin portal has been invaluable.",
    initials: "AK",
    name: "Akindotun",
    role: "Founder, PanAtlantic School of Business",
    color: "bg-gold",
  },
];

export const crestPass = {
  title: "Crest Pass: attendance that works smarter",
  desc: "A cloud attendance app for schools and institutions. Record, track and analyse student attendance with smart ID cards and instant parent notifications.",
  mobileDesc: "Cloud attendance for schools, with smart ID cards and instant parent notifications.",
  features: ["Smart ID cards", "Real-time analytics", "Parent notifications", "Reports"],
  price: "₦1,000",
  priceUnit: "per student / month",
};
