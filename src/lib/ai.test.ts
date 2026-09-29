import { afterEach, describe, expect, it, vi } from "vitest";
import { askCampusAssistant } from "@/lib/ai";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("CampusIQ assistant provider", () => {
  it("returns a local response without sending prompts when no API key is configured", async () => {
    vi.stubEnv("AI_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const answer = await askCampusAssistant("How can attendance improve?");

    expect(answer).toContain("Your prompt was not sent to an external service.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends requests to the configured OpenAI-compatible endpoint with a bearer key", async () => {
    vi.stubEnv("AI_API_KEY", "test-provider-key");
    vi.stubEnv("AI_BASE_URL", "https://ai.example/v1/");
    vi.stubEnv("AI_MODEL", "campus-model");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: "Review the daily attendance trend." } }],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const answer = await askCampusAssistant("How can attendance improve?");
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(answer).toBe("Review the daily attendance trend.");
    expect(url).toBe("https://ai.example/v1/chat/completions");
    expect((options.headers as Record<string, string>).Authorization).toBe("Bearer test-provider-key");
    expect(JSON.parse(String(options.body)).model).toBe("campus-model");
  });
});
