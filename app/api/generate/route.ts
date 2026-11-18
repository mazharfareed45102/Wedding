import { NextResponse } from "next/server";
import { renderAfterPhoto } from "@/lib/ai/service";
import type { GenerateResponse } from "@/lib/schema";
import { serverImageConfig } from "@/lib/server/config";
import { HttpError, jsonError, parseInputImage, requirePasscode, str } from "@/lib/server/http";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(req: Request) {
  try {
    requirePasscode(req);
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) throw new HttpError(400, "Invalid request.");
    const image = parseInputImage(body.image);
    const mode = body.mode === "refine" ? "refine" : "design";
    const prompt = str(body.prompt, mode === "refine" ? 500 : 4000).trim();
    if (!prompt) {
      throw new HttpError(400, mode === "refine" ? "Describe the change you'd like." : "Missing design description.");
    }
    const aspect = typeof body.aspect === "number" && body.aspect > 0.2 && body.aspect < 5 ? body.aspect : 4 / 3;
    return NextResponse.json<GenerateResponse>(await renderAfterPhoto({ image, mode, prompt, aspect }, serverImageConfig()));
  } catch (error) {
    return jsonError(error);
  }
}
