import type { ImageSlotId } from "@/lib/images";
import type { ProjectType } from "@/lib/quote";

export type Service = {
  slug: string;
  title: string;
  navLabel: string;
  short: string;
  quoteNoun: string;
  /** Short noun for the sticky mobile quote button. */
  barNoun: string;
  preset: ProjectType | null;
  cardImg: ImageSlotId;
  heroImg: ImageSlotId;
  cardDesc: string;
  mobileDesc: string;
  cardTech: string[];
  overline: string;
  headline: string;
  lead: string;
  mobileLead: string;
  outcomes: string[];
  buildsLabel: string;
  buildTitle: string;
  builds: { title: string; text: string }[];
  whyTitle: string;
  benefits: { title: string; text: string }[];
  techLabel: string;
  tech: string[];
  stepsTitle: string;
  steps: { title: string; text: string }[];
  faqs: { q: string; a: string }[];
  ctaTitle: string;
  metaDescription: string;
};

export const services: Service[] = [
  {
    slug: "web-development",
    title: "Web development",
    navLabel: "Web development",
    short: "web development",
    quoteNoun: "web development",
    barNoun: "web",
    preset: "web",
    cardImg: "IMG-02",
    heroImg: "IMG-13",
    cardDesc: "Fast, responsive websites and web apps, from company sites to customer portals and SaaS platforms.",
    mobileDesc: "Websites, web apps and SaaS platforms",
    cardTech: ["React", "Next.js", "Laravel", "Node.js"],
    overline: "WEB DEVELOPMENT",
    headline: "Websites and web apps that win customers and run your operations",
    lead: "From a company website to a full SaaS platform, we design and build fast, secure web software with React, Next.js and Laravel.",
    mobileLead: "Fast, secure web software built with React, Next.js and Laravel.",
    outcomes: ["Mobile-friendly and fast on every device", "Built for search engines from day one", "An admin area your team can actually use"],
    buildsLabel: "WHAT WE BUILD",
    buildTitle: "Web software for every stage of your business",
    builds: [
      { title: "Company websites", text: "Fast, search-friendly sites that explain what you do and turn visitors into enquiries." },
      { title: "Web applications", text: "Custom tools for bookings, operations and internal workflows, built around how your team works." },
      { title: "Customer portals", text: "Secure areas where customers sign in, track orders, pay invoices and get support." },
      { title: "SaaS platforms", text: "Multi-tenant products with subscriptions, roles and admin dashboards, ready to scale." },
      { title: "E-commerce", text: "Online stores with local and international payments, inventory and order management." },
      { title: "Learning platforms", text: "Course catalogues, enrolment and student dashboards, as built for PanAtlantic and Women Skills Hub." },
    ],
    whyTitle: "Web projects done properly, end to end",
    benefits: [
      { title: "Design and code under one roof", text: "One team owns the UX, the build and the launch, so nothing gets lost in handover." },
      { title: "Performance you can measure", text: "Platforms we run hold 99.9% uptime, with monitoring from launch day." },
      { title: "Content you control", text: "Update pages, products and posts yourself without calling a developer." },
      { title: "Ready to grow", text: "Clean architecture so new features and traffic do not mean a rebuild." },
    ],
    techLabel: "TECH STACK",
    tech: ["React", "Next.js", "TypeScript", "Node.js", "Laravel", "Python", "FastAPI", "PostgreSQL", "MySQL"],
    stepsTitle: "From your brief to a live product",
    steps: [
      { title: "Discovery", text: "We agree goals, pages and features, then send a fixed scope and quote." },
      { title: "Design", text: "Wireframes and visual designs for you to review and approve." },
      { title: "Build", text: "Agile sprints with a staging site so you can test as we go." },
      { title: "Launch and support", text: "We deploy, monitor and keep your site fast and secure." },
    ],
    faqs: [
      { q: "How much does a website or web app cost?", a: "It depends on the pages, features and integrations you need. Fill in the quote form and we will send an itemised estimate within 24 hours." },
      { q: "How long does a project take?", a: "Timelines are set during discovery once the scope is clear. You get a schedule with milestones before any work starts." },
      { q: "Can you redesign or take over my existing site?", a: "Yes. We review your current site and code first, then recommend a redesign, a rebuild or targeted improvements." },
      { q: "Do you offer support after launch?", a: "Yes. We monitor, update and improve the platforms we build, and can take on maintenance for sites built elsewhere." },
    ],
    ctaTitle: "Ready to build your website or web app?",
    metaDescription: "Web development company in Lagos, Nigeria. Custom websites, web apps, customer portals and SaaS platforms built with React, Next.js and Laravel. Get a free quote.",
  },
  {
    slug: "mobile-app-development",
    title: "Mobile app development",
    navLabel: "Mobile apps",
    short: "mobile apps",
    quoteNoun: "mobile app",
    barNoun: "app",
    preset: "mobile",
    cardImg: "IMG-03",
    heroImg: "IMG-14",
    cardDesc: "Cross-platform and native apps for iOS and Android, built with Flutter and React Native.",
    mobileDesc: "iOS and Android with Flutter and React Native",
    cardTech: ["Flutter", "React Native", "iOS", "Android"],
    overline: "MOBILE APPS",
    headline: "Mobile apps your customers keep on their home screen",
    lead: "Cross-platform and native apps for iOS and Android, built with Flutter and React Native and designed to feel fast and familiar.",
    mobileLead: "Cross-platform and native apps for iOS and Android, built with Flutter and React Native.",
    outcomes: ["One codebase for iOS and Android", "Push notifications, payments and offline mode", "Published and maintained on both app stores"],
    buildsLabel: "WHAT WE BUILD",
    buildTitle: "Apps for customers, teams and marketplaces",
    builds: [
      { title: "Customer apps", text: "Branded iOS and Android apps for ordering, booking, loyalty and account management." },
      { title: "Field and staff apps", text: "Tools for teams on the move: check-ins, inspections, deliveries and offline data capture." },
      { title: "Marketplace apps", text: "Two-sided platforms that connect buyers and sellers, with chat, payments and ratings." },
      { title: "Learning apps", text: "Courses, lessons and progress tracking in your students’ pockets." },
      { title: "App companions to your web platform", text: "A mobile front end for your existing web app or SaaS, sharing one API." },
      { title: "App Store and Play Store launch", text: "We handle builds, listings, review guidelines and release updates." },
    ],
    whyTitle: "Mobile apps without the guesswork",
    benefits: [
      { title: "Cross-platform by default", text: "Flutter and React Native mean one build for both stores, lowering cost and time to launch." },
      { title: "Native where it counts", text: "We go native for camera, Bluetooth, sensors or heavy performance needs." },
      { title: "Designed for thumbs", text: "Clear screens and large touch targets that work one-handed." },
      { title: "Connected to your systems", text: "Secure APIs link the app to your website, CRM or payment provider." },
    ],
    techLabel: "TECH STACK",
    tech: ["Flutter", "Dart", "React Native", "TypeScript", "Swift", "Kotlin", "Firebase", "Node.js", "Laravel"],
    stepsTitle: "From your brief to a live product",
    steps: [
      { title: "Discovery", text: "We define users, key journeys and platform needs, then send a fixed scope." },
      { title: "Design", text: "Clickable prototypes you can try on your own phone before we build." },
      { title: "Build", text: "Sprints with test builds on your device after each milestone." },
      { title: "Launch and support", text: "Store submission, crash monitoring and regular updates." },
    ],
    faqs: [
      { q: "Should I build for iOS, Android or both?", a: "Most clients launch on both with a single cross-platform codebase. We recommend native only when a feature truly needs it." },
      { q: "How much does a mobile app cost?", a: "It depends on screens, features and integrations. Use the quote form and we will send an itemised estimate within 24 hours." },
      { q: "Do you publish the app to the stores?", a: "Yes. We prepare the listings, handle store review and publish under your developer account." },
      { q: "Can you add an app to my existing website or system?", a: "Yes. We connect the app to your current platform through a secure API, or build one if you do not have it yet." },
    ],
    ctaTitle: "Ready to put your business in your customers’ pockets?",
    metaDescription: "Mobile app developers in Lagos, Nigeria. iOS and Android apps built with Flutter and React Native, from design to App Store launch. Get a free quote.",
  },
  {
    slug: "desktop-applications",
    title: "Desktop applications",
    navLabel: "Desktop apps",
    short: "desktop apps",
    quoteNoun: "desktop app",
    barNoun: "desktop",
    preset: "desktop",
    cardImg: "IMG-04",
    heroImg: "IMG-15",
    cardDesc: "Software for Windows, macOS and Linux that works offline and connects to your existing systems.",
    mobileDesc: "Windows, macOS and Linux, online or off",
    cardTech: ["Electron", "Windows", "macOS", "Linux"],
    overline: "DESKTOP APPS",
    headline: "Desktop software that keeps your business running, online or off",
    lead: "Powerful applications for Windows, macOS and Linux that work offline, talk to your hardware and sync with the cloud.",
    mobileLead: "Applications for Windows, macOS and Linux that work offline and sync with the cloud.",
    outcomes: ["Runs on Windows, macOS and Linux", "Works offline and syncs when connected", "Automatic updates for every install"],
    buildsLabel: "WHAT WE BUILD",
    buildTitle: "Desktop tools for the work that cannot wait",
    builds: [
      { title: "Point of sale and retail", text: "Fast checkout software that keeps selling when the internet drops, then syncs." },
      { title: "Back-office tools", text: "Inventory, accounting and records software tailored to how your business runs." },
      { title: "Offline-first apps", text: "Software for clinics, schools and sites with unreliable connectivity." },
      { title: "Hardware integrations", text: "Connect printers, scanners, card readers and ID devices to your workflow." },
      { title: "Desktop versions of web apps", text: "Package your web platform as an installable app with system notifications." },
      { title: "Legacy modernisation", text: "Rebuild ageing desktop software on a modern, maintainable stack." },
    ],
    whyTitle: "Reliable software for your front line",
    benefits: [
      { title: "Cross-platform builds", text: "Electron lets one codebase ship to every operating system your team uses." },
      { title: "Offline resilience", text: "Local storage and smart syncing so work never stops because of a bad connection." },
      { title: "Secure by design", text: "Encrypted local data and role-based access for shared machines." },
      { title: "Easy to roll out", text: "Signed installers and silent auto-updates across all your machines." },
    ],
    techLabel: "TECH STACK",
    tech: ["Electron", "TypeScript", "React", "Node.js", "SQLite", "Windows", "macOS", "Linux"],
    stepsTitle: "From your brief to a live product",
    steps: [
      { title: "Discovery", text: "We map your workflows, devices and connectivity, then fix the scope." },
      { title: "Design", text: "Screens built for speed, keyboard shortcuts and long working days." },
      { title: "Build", text: "Test builds installed on your machines after each milestone." },
      { title: "Rollout and support", text: "Installers, training and ongoing updates for every location." },
    ],
    faqs: [
      { q: "Why choose a desktop app over a web app?", a: "Desktop apps work offline, connect directly to hardware and stay fast with large amounts of local data. We will recommend the right fit during discovery." },
      { q: "Which operating systems do you support?", a: "Windows, macOS and Linux, usually from a single codebase." },
      { q: "Can it sync with our website or cloud system?", a: "Yes. The app can sync securely with your web platform or cloud database whenever a connection is available." },
      { q: "How are updates delivered?", a: "Through signed auto-updates, so every machine stays on the latest version without manual installs." },
    ],
    ctaTitle: "Need software your team can rely on every day?",
    metaDescription: "Desktop software development in Lagos, Nigeria. Windows, macOS and Linux apps, including POS systems, that work offline and connect to your hardware.",
  },
  {
    slug: "cloud-devops",
    title: "Cloud and DevOps",
    navLabel: "Cloud and DevOps",
    short: "cloud and DevOps",
    quoteNoun: "cloud and DevOps",
    barNoun: "cloud",
    preset: null,
    cardImg: "IMG-05",
    heroImg: "IMG-16",
    cardDesc: "Scalable hosting, automated deployments and monitoring on AWS, Azure and DigitalOcean.",
    mobileDesc: "Hosting, deployments and monitoring",
    cardTech: ["AWS", "Azure", "Docker", "DigitalOcean"],
    overline: "CLOUD AND DEVOPS",
    headline: "Cloud infrastructure that scales with you and stays online",
    lead: "We set up, automate and monitor hosting on AWS, Azure and DigitalOcean so your platforms stay fast, secure and affordable.",
    mobileLead: "Hosting on AWS, Azure and DigitalOcean that stays fast, secure and affordable.",
    outcomes: ["99.9% uptime across the platforms we run", "Every release deployed automatically", "Clear monthly hosting costs"],
    buildsLabel: "WHAT WE BUILD",
    buildTitle: "Infrastructure you never have to think about",
    builds: [
      { title: "Cloud migration", text: "Move your apps and data from shared hosting or on-premise servers to the cloud safely." },
      { title: "Automated deployments", text: "CI/CD pipelines that test and ship every change without manual steps." },
      { title: "Containers and scaling", text: "Docker-based setups that scale up for traffic peaks and down to save cost." },
      { title: "Monitoring and alerts", text: "Uptime, error and performance tracking with alerts before users notice problems." },
      { title: "Backups and recovery", text: "Scheduled backups and tested recovery plans for your critical data." },
      { title: "Cost optimisation", text: "Right-sized servers and storage so you only pay for what you use." },
    ],
    whyTitle: "Operations handled by the people who built it",
    benefits: [
      { title: "Provider-neutral advice", text: "We pick AWS, Azure or DigitalOcean based on your needs and budget, not a reseller deal." },
      { title: "Infrastructure as code", text: "Your setup is documented and reproducible, never locked in one engineer’s head." },
      { title: "Proactive monitoring", text: "Issues are caught and fixed early, often before they reach your users." },
      { title: "Security built in", text: "Firewalls, SSL, access controls and patching as standard." },
    ],
    techLabel: "TECH STACK",
    tech: ["AWS", "Azure", "DigitalOcean", "Docker", "GitHub Actions", "Nginx", "Linux", "PostgreSQL"],
    stepsTitle: "From audit to a self-running platform",
    steps: [
      { title: "Audit", text: "We review your current hosting, costs and risks." },
      { title: "Plan", text: "A target architecture and migration plan with a fixed quote." },
      { title: "Migrate and automate", text: "Zero-downtime moves plus CI/CD pipelines and backups." },
      { title: "Monitor and support", text: "Round-the-clock monitoring with monthly reports." },
    ],
    faqs: [
      { q: "Which cloud provider should I use?", a: "It depends on your traffic, budget and compliance needs. We compare options during the audit and recommend one." },
      { q: "Will my site go offline during migration?", a: "We plan migrations to avoid downtime, switching traffic only once the new setup is tested." },
      { q: "Can you manage infrastructure we already have?", a: "Yes. We can take over and improve an existing setup after a short audit." },
      { q: "How are hosting costs billed?", a: "You pay the cloud provider directly, so costs stay transparent. Our management fee is quoted separately." },
    ],
    ctaTitle: "Want hosting that just works?",
    metaDescription: "Cloud and DevOps services in Lagos, Nigeria. Cloud migration, CI/CD, monitoring and managed hosting on AWS, Azure and DigitalOcean. Get a free quote.",
  },
  {
    slug: "api-development",
    title: "API development",
    navLabel: "API development",
    short: "API development",
    quoteNoun: "API",
    barNoun: "API",
    preset: null,
    cardImg: "IMG-06",
    heroImg: "IMG-17",
    cardDesc: "Secure REST and GraphQL APIs that connect your apps, partners and third-party services.",
    mobileDesc: "REST and GraphQL APIs and integrations",
    cardTech: ["REST", "GraphQL", "Node.js", "FastAPI"],
    overline: "API DEVELOPMENT",
    headline: "APIs that connect your apps, partners and payments",
    lead: "Robust REST and GraphQL APIs that link your software to the services your business depends on, documented and secured from day one.",
    mobileLead: "REST and GraphQL APIs, documented and secured from day one.",
    outcomes: ["Clear documentation your partners can follow", "Authentication and rate limits built in", "Tested to handle real traffic"],
    buildsLabel: "WHAT WE BUILD",
    buildTitle: "The backbone behind every screen",
    builds: [
      { title: "REST APIs", text: "Clean, versioned endpoints that power your web and mobile apps from one backend." },
      { title: "GraphQL APIs", text: "Flexible queries so each screen fetches exactly the data it needs." },
      { title: "Payment integrations", text: "Paystack, Flutterwave, Stripe and bank transfers wired into your checkout." },
      { title: "Third-party integrations", text: "Connect CRMs, accounting tools, SMS and email providers to your systems." },
      { title: "Partner and public APIs", text: "Secure APIs with keys, rate limits and docs for partners to build on." },
      { title: "Webhooks and automation", text: "Real-time events that keep your tools in sync without manual work." },
    ],
    whyTitle: "Integrations that do not break",
    benefits: [
      { title: "Designed before it is coded", text: "We agree the API contract with you first, so front ends can be built in parallel." },
      { title: "Automated tests", text: "Every endpoint is covered so changes never silently break your apps." },
      { title: "Versioning", text: "New features ship without breaking existing integrations." },
      { title: "Live documentation", text: "Interactive OpenAPI docs that always match the running API." },
    ],
    techLabel: "TECH STACK",
    tech: ["REST", "GraphQL", "Laravel", "Node.js", "FastAPI", "Python", "OpenAPI", "PostgreSQL", "Redis"],
    stepsTitle: "From your brief to a documented, live API",
    steps: [
      { title: "Discovery", text: "We list the systems to connect and the data that must flow between them." },
      { title: "API design", text: "An agreed contract and docs before development starts." },
      { title: "Build and test", text: "Endpoints built with automated tests and load checks." },
      { title: "Launch and support", text: "Deployment, monitoring and versioned updates." },
    ],
    faqs: [
      { q: "REST or GraphQL: which do I need?", a: "REST suits most business integrations; GraphQL helps when many screens need different data. We recommend one during discovery." },
      { q: "Can you integrate with Paystack or Flutterwave?", a: "Yes, along with Stripe, bank transfer services and other payment providers." },
      { q: "Will I get documentation?", a: "Yes. Every API ships with interactive OpenAPI documentation and example requests." },
      { q: "Can you fix or extend an existing API?", a: "Yes. We audit the current code, then improve, document or extend it." },
    ],
    ctaTitle: "Need your systems to talk to each other?",
    metaDescription: "API development and integrations in Lagos, Nigeria. REST and GraphQL APIs, Paystack and Flutterwave payments and third-party integrations. Get a free quote.",
  },
  {
    slug: "security-audit",
    title: "Security and audit",
    navLabel: "Security and audit",
    short: "security and audit",
    quoteNoun: "security audit",
    barNoun: "security",
    preset: null,
    cardImg: "IMG-07",
    heroImg: "IMG-18",
    cardDesc: "Penetration testing, load testing and security reviews that find weak spots before attackers do.",
    mobileDesc: "Penetration and load testing",
    cardTech: ["Penetration testing", "Load testing", "Code review"],
    overline: "SECURITY AND AUDIT",
    headline: "Find the weak spots before attackers or traffic spikes do",
    lead: "Penetration testing, load testing and security reviews that show exactly where your software is at risk, and how to fix it.",
    mobileLead: "Penetration testing, load testing and security reviews with clear fixes.",
    outcomes: ["A clear, prioritised report in plain language", "Fixes for every critical finding", "A retest to prove the issues are closed"],
    buildsLabel: "WHAT WE DO",
    buildTitle: "Security and performance checks for live software",
    builds: [
      { title: "Penetration testing", text: "Authorised, controlled attacks on your web apps, APIs and servers to find exploitable weaknesses." },
      { title: "Load testing", text: "Simulated traffic peaks that show how many users your platform can handle before it slows." },
      { title: "Code security review", text: "A line-by-line review of your codebase for injection, auth and data-exposure risks." },
      { title: "Infrastructure review", text: "Checks on servers, cloud permissions, backups and network rules." },
      { title: "Compliance readiness", text: "Gap analysis against data protection rules such as NDPR and GDPR." },
      { title: "Fix and retest", text: "We fix what we find, or work with your team, then retest to confirm." },
    ],
    whyTitle: "Findings you can act on, not just a scary report",
    benefits: [
      { title: "Developers who also test", text: "We build software too, so our recommendations are practical to implement." },
      { title: "Prioritised by risk", text: "Each finding is ranked by impact so you fix what matters first." },
      { title: "Safe, agreed scope", text: "Testing runs only on systems you authorise, at times that suit you." },
      { title: "Confidential", text: "Results are shared only with the people you name." },
    ],
    techLabel: "TOOLS AND STANDARDS",
    tech: ["OWASP Top 10", "Burp Suite", "k6", "JMeter", "NDPR", "GDPR", "SSL/TLS"],
    stepsTitle: "From scope to a fixed, safer platform",
    steps: [
      { title: "Scope", text: "We agree the systems, test types and timing with you in writing." },
      { title: "Test", text: "Automated scans plus manual testing by our engineers." },
      { title: "Report", text: "A plain-language report with risks ranked and fixes explained." },
      { title: "Fix and retest", text: "We help close each issue, then verify it is resolved." },
    ],
    faqs: [
      { q: "Will testing disrupt my live site?", a: "We agree timing and limits in advance, and can test a staging copy when you prefer zero risk to production." },
      { q: "What do I get at the end?", a: "A written report with each finding, its risk level and steps to fix it, plus a summary for non-technical stakeholders." },
      { q: "Can you test software another company built?", a: "Yes, as long as you own the system or have written permission to test it." },
      { q: "How often should we run an audit?", a: "At least once a year and after major releases. We can set up a recurring schedule." },
    ],
    ctaTitle: "Want to know how secure your software really is?",
    metaDescription: "Software security and audits in Lagos, Nigeria. Penetration testing, load testing, code security reviews and compliance readiness. Get a free quote.",
  },
];

export function getService(slug: string): Service | undefined {
  return services.find((service) => service.slug === slug);
}

export function serviceHref(service: Pick<Service, "slug">): string {
  return `/services/${service.slug}`;
}
