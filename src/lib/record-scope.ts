import { Module, Role } from "@prisma/client";

type PersonalRecord = {
  title: string;
  createdById: string | null;
  fields: unknown;
};

const studentPrivateModules: Module[] = ["ATTENDANCE", "FEES", "HOSTEL", "CERTIFICATES"];

export function isPersonalRecordVisible(
  record: PersonalRecord,
  module: Module,
  user: { id: string; role: Role },
  studentName: string | null,
) {
  if (user.role !== "STUDENT" && user.role !== "PARENT") return true;
  if (module === "HELPDESK") return record.createdById === user.id;
  if (!studentPrivateModules.includes(module)) return true;
  if (record.createdById === user.id) return true;
  if (!studentName) return false;
  const fields = record.fields && typeof record.fields === "object" ? record.fields as Record<string, unknown> : {};
  const target = studentName.toLocaleLowerCase();
  return record.title.toLocaleLowerCase().includes(target)
    || (typeof fields.student === "string" && fields.student.toLocaleLowerCase() === target);
}
