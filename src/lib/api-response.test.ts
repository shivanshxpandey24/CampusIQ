import { describe, expect, it } from "vitest";
import { readApiResponse } from "@/lib/api-response";

describe("API response handling", () => {
  it("reports API errors without leaking JSON parse failures for empty bodies", async () => {
    await expect(readApiResponse(
      new Response(null, { status: 500 }),
      "Could not sign in",
    )).rejects.toThrow("Could not sign in (HTTP 500)");
  });

  it("uses the server's actionable JSON error when available", async () => {
    await expect(readApiResponse(
      Response.json({ error: "Database setup required." }, { status: 503 }),
      "Could not sign in",
    )).rejects.toThrow("Database setup required.");
  });
});
