import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canAccessModule, canWriteModule, toModule } from "@/lib/modules";
import { recordSchema } from "@/lib/validation";
import { isPersonalRecordVisible } from "@/lib/record-scope";
import { Prisma } from "@prisma/client";

type Context = { params: Promise<{ module: string }> };

export async function GET(_request: Request, context: Context) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const workspaceModule = toModule((await context.params).module);
  if (!workspaceModule) return NextResponse.json({ error: "Unknown workspace." }, { status: 404 });
  if (!canAccessModule(user.role, workspaceModule)) return NextResponse.json({ error: "You do not have access to this workspace." }, { status: 403 });
  const records = await db.campusRecord.findMany({
    where: { campusId: user.campusId, module: workspaceModule },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  const studentProfile = user.role === "STUDENT"
    ? await db.student.findUnique({ where: { userId: user.id }, include: { user: { select: { name: true } } } })
    : user.role === "PARENT"
      ? await db.student.findFirst({ where: { parentEmail: user.email }, include: { user: { select: { name: true } } } })
      : null;
  const visible = records.filter(row => isPersonalRecordVisible(row, workspaceModule, user, studentProfile?.user.name ?? null));
  return NextResponse.json({ records: visible.map(row => ({ ...row, amount: row.amount?.toString() ?? null, dueDate: row.dueDate?.toISOString() ?? null, createdAt: row.createdAt.toISOString() })) });
}

export async function POST(request: Request, context: Context) {
  return mutate(request, context, "create");
}

export async function PATCH(request: Request, context: Context) {
  return mutate(request, context, "update");
}

async function mutate(request: Request, context: Context, action: "create" | "update") {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const workspaceModule = toModule((await context.params).module);
  if (!workspaceModule) return NextResponse.json({ error: "Unknown workspace." }, { status: 404 });
  if (!canWriteModule(user.role, workspaceModule)) return NextResponse.json({ error: "You do not have permission to change this workspace." }, { status: 403 });
  const parsed = recordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid record." }, { status: 400 });
  const data = {
    title: parsed.data.title,
    description: parsed.data.description,
    status: parsed.data.status,
    amount: parsed.data.amount == null ? null : new Prisma.Decimal(parsed.data.amount),
    dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
    fields: parsed.data.fields,
  };
  const id = new URL(request.url).searchParams.get("id");
  if (action === "update") {
    if (!id) return NextResponse.json({ error: "Record ID is required." }, { status: 400 });
    const existing = await db.campusRecord.findFirst({ where: { id, campusId: user.campusId, module: workspaceModule } });
    if (!existing) return NextResponse.json({ error: "Record not found." }, { status: 404 });
    const record = await db.campusRecord.update({ where: { id: existing.id }, data });
    return NextResponse.json({ record: { ...record, amount: record.amount?.toString() ?? null, dueDate: record.dueDate?.toISOString() ?? null, createdAt: record.createdAt.toISOString() } });
  }
  const record = await db.campusRecord.create({ data: { ...data, campusId: user.campusId, module: workspaceModule, createdById: user.id } });
  return NextResponse.json({ record: { ...record, amount: record.amount?.toString() ?? null, dueDate: record.dueDate?.toISOString() ?? null, createdAt: record.createdAt.toISOString() } }, { status: 201 });
}

export async function DELETE(request: Request, context: Context) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const workspaceModule = toModule((await context.params).module);
  if (!workspaceModule) return NextResponse.json({ error: "Unknown workspace." }, { status: 404 });
  if (!canWriteModule(user.role, workspaceModule)) return NextResponse.json({ error: "You do not have permission to change this workspace." }, { status: 403 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Record ID is required." }, { status: 400 });
  const existing = await db.campusRecord.findFirst({ where: { id, campusId: user.campusId, module: workspaceModule }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Record not found." }, { status: 404 });
  await db.campusRecord.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
