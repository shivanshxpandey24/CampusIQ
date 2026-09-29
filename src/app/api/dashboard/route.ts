import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Module, Role } from "@prisma/client";
import { allowedModules } from "@/lib/modules";
import { isPersonalRecordVisible } from "@/lib/record-scope";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const modules = allowedModules[user.role];
  const sensitiveDashboard = user.role === Role.STUDENT || user.role === Role.PARENT;
  const studentProfile = user.role === Role.STUDENT
    ? await db.student.findUnique({ where: { userId: user.id }, include: { user: { select: { name: true } } } })
    : user.role === Role.PARENT
      ? await db.student.findFirst({ where: { parentEmail: user.email }, include: { user: { select: { name: true } } } })
      : null;
  const studentName = studentProfile?.user.name ?? null;
  const [campus, records, students, dueFees, openTickets, recent] = await Promise.all([
    db.campus.findUnique({ where: { id: user.campusId }, select: { name: true } }),
    db.campusRecord.count({ where: { campusId: user.campusId, module: { in: modules } } }),
    modules.includes(Module.STUDENTS) ? db.campusRecord.count({ where: { campusId: user.campusId, module: Module.STUDENTS } }) : Promise.resolve(0),
    modules.includes(Module.FEES) && !sensitiveDashboard
      ? db.campusRecord.aggregate({ where: { campusId: user.campusId, module: Module.FEES, status: { in: ["Due", "Overdue"] } }, _sum: { amount: true } })
      : Promise.resolve(null),
    modules.includes(Module.HELPDESK)
      ? db.campusRecord.count({ where: { campusId: user.campusId, module: Module.HELPDESK, status: { in: ["Open", "In progress"] }, ...(sensitiveDashboard ? { createdById: user.id } : {}) } })
      : Promise.resolve(0),
    db.campusRecord.findMany({ where: { campusId: user.campusId, module: { in: modules } }, orderBy: { createdAt: "desc" }, take: 200, select: { id: true, module: true, title: true, description: true, status: true, amount: true, dueDate: true, fields: true, createdById: true, createdAt: true } }),
  ]);
  const personalRecent = recent.filter(row => isPersonalRecordVisible(row, row.module, user, studentName)).slice(0, 5);
  return NextResponse.json({
    campus: campus?.name || "Campus",
    count: records,
    students,
    due: dueFees ? Number(dueFees._sum.amount || 0) : null,
    openTickets,
    recent: personalRecent.map(row => ({ ...row, amount: row.amount?.toString() ?? null, dueDate: row.dueDate?.toISOString() ?? null, createdAt: row.createdAt.toISOString() })),
  });
}
