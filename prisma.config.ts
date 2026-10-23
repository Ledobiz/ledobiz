import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// Same files Next.js reads, so DATABASE_URL lives in one place (.env.local wins).
config({ path: [".env.local", ".env"], quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
