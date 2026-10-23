"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { endSession, startSession, verifyPassword } from "@/lib/server/auth";
import { db } from "@/lib/server/db";

export type LoginState = { error?: string; email?: string };

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
});

function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/admin") && !next.startsWith("//") ? next : "/admin";
}

export async function login(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  const email = typeof formData.get("email") === "string" ? String(formData.get("email")) : "";
  if (!parsed.success) {
    return { error: "Enter your email and password.", email };
  }

  let user: { id: string; passwordHash: string; active: boolean } | null;
  try {
    user = await db().user.findUnique({ where: { email: parsed.data.email }, select: { id: true, passwordHash: true, active: true } });
  } catch (cause) {
    console.error("Sign-in failed", cause);
    return { error: "We couldn’t reach the database. Check DATABASE_URL and try again.", email };
  }

  const valid = user !== null && user.active && (await verifyPassword(parsed.data.password, user.passwordHash));
  if (!valid || !user) {
    // Small fixed delay to slow down password guessing.
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { error: "That email and password don’t match an active account.", email };
  }

  await startSession(user.id);
  redirect(safeNext(formData.get("next")));
}

export async function logout(): Promise<void> {
  await endSession();
  redirect("/admin/login");
}
