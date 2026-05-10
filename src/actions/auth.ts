"use server";

import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { SESSION_COOKIE, SESSION_DAYS } from "@/lib/auth";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(80),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function safeNextPath(raw: unknown) {
  const path = typeof raw === "string" ? raw : "";
  if (!path.startsWith("/") || path.startsWith("//")) return "/dashboard";
  return path;
}

async function setSessionCookie(userId: string) {
  const token = nanoid(48);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DAYS);
  await db.session.create({
    data: { userId, token, expiresAt },
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function signupAction(_prev: unknown, formData: FormData) {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { error: "Please enter a valid email, name, and password (8+ chars)." };
  }
  const { email, password, name } = parsed.data;
  const exists = await db.user.findUnique({ where: { email } });
  if (exists) return { error: "An account with this email already exists." };
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await db.user.create({
    data: { email, passwordHash, name },
  });
  await setSessionCookie(user.id);
  redirect(safeNextPath(formData.get("next")));
}

export async function loginAction(_prev: unknown, formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Enter a valid email and password." };
  }
  const { email, password } = parsed.data;
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "Invalid email or password." };
  }
  await setSessionCookie(user.id);
  redirect(safeNextPath(formData.get("next")));
}

export async function logoutAction() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { token } });
  }
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
