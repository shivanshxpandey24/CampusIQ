import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { db } from "@/lib/db";

const COOKIE_NAME = "campusiq_session";
const secret = () => {
  const value = process.env.AUTH_SECRET;
  if (process.env.NODE_ENV === "production" && (!value || value.length < 32)) {
    throw new Error("AUTH_SECRET must be at least 32 characters in production.");
  }
  return new TextEncoder().encode(value || "local-development-only-change-this-secret");
};

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret());
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 8 * 60 * 60,
  });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE_NAME);
}

export async function currentUser() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  const signingKey = secret();
  let userId: string;
  try {
    const { payload } = await jwtVerify(token, signingKey);
    if (!payload.sub) return null;
    userId = payload.sub;
  } catch {
    return null;
  }
  return db.user.findUnique({
    where: { id: userId },
    select: { id: true, campusId: true, name: true, email: true, role: true },
  });
}
