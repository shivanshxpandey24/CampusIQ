export async function askCampusAssistant(prompt: string) {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    return `CampusIQ demo insight: “${prompt}”\n\nConnect an OpenAI-compatible provider using AI_BASE_URL, AI_API_KEY, and AI_MODEL to enable generated answers. Your prompt was not sent to an external service.`;
  }
  const baseUrl = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.AI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are CampusIQ, a concise campus operations assistant. Do not claim to access data not included in the conversation." },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`AI provider returned ${response.status}`);
  const result = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  return result.choices?.[0]?.message?.content?.trim() || "The AI provider returned an empty response.";
}
