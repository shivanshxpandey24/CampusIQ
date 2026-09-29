import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  let user;
  try {
    user = await db.user.findFirst({ where: { email: parsed.data.email.toLowerCase() } });
  } catch (error) {
    console.error("CampusIQ login database query failed:", error);
    return NextResponse.json({
      error: "CampusIQ cannot connect to its database. Configure a valid DATABASE_URL, then run `npm run db:push` and `npm run db:seed`.",
    }, { status: 503 });
  }
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  }
  try {
    await createSession(user.id);
  } catch (error) {
    console.error("CampusIQ session creation failed:", error);
    return NextResponse.json({ error: "Unable to start your session. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ user: { name: user.name, role: user.role } });
}
