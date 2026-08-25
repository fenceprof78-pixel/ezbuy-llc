import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { users, type User } from "@/db/schema";
import { getSessionUser, can, ROLES } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { json, fail, body } from "@/lib/api";

export const dynamic = "force-dynamic";

const strip = (u: User) => ({ id: u.id, name: u.name, email: u.email, role: u.role, active: u.active, createdAt: u.createdAt });

export async function GET() {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401);
  if (!can(user, "users.manage")) return fail("Admin access required", 403);
  const rows = await db.select().from(users).orderBy(asc(users.name));
  return json({ users: rows.map(strip) });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401);
  if (!can(user, "users.manage")) return fail("Admin access required", 403);

  const b = await body<Record<string, any>>(req);
  const name = String(b.name ?? "").trim();
  const email = String(b.email ?? "").trim().toLowerCase();
  const password = String(b.password ?? "");
  const role = String(b.role ?? "SALES").toUpperCase();

  if (!name || !email || !password) return fail("Name, email and password are required");
  if (!ROLES.includes(role as any)) return fail("Invalid role");

  const [dup] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (dup) return fail("A user with this email already exists");

  const [row] = await db
    .insert(users)
    .values({ name, email, passwordHash: hashPassword(password), role: role as any })
    .returning();
  return json({ user: strip(row) }, 201);
}

export async function PUT(req: Request) {
  const user = await getSessionUser();
  if (!user) return fail("Unauthorized", 401);
  if (!can(user, "users.manage")) return fail("Admin access required", 403);

  const b = await body<Record<string, any>>(req);
  const id = Number(b.id);
  if (!id) return fail("ID is required");
  const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!target) return fail("User not found", 404);

  const role = String(b.role ?? target.role).toUpperCase();
  if (!ROLES.includes(role as any)) return fail("Invalid role");

  // Prevent an admin from deactivating or demoting themselves
  if (id === user.id && (role !== "ADMIN" || b.active === false)) {
    return fail("You cannot demote or deactivate your own account", 400);
  }

  const [row] = await db
    .update(users)
    .set({
      name: b.name ? String(b.name) : target.name,
      role: role as any,
      active: b.active !== undefined ? Boolean(b.active) : target.active,
    })
    .where(eq(users.id, id))
    .returning();
  return json({ user: strip(row) });
}
