import { NextResponse } from "next/server";
import { buildImageEditPrompt, buildRefinePrompt } from "@/lib/prompts";
import type { GenerateResponse } from "@/lib/schema";
import { HttpError, jsonError, parseInputImage, requirePasscode, str } from "@/lib/server/http";
import { generateImage, imageProvider } from "@/lib/server/imagegen";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(req: Request) {
  try {
    requirePasscode(req);
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) throw new HttpError(400, "Invalid request.");
    const image = parseInputImage(body.image);
    const mode = body.mode === "refine" ? "refine" : "design";
    const text = str(body.prompt, mode === "refine" ? 500 : 4000).trim();
    if (!text) {
      throw new HttpError(400, mode === "refine" ? "Describe the change you'd like." : "Missing design description.");
    }
    const aspect = typeof body.aspect === "number" && body.aspect > 0.2 && body.aspect < 5 ? body.aspect : 4 / 3;

    if (!imageProvider()) {
      return NextResponse.json<GenerateResponse>({ demo: true });
    }

    const prompt = mode === "refine" ? buildRefinePrompt(text) : buildImageEditPrompt(text);
    const result = await generateImage(image, prompt, aspect);
    return NextResponse.json<GenerateResponse>({
      demo: false,
      image: result.dataUrl,
      provider: result.provider,
      model: result.model,
    });
  } catch (error) {
    return jsonError(error);
  }
}
