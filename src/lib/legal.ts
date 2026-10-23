export type LegalSection = {
  title: string;
  paras?: string[];
  list?: string[];
  after?: string[];
};

export const termsSummary = [
  "Quotes are free, with no obligation, until you sign a proposal.",
  "You own the custom work we build for you once it is paid for.",
  "Scope changes are always quoted and approved before we do them.",
  "Defects in delivered work are fixed free for [30] days after launch.",
];

export const termsSections: LegalSection[] = [
  {
    title: "About these terms",
    paras: [
      "These terms apply when you use ledobiz.com, request a quote, or work with Ledobiz Technologies Limited (\"Ledobiz\", \"we\", \"us\"), a company registered in Nigeria under RC [NUMBER], with its office at [REGISTERED ADDRESS], Lagos.",
      "Each project is also governed by a signed proposal or statement of work. If that document conflicts with these terms, the signed document wins.",
    ],
  },
  {
    title: "Using our website",
    paras: ["You may use our website to learn about our services and contact us. When you do, you agree not to:"],
    list: [
      "Break any law or infringe anyone else’s rights.",
      "Attempt to disrupt, overload or gain unauthorised access to the website or our systems.",
      "Submit false information or someone else’s details through our forms.",
    ],
  },
  {
    title: "Free quotes and proposals",
    paras: [
      "Quotes requested through our website are free and carry no obligation. A quote is an estimate based on the information you give us and is valid for [30] days unless it says otherwise.",
      "A quote becomes binding only when both parties sign a proposal or statement of work.",
    ],
  },
  {
    title: "Projects, fees and payment",
    paras: ["The scope, timeline, price and payment schedule for each project are set out in the signed proposal. Unless that document says otherwise:"],
    list: [
      "Work starts after the first payment of [PERCENTAGE]% is received.",
      "Invoices are due within [14] days of issue.",
      "We may pause work while an invoice is overdue.",
      "Prices exclude taxes such as VAT, which are added where they apply.",
    ],
  },
  {
    title: "Changes to scope",
    paras: ["Requests that go beyond the agreed scope are quoted separately as change requests. We will not start extra work, or charge for it, until you approve the change in writing."],
  },
  {
    title: "Your responsibilities",
    paras: ["To keep your project on schedule, you agree to:"],
    list: [
      "Provide content, feedback, approvals and access to systems on time.",
      "Make sure you have the rights to any text, images, logos or data you give us.",
      "Name one person who can make decisions on your side.",
    ],
  },
  {
    title: "Ownership and intellectual property",
    paras: [
      "Once you have paid in full, you own the custom designs and code we create specifically for your project.",
      "We keep ownership of our pre-existing tools, components and know-how, and grant you a permanent licence to use them as part of your project. Open-source and third-party software remains under its own licence.",
      "Unless you ask us not to, we may show your project in our portfolio and name you as a client.",
    ],
  },
  {
    title: "Confidentiality",
    paras: ["Both parties will keep each other’s confidential information private and use it only for the project. We are happy to sign a non-disclosure agreement on request."],
  },
  {
    title: "Warranty and support",
    paras: ["We fix defects in the work we delivered, at no extra cost, for [30] days after launch. Ongoing maintenance, hosting and new features are covered by a separate support plan."],
  },
  {
    title: "Third-party services",
    paras: ["Projects often rely on services we do not control, such as hosting providers, payment gateways, app stores and email services. Their own terms apply, and we are not responsible for their outages, price changes or policy decisions."],
  },
  {
    title: "Limitation of liability",
    paras: [
      "We are not liable for indirect or consequential losses, such as lost profits or lost data, except where the law does not allow this to be excluded.",
      "Our total liability for any project is limited to the fees you paid us for that project in the [12] months before the claim.",
    ],
  },
  {
    title: "Ending a project",
    paras: ["Either party may end a project with [14] days’ written notice. You pay for work completed up to that date, and we hand over everything you have paid for."],
  },
  {
    title: "Our software products",
    paras: ["Our ready-made products, such as Crest Pass, have their own terms of service, published on each product’s website. Those terms apply when you use them."],
  },
  {
    title: "Governing law",
    paras: ["These terms are governed by the laws of the Federal Republic of Nigeria. We will first try to settle any dispute through good-faith discussion; if that fails, the courts of [Lagos State] will have jurisdiction."],
  },
  {
    title: "Changes to these terms",
    paras: ["We may update these terms from time to time. The date at the top of this page shows when they last changed. Signed project agreements are not affected by later changes."],
  },
];

