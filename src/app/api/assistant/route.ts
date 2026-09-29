import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { askCampusAssistant } from "@/lib/ai";
import { assistantSchema } from "@/lib/validation";

export async function POST(request: Request) {
  if (!(await currentUser())) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const parsed = assistantSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a question between 3 and 1000 characters." }, { status: 400 });
  try {
    return NextResponse.json({ answer: await askCampusAssistant(parsed.data.prompt) });
  } catch {
    return NextResponse.json({ error: "The AI provider is unavailable. Check the server-side AI configuration and try again." }, { status: 502 });
  }
}
