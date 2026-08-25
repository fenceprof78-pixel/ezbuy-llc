import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword } from "@/lib/password";
import { getSessionUser, setSessionCookie, clearSessionCookie, publicUser } from "@/lib/auth";
import { json, fail } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401);
  return json(publicUser(user));
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const email = String(b?.email ?? "").trim().toLowerCase();
  const password = String(b?.password ?? "");
  if (!email || !password) return fail("Email and password are required");

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || !user.active || !verifyPassword(password, user.passwordHash)) {
    return fail("Invalid email or password", 401);
  }

  await setSessionCookie(user.id);
  return json(publicUser(user));
}

export async function DELETE() {
  await clearSessionCookie();
  return json({ ok: true });
}