export const privacyPromises = [
  { title: "We never sell your data", text: "Your details are used only to reply to you and deliver your project.", color: "bg-river" },
  { title: "You stay in control", text: "Ask to see, correct or delete your data at any time.", color: "bg-salsify" },
  { title: "Protected like our code", text: "Encryption, access controls and regular security reviews.", color: "bg-gold" },
];

export const privacySections: LegalSection[] = [
  {
    title: "Who we are",
    paras: [
      "Ledobiz Technologies Limited (\"Ledobiz\", \"we\", \"us\") is a software development company registered in Nigeria under RC [NUMBER], at [REGISTERED ADDRESS], Lagos. We decide how the personal data described in this policy is used.",
      "For any privacy question, contact us at hello@ledobiz.com. [If appointed: our Data Protection Officer is [NAME], reachable at [EMAIL].]",
    ],
  },
  {
    title: "Information we collect",
    paras: ["We collect only what we need to answer you and deliver our services:"],
    list: [
      "Quote requests: your name, email address, phone or WhatsApp number, company, and your project details, budget range, currency and timeline.",
      "Conversations: emails, messages and call notes when you contact us or work with us.",
      "Client records: billing contacts, invoices and contracts.",
      "Website usage: IP address, browser and device type, and pages visited, collected through cookies and analytics tools.",
    ],
  },
  {
    title: "How we use your information",
    paras: ["We use your information to:"],
    list: [
      "Reply to your enquiry and prepare your quote or proposal.",
      "Deliver, support and invoice the projects you sign up for.",
      "Keep our website and systems secure, and improve them.",
      "Meet our legal, tax and accounting obligations.",
      "Send you news about our services, but only if you have agreed to it. You can unsubscribe at any time.",
    ],
  },
  {
    title: "Our legal basis",
    paras: ["Under the Nigeria Data Protection Act 2023 and, for visitors in the UK and EU, the GDPR, we rely on: your consent; steps you ask us to take before entering a contract, such as preparing a quote; performance of our contract with you; our legitimate interest in running and protecting our business; and compliance with the law."],
  },
  {
    title: "Who we share it with",
    paras: ["We never sell your personal data. We share it only with:"],
    list: [
      "Service providers who help us operate, such as hosting, email, analytics and payment providers, under contracts that protect your data.",
      "Professional advisers such as lawyers and accountants, where needed.",
      "Authorities, when the law requires it.",
    ],
  },
  {
    title: "International transfers",
    paras: ["Some of our service providers store data outside Nigeria. When data leaves Nigeria, the UK or the EU, we use providers with recognised safeguards, such as standard contractual clauses, as the law requires."],
  },
  {
    title: "How long we keep it",
    list: [
      "Quote requests that do not become projects: [24] months, then deleted.",
      "Client project and contract records: for the length of our relationship plus [6] years.",
      "Financial records: as long as tax law requires.",
    ],
  },
  {
    title: "How we protect it",
    paras: ["We use encryption in transit, access controls, strong authentication and regular security reviews — the same practices we apply to our clients’ software. Only staff who need your data to do their job can access it."],
  },
  {
    title: "Your rights",
    paras: ["Depending on where you live, you have the right to:"],
    list: [
      "Access the personal data we hold about you.",
      "Correct data that is wrong or incomplete.",
      "Ask us to delete your data.",
      "Object to, or restrict, how we use it.",
      "Withdraw consent at any time.",
      "Receive your data in a portable format.",
    ],
    after: ["To use these rights, email hello@ledobiz.com. You can also complain to the Nigeria Data Protection Commission (NDPC) or your local data protection authority."],
  },
  {
    title: "Cookies",
    paras: ["We use essential cookies to make the website work, and analytics cookies, only with your consent, to understand how visitors use it. Analytics tools we use: [LIST TOOLS]. You can change your choice at any time through the cookie banner or your browser settings."],
  },
  {
    title: "Data we process for clients",
    paras: ["When we build or host software for a client, any personal data inside that software belongs to the client. We process it only on their instructions and under our agreement with them. If you are a user of one of our clients’ products, please contact that client first."],
  },
  {
    title: "Children",
    paras: ["Our website and services are for businesses. They are not aimed at children under 18, and we do not knowingly collect their data."],
  },
  {
    title: "Changes to this policy",
    paras: ["We may update this policy as our services or the law change. The date at the top shows the latest version. If a change is significant, we will tell clients by email."],
  },
];
