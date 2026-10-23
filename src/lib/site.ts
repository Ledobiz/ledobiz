export const site = {
  name: "Ledobiz",
  legalName: "Ledobiz Technologies Limited",
  tagline: "Building digital excellence for tomorrow",
  description:
    "Ledobiz is a software development company in Lagos, Nigeria. We design, build and maintain custom websites, web apps, mobile apps and desktop software for startups, schools, clinics and growing businesses.",
  /** Home page <title>: what we do and where, the words people search for. */
  seoTitle: "Ledobiz · Software, web and mobile app development company in Lagos, Nigeria",
  email: "hello@ledobiz.com",
  location: "Lagos, Nigeria",
  rcNumber: "8302795",
  /** Registered office first. */
  offices: [
    { label: "Registered office", street: "Plot 2, Road K, 7th Avenue, Rofo Estate", locality: "Ikorodu", region: "Lagos State" },
    { label: "Office", street: "6, Wilson Estate, Asore Town, Ajuwon", locality: "Ifo", region: "Ogun State" },
  ],
  url: "https://ledobiz.com",
  crestPassUrl: "https://crestpass.com/",
  logo: "/brand/ledobiz-logo-on-dark.svg",
} as const;

export const techStrip = [
  "React",
  "Next.js",
  "Laravel",
  "Node.js",
  "Flutter",
  "React Native",
  "Electron",
  "AWS",
  "Docker",
  "PostgreSQL",
];

export const heroStats = [
  { value: "99.9%", label: "uptime across client platforms" },
  { value: "20k+", label: "consultations booked on MetroEyes" },
  { value: "24h", label: "reply on every quote request" },
];

export const trustedBy = ["MetroEyes", "Women Skills Hub", "PanAtlantic School of Business"];

export const values = [
  { title: "Precision", color: "bg-river", text: "Every feature is scoped before we build, so what you are quoted is what you get." },
  { title: "Reliability", color: "bg-salsify", text: "Tested code and monitored deployments keep client platforms at 99.9% uptime." },
  { title: "Efficiency", color: "bg-gold", text: "Reusable modules and agile sprints get you from idea to launch sooner." },
  { title: "Scalability", color: "bg-midnight", text: "Architecture that grows with your users, from the first customer to enterprise." },
];

export const processSteps = [
  { title: "Discovery", text: "We map your goals, users and technical constraints into a roadmap and a fixed scope." },
  { title: "Design", text: "Wireframes and high-fidelity screens you approve before a line of code is written." },
  { title: "Development", text: "Agile sprints with clean, tested code and regular demos so you see progress." },
  { title: "Launch and support", text: "We deploy, monitor and keep improving your product once it is live." },
];

/** Brand segment colours, in logo order. */
export const segmentColors = ["bg-river", "bg-salsify", "bg-gold", "bg-midnight"] as const;
