import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { allowedModules } from "@/lib/modules";
import { Module } from "@prisma/client";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  if (!allowedModules[user.role].includes(Module.REPORTS)) {
    return NextResponse.json({ error: "You do not have access to reports." }, { status: 403 });
  }
  const modules = allowedModules[user.role].filter(module => module !== Module.REPORTS);
  const [counts, statuses] = await Promise.all([
    db.campusRecord.groupBy({
      by: ["module"],
      where: { campusId: user.campusId, module: { in: modules } },
      _count: { _all: true },
    }),
    db.campusRecord.groupBy({
      by: ["module", "status"],
      where: { campusId: user.campusId, module: { in: modules } },
      _count: { _all: true },
    }),
  ]);
  const visibleModules = modules.filter(module => counts.some(row => row.module === module));
  const rows = visibleModules.map(module => ({
    module,
    count: counts.find(row => row.module === module)?._count._all ?? 0,
    statuses: statuses.filter(row => row.module === module).map(row => ({ status: row.status, count: row._count._all })),
  }));
  return NextResponse.json({ total: rows.reduce((sum, row) => sum + row.count, 0), modules: rows });
}
