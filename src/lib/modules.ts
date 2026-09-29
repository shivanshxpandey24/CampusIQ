import { Module, Role } from "@prisma/client";

export const moduleInfo: Record<Module, { label: string; description: string; icon: string }> = {
  STUDENTS: { label: "Student lifecycle", description: "Admissions, enrollment and student profiles", icon: "◉" },
  ACADEMICS: { label: "Academics", description: "Courses, faculty and academic progress", icon: "▤" },
  ATTENDANCE: { label: "Attendance", description: "Daily class attendance and participation", icon: "✓" },
  TIMETABLE: { label: "Timetable", description: "Class schedules, rooms and faculty", icon: "▦" },
  FEES: { label: "Fees & finance", description: "Invoices, payments and outstanding balances", icon: "₹" },
  HOSTEL: { label: "Hostel", description: "Room allocations and residential requests", icon: "⌂" },
  TRANSPORT: { label: "Transport", description: "Routes, stops, fleet and service notices", icon: "⇢" },
  CERTIFICATES: { label: "Certificates", description: "Request, review and issue documents", icon: "▧" },
  HELPDESK: { label: "Helpdesk", description: "Support tickets and service requests", icon: "?" },
  NOTIFICATIONS: { label: "Notifications", description: "Campus announcements and messages", icon: "◌" },
  REPORTS: { label: "Reports & analytics", description: "Live operational summaries for your campus", icon: "▥" },
};

const all = Object.keys(moduleInfo) as Module[];
export const allowedModules: Record<Role, Module[]> = {
  SUPER_ADMIN: all,
  COLLEGE_ADMIN: all,
  FACULTY: ["STUDENTS", "ACADEMICS", "ATTENDANCE", "TIMETABLE", "CERTIFICATES", "HELPDESK", "NOTIFICATIONS", "REPORTS"],
  STUDENT: ["ACADEMICS", "ATTENDANCE", "TIMETABLE", "FEES", "HOSTEL", "TRANSPORT", "CERTIFICATES", "HELPDESK", "NOTIFICATIONS"],
  PARENT: ["ATTENDANCE", "FEES", "TIMETABLE", "TRANSPORT", "CERTIFICATES", "HELPDESK", "NOTIFICATIONS"],
  HOSTEL_WARDEN: ["HOSTEL", "STUDENTS", "HELPDESK", "NOTIFICATIONS", "REPORTS"],
  TRANSPORT_MANAGER: ["TRANSPORT", "STUDENTS", "HELPDESK", "NOTIFICATIONS", "REPORTS"],
  ACCOUNTANT: ["FEES", "STUDENTS", "NOTIFICATIONS", "REPORTS"],
  HELPDESK_STAFF: ["HELPDESK", "NOTIFICATIONS", "REPORTS"],
};

const writers: Record<Module, Role[]> = {
  STUDENTS: ["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY", "HOSTEL_WARDEN", "TRANSPORT_MANAGER"],
  ACADEMICS: ["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"],
  ATTENDANCE: ["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"],
  TIMETABLE: ["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"],
  FEES: ["SUPER_ADMIN", "COLLEGE_ADMIN", "ACCOUNTANT"],
  HOSTEL: ["SUPER_ADMIN", "COLLEGE_ADMIN", "HOSTEL_WARDEN"],
  TRANSPORT: ["SUPER_ADMIN", "COLLEGE_ADMIN", "TRANSPORT_MANAGER"],
  CERTIFICATES: ["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY", "HELPDESK_STAFF"],
  HELPDESK: ["SUPER_ADMIN", "COLLEGE_ADMIN", "HELPDESK_STAFF", "FACULTY", "STUDENT", "PARENT"],
  NOTIFICATIONS: ["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY", "HELPDESK_STAFF"],
  REPORTS: [],
};

export function canAccessModule(role: Role, module: Module) {
  return allowedModules[role].includes(module);
}

export function canWriteModule(role: Role, module: Module) {
  return writers[module].includes(role);
}

export function toModule(value: string): Module | undefined {
  return (all as string[]).includes(value) ? (value as Module) : undefined;
}
