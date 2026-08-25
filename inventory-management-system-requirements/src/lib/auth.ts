import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, type User } from "@/db/schema";

const SECRET = process.env.SESSION_SECRET || "ezbuy-dev-secret-change-me";
const COOKIE_NAME = "ezbuy_session";
const SESSION_DAYS = 7;

type SessionPayload = { userId: number; exp: number };

function sign(data: string): string {
  return createHmac("sha256", SECRET).update(data).digest("base64url");
}

export function createSessionToken(userId: number): string {
  const payload = Buffer.from(
    JSON.stringify({ userId, exp: Date.now() + SESSION_DAYS * 24 * 3600 * 1000 }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string): number | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as SessionPayload;
    if (data.exp < Date.now()) return null;
    return data.userId;
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const userId = verifySessionToken(token);
  if (!userId) return null;
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user || !user.active) return null;
  return user;
}

export async function setSessionCookie(userId: number) {
  const store = await cookies();
  store.set(COOKIE_NAME, createSessionToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 3600,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
}

// ─── Role-based permissions ───────────────────────────────────────────────────

export const ROLES = ["ADMIN", "MANAGER", "SALES", "INVENTORY", "ACCOUNTANT"] as const;

const PERMISSIONS: Record<string, string[]> = {
  "products.manage": ["ADMIN", "MANAGER", "INVENTORY"],
  "catalog.manage": ["ADMIN", "MANAGER"],
  "contacts.manage": ["ADMIN", "MANAGER"],
  "warehouses.manage": ["ADMIN", "MANAGER"],
  "inventory.manage": ["ADMIN", "MANAGER", "INVENTORY"],
  "sales.manage": ["ADMIN", "MANAGER", "SALES", "ACCOUNTANT"],
  "purchases.manage": ["ADMIN", "MANAGER", "ACCOUNTANT", "INVENTORY"],
  "reports.view": ["ADMIN", "MANAGER", "ACCOUNTANT"],
  "users.manage": ["ADMIN"],
};

export function can(user: User, permission: string): boolean {
  return PERMISSIONS[permission]?.includes(user.role) ?? false;
}

export function publicUser(user: User) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}
