import { PrismaClient, Role, Module } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const demoUsers = [
  ["Platform Admin", "superadmin@campusiq.demo", Role.SUPER_ADMIN],
  ["Campus Admin", "admin@campusiq.demo", Role.COLLEGE_ADMIN],
  ["Aarav Sharma", "student@campusiq.demo", Role.STUDENT],
  ["Mira Patel", "faculty@campusiq.demo", Role.FACULTY],
  ["Ravi Sharma", "parent@campusiq.demo", Role.PARENT],
  ["Warden Mehta", "warden@campusiq.demo", Role.HOSTEL_WARDEN],
  ["Transport Desk", "transport@campusiq.demo", Role.TRANSPORT_MANAGER],
  ["Finance Team", "accounts@campusiq.demo", Role.ACCOUNTANT],
  ["Helpdesk Team", "helpdesk@campusiq.demo", Role.HELPDESK_STAFF],
] as const;

const sampleRecords: Array<{
  module: Module;
  title: string;
  description: string;
  status: string;
  amount?: number;
  fields?: Record<string, string>;
}> = [
  { module: Module.STUDENTS, title: "Aarav Sharma · CS-2026-001", description: "Computer Science · Year 2", status: "Enrolled", fields: { program: "Computer Science", year: "2", email: "student@campusiq.demo" } },
  { module: Module.STUDENTS, title: "Anaya Rao · CS-2026-002", description: "Computer Science · Year 1", status: "Application review", fields: { program: "Computer Science", year: "1", email: "anaya@example.edu" } },
  { module: Module.ACADEMICS, title: "Data Structures · CS201", description: "Faculty: Mira Patel · Semester 3", status: "Active", fields: { faculty: "Mira Patel", room: "Block A · 204" } },
  { module: Module.ATTENDANCE, title: "CS201 · 2nd year", description: "Lecture attendance · 28 students present", status: "Recorded", fields: { date: "2026-09-29", attendance: "93%", faculty: "Mira Patel" } },
  { module: Module.ATTENDANCE, title: "Attendance · Aarav Sharma", description: "CS201 · Present for today's lecture", status: "Recorded", fields: { student: "Aarav Sharma", date: "2026-09-29", attendance: "Present" } },
  { module: Module.TIMETABLE, title: "Monday · 10:00–11:00", description: "Data Structures · Block A 204", status: "Scheduled", fields: { class: "CS201", faculty: "Mira Patel" } },
  { module: Module.FEES, title: "Tuition · Aarav Sharma", description: "Semester 3 tuition invoice", status: "Due", amount: 42500, fields: { student: "Aarav Sharma", term: "Semester 3", due: "2026-10-15" } },
  { module: Module.HOSTEL, title: "Room B-214 · Aarav Sharma", description: "North Hall · Double occupancy", status: "Allocated", fields: { building: "North Hall", room: "B-214" } },
  { module: Module.TRANSPORT, title: "Route 04 · University Loop", description: "Driver: S. Kumar · 32 seats", status: "On route", fields: { stops: "Central Park, Library, North Gate", capacity: "32" } },
  { module: Module.CERTIFICATES, title: "Bonafide certificate · Aarav Sharma", description: "Requested by student", status: "Pending review", fields: { type: "Bonafide", requestedBy: "Aarav Sharma" } },
  { module: Module.HELPDESK, title: "Projector issue · Room A-204", description: "Classroom AV equipment needs attention", status: "In progress", fields: { priority: "Normal", assignee: "Facilities" } },
  { module: Module.NOTIFICATIONS, title: "Mid-semester exams begin Oct 12", description: "Timetables are available in Academics.", status: "Published", fields: { audience: "All students", date: "2026-10-12" } },
];

async function main() {
  const campus = await prisma.campus.upsert({
    where: { slug: "northstar-university" },
    update: {},
    create: { name: "Northstar University", slug: "northstar-university" },
  });
  const passwordHash = await bcrypt.hash("CampusIQ2026!", 12);
  const users = new Map<string, string>();
  for (const [name, email, role] of demoUsers) {
    const user = await prisma.user.upsert({
      where: { campusId_email: { campusId: campus.id, email } },
      update: { name, role, passwordHash },
      create: { campusId: campus.id, name, email, role, passwordHash },
    });
    users.set(email, user.id);
  }
  const studentUserId = users.get("student@campusiq.demo")!;
  await prisma.student.upsert({
    where: { userId: studentUserId },
    update: {},
    create: { userId: studentUserId, studentNumber: "CS-2026-001", program: "Computer Science", year: 2, parentEmail: "parent@campusiq.demo" },
  });
  for (const record of sampleRecords) {
    const exists = await prisma.campusRecord.findFirst({
      where: { campusId: campus.id, module: record.module, title: record.title },
    });
    if (!exists) {
      await prisma.campusRecord.create({
        data: {
          ...record,
          campusId: campus.id,
          amount: record.amount,
          fields: record.fields ?? {},
          createdById: users.get("admin@campusiq.demo"),
        },
      });
    }
  }
  console.log(`Seeded ${campus.name}; demo password: CampusIQ2026!`);
}

main().finally(() => prisma.$disconnect());
