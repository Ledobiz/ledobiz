/**
 * Creates the first admin and the default settings. With SEED_DEMO=1 it also adds demo data.
 * Run with `npm run db:seed` after `npm run db:deploy` (or `db:migrate`).
 */
import { config } from "dotenv";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/server/password";

config({ path: [".env.local", ".env"], quiet: true });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Add it to .env.local first.");
}
const adapter = connectionString.includes(".neon.tech") ? new PrismaNeon({ connectionString }) : new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const day = 86_400_000;
const daysFromNow = (days: number) => new Date(Math.floor(Date.now() / day) * day + days * day);

async function main(): Promise<void> {
  await prisma.settings.upsert({ where: { id: "default" }, create: { id: "default" }, update: {} });

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (!email || password.length < 5) {
    throw new Error("Set ADMIN_EMAIL and an ADMIN_PASSWORD of at least 5 characters in .env.local.");
  }
  const admin = await prisma.user.upsert({
    where: { email },
    create: { email, name: process.env.ADMIN_NAME?.trim() || "Ledobiz Admin", role: "ADMIN", passwordHash: await hashPassword(password) },
    update: {},
  });
  console.log(`Admin ready: ${admin.email}`);

  if (process.env.SEED_DEMO !== "1") {
    return;
  }
  if ((await prisma.client.count()) > 0) {
    console.log("Clients already exist, so demo data was skipped.");
    return;
  }

  const lead = await prisma.user.upsert({
    where: { email: "tobi@ledobiz.com" },
    create: { email: "tobi@ledobiz.com", name: "Tobi Adeyemi", role: "PROJECT_LEAD", passwordHash: await hashPassword(`demo-${Math.random()}`) },
    update: {},
  });

  const metro = await prisma.client.create({
    data: {
      company: "MetroEyes Clinic",
      industry: "Healthcare",
      city: "Lagos",
      country: "Nigeria",
      contacts: { create: { name: "Funmi Bello", role: "Operations manager", email: "funmi@metroeyes.example", phone: "+234 803 000 0000", isPrimary: true, receivesInvoices: true } },
    },
  });
  const kora = await prisma.client.create({
    data: { company: "Kora Foods", industry: "Food and drink", city: "Abuja", country: "Nigeria", contacts: { create: { name: "Chidi Okafor", role: "Founder", email: "chidi@korafoods.example", isPrimary: true, receivesInvoices: true } } },
  });
  const atlas = await prisma.client.create({
    data: {
      company: "Atlas Logistics",
      industry: "Logistics",
      city: "Accra",
      country: "Ghana",
      supportPlanName: "Care plan · Standard",
      supportPlanPrice: 250000,
      supportPlanUntil: daysFromNow(200),
      contacts: { create: { name: "Ama Mensah", role: "IT lead", email: "ama@atlaslogistics.example", isPrimary: true, receivesInvoices: true } },
    },
  });

  const booking = await prisma.project.create({
    data: {
      name: "Patient booking platform",
      clientId: metro.id,
      service: "Web app",
      status: "ONGOING",
      currency: "NGN",
      contractValue: 18_500_000,
      expenseBudget: 2_400_000,
      techStack: ["Next.js", "PostgreSQL", "Paystack", "Twilio"],
      startDate: daysFromNow(-60),
      deadline: daysFromNow(20),
      leadId: lead.id,
      supportTerms: "3 months free support",
      milestones: {
        create: [
          { position: 1, name: "Discovery and scope", status: "COMPLETED", progress: 100, plannedStart: daysFromNow(-60), plannedEnd: daysFromNow(-52), completedAt: daysFromNow(-52), paymentPercent: 40 },
          { position: 2, name: "Design", status: "COMPLETED", progress: 100, plannedStart: daysFromNow(-52), plannedEnd: daysFromNow(-36), completedAt: daysFromNow(-33), paymentPercent: 20 },
          { position: 3, name: "Build", status: "ONGOING", progress: 55, plannedStart: daysFromNow(-36), plannedEnd: daysFromNow(4), forecastEnd: daysFromNow(16), blocker: "Waiting for the clinic’s Paystack live keys", paymentPercent: 20 },
          { position: 4, name: "Testing and sign-off", plannedStart: daysFromNow(4), plannedEnd: daysFromNow(14), forecastEnd: daysFromNow(27) },
          { position: 5, name: "Launch and handover", plannedStart: daysFromNow(14), plannedEnd: daysFromNow(20), forecastEnd: daysFromNow(31), paymentPercent: 20 },
        ],
      },
      expenses: {
        create: [
          { category: "Hosting", description: "Vercel Pro and Neon", amount: 145_000, currency: "NGN", spentOn: daysFromNow(-30) },
          { category: "Software licences", description: "Twilio SMS credit", amount: 180, currency: "USD", spentOn: daysFromNow(-12) },
        ],
      },
    },
  });
  await prisma.project.create({
    data: {
      name: "Kora ordering app",
      clientId: kora.id,
      service: "Mobile app",
      status: "PENDING",
      stage: "Awaiting deposit",
      currency: "NGN",
      contractValue: 12_000_000,
      expenseBudget: 1_200_000,
      techStack: ["React Native", "Supabase"],
      startDate: daysFromNow(10),
      deadline: daysFromNow(100),
      leadId: lead.id,
    },
  });
  const fleet = await prisma.project.create({
    data: {
      name: "Fleet tracking dashboard",
      clientId: atlas.id,
      service: "Web app",
      status: "COMPLETED",
      currency: "USD",
      contractValue: 14_000,
      expenseBudget: 1_500,
      techStack: ["Next.js", "Mapbox", "PostgreSQL"],
      startDate: daysFromNow(-200),
      deadline: daysFromNow(-90),
      deliveredAt: daysFromNow(-93),
      leadId: admin.id,
      expenses: { create: { category: "Software licences", description: "Mapbox", amount: 600, currency: "USD", spentOn: daysFromNow(-120) } },
    },
  });

  await prisma.invoice.create({
    data: {
      number: `INV-${new Date().getFullYear()}-0001`,
      clientId: metro.id,
      projectId: booking.id,
      status: "PAID",
      currency: "NGN",
      issueDate: daysFromNow(-58),
      dueDate: daysFromNow(-44),
      paidAt: daysFromNow(-50),
      paymentMethod: "Bank transfer",
      vatRate: 7.5,
      items: { create: { position: 1, description: "Patient booking platform: deposit (40% of contract)", quantity: 1, rate: 7_400_000 } },
    },
  });
  await prisma.invoice.create({
    data: {
      number: `INV-${new Date().getFullYear()}-0002`,
      clientId: metro.id,
      projectId: booking.id,
      status: "SENT",
      currency: "NGN",
      issueDate: daysFromNow(-30),
      dueDate: daysFromNow(-16),
      sentAt: daysFromNow(-30),
      vatRate: 7.5,
      items: { create: { position: 1, description: "Patient booking platform: Design (20% of contract)", quantity: 1, rate: 3_700_000 } },
    },
  });
  await prisma.invoice.create({
    data: {
      number: `INV-${new Date().getFullYear()}-0003`,
      clientId: atlas.id,
      projectId: fleet.id,
      status: "PAID",
      currency: "USD",
      issueDate: daysFromNow(-95),
      dueDate: daysFromNow(-81),
      paidAt: daysFromNow(-85),
      paymentMethod: "Bank transfer",
      vatRate: 0,
      items: { create: { position: 1, description: "Fleet tracking dashboard: final payment", quantity: 1, rate: 14_000 } },
    },
  });

  await prisma.quoteRequest.create({
    data: {
      reference: "LDZ-482913",
      projectType: "mobile",
      currency: "NGN",
      budget: "₦5m – ₦15m",
      timeline: "Within 3 months",
      features: ["User accounts", "Payments", "Push notifications"],
      details: "We run 4 gyms in Lagos and want members to book classes and pay for memberships in an app.",
      name: "Daniel Okoro",
      email: "daniel@fitzone.example",
      company: "FitZone Gyms",
      sourcePath: "/services/mobile-apps",
    },
  });
  await prisma.email.create({
    data: { direction: "OUTBOUND", category: "PROJECT_UPDATE", status: "SENT", subject: "Patient booking platform: designs approved", body: "Hi Funmi,\n\nThanks for approving the designs. We’ve started the build and will share a staging link next week.\n\nKind regards,\nTobi", fromAddress: "Ledobiz Technologies <hello@ledobiz.com>", toAddress: "funmi@metroeyes.example", clientId: metro.id, projectId: booking.id, sentById: lead.id, createdAt: daysFromNow(-33) },
  });
  console.log("Demo data added.");
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
