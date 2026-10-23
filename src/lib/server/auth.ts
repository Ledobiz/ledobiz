import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@/generated/prisma/enums";
import { db } from "@/lib/server/db";

export const SESSION_COOKIE = "ldz_admin_session";
const SESSION_DAYS = 7;

export { hashPassword, verifyPassword } from "@/lib/server/password";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Creates a session row and sets the cookie. Call only from Server Actions or Route Handlers. */
export async function startSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db().session.create({ data: { tokenHash: hashToken(token), userId, expiresAt } });
  await db().user.update({ where: { id: userId }, data: { lastActiveAt: new Date() } });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await db().session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  store.delete(SESSION_COOKIE);
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

/** Reads and validates the session cookie. Returns null when signed out or expired. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }
  const session = await db().session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { expiresAt: true, user: { select: { id: true, name: true, email: true, role: true, active: true } } },
  });
  if (!session || session.expiresAt < new Date() || !session.user.active) {
    return null;
  }
  const { id, name, email, role } = session.user;
  return { id, name, email, role };
}

export type Area = "overview" | "quotes" | "projects" | "clients" | "finance" | "settings";

const access: Record<Role, Area[]> = {
  ADMIN: ["overview", "quotes", "projects", "clients", "finance", "settings"],
  PROJECT_LEAD: ["overview", "quotes", "projects", "clients"],
  FINANCE: ["overview", "clients", "finance"],
  MEMBER: ["overview", "projects"],
};

export function canAccess(role: Role, area: Area): boolean {
  return access[role].includes(area);
}

/**
 * Data Access Layer guard: every admin page and Server Action calls this.
 * Redirects to sign-in when signed out, and to the overview when the role can't open the area.
 */
export async function requireUser(area?: Area): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/admin/login");
  }
  if (area && !canAccess(user.role, area)) {
    redirect("/admin?denied=1");
  }
  return user;
}
