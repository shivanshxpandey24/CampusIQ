import { describe, expect, it } from "vitest";
import { canAccessModule, canWriteModule, toModule } from "@/lib/modules";
import { isPersonalRecordVisible } from "@/lib/record-scope";

describe("CampusIQ role policies", () => {
  it("lets accountants manage fees but not academic records", () => {
    expect(canAccessModule("ACCOUNTANT", "FEES")).toBe(true);
    expect(canWriteModule("ACCOUNTANT", "FEES")).toBe(true);
    expect(canAccessModule("ACCOUNTANT", "ACADEMICS")).toBe(false);
  });

  it("lets students submit helpdesk tickets without changing their fee records", () => {
    expect(canWriteModule("STUDENT", "HELPDESK")).toBe(true);
    expect(canAccessModule("STUDENT", "HELPDESK")).toBe(true);
    expect(canWriteModule("STUDENT", "FEES")).toBe(false);
  });

  it("rejects unknown module names", () => {
    expect(toModule("ROOT")).toBeUndefined();
    expect(toModule("ATTENDANCE")).toBe("ATTENDANCE");
  });

  it("limits private student records to the linked family", () => {
    const parent = { id: "parent-1", role: "PARENT" as const };
    expect(isPersonalRecordVisible(
      { title: "Tuition · Aarav Sharma", createdById: "admin", fields: { student: "Aarav Sharma" } },
      "FEES",
      parent,
      "Aarav Sharma",
    )).toBe(true);
    expect(isPersonalRecordVisible(
      { title: "Tuition · Other Student", createdById: "admin", fields: { student: "Other Student" } },
      "FEES",
      parent,
      "Aarav Sharma",
    )).toBe(false);
  });
});
