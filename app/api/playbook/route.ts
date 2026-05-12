import { NextResponse } from "next/server";
import { z } from "zod";
import { generatePlaybookJson } from "@/lib/gemini";
import { buildPlaybookPrompt } from "@/lib/prompts";
import { PlaybookSchema } from "@/types/playbook";
import { MOCK_PLAYBOOK } from "@/lib/mock-playbook";

const RequestSchema = z.object({
  inputs: z.record(z.any()),
  summary: z.record(z.any()),
  mock: z.boolean().optional(),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request shape", issues: parsed.error.issues }, { status: 400 });
  }

  // Mock path: ?mock=1 query OR body.mock OR no API key configured
  const url = new URL(req.url);
  const mockQuery = url.searchParams.get("mock") === "1";
  if (parsed.data.mock || mockQuery || !process.env.GEMINI_API_KEY) {
    return NextResponse.json({ playbook: MOCK_PLAYBOOK, source: "mock" });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prompt = buildPlaybookPrompt(parsed.data.inputs as any, parsed.data.summary as any);
    const raw = await generatePlaybookJson(prompt);
    const validated = PlaybookSchema.safeParse(raw);
    if (!validated.success) {
      return NextResponse.json(
        { error: "LLM response failed validation", issues: validated.error.issues, raw },
        { status: 502 },
      );
    }
    return NextResponse.json({ playbook: validated.data, source: "llm" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "Playbook generation failed", message }, { status: 500 });
  }
}
