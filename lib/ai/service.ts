import { demoDesign } from "../demo";
import type { EventDetails } from "../options";
import { buildImageEditPrompt, buildRefinePrompt } from "../prompts";
import type { AnalyzeResponse, GenerateRequest, GenerateResponse, InputImage } from "../schema";
import { designSpace, type DesignerConfig } from "./designer";
import { generateImage, type ImageConfig } from "./images";

// The two things the app does, shared by the web server's API routes and the
// Android app (which calls the AI services directly with the user's own keys).
// A null config means "no key yet": the app then shows demo results.

export async function analyzeSpace(
  image: InputImage,
  details: EventDetails,
  designer: DesignerConfig | null,
): Promise<AnalyzeResponse> {
  if (!designer) {
    await new Promise((r) => setTimeout(r, 1200)); // let the loading screen show briefly
    return { design: demoDesign(details.event), demo: true };
  }
  return { design: await designSpace(image, details, designer), demo: false };
}

export async function renderAfterPhoto(req: GenerateRequest, images: ImageConfig | null): Promise<GenerateResponse> {
  if (!images) return { demo: true };
  const prompt = req.mode === "refine" ? buildRefinePrompt(req.prompt) : buildImageEditPrompt(req.prompt);
  const result = await generateImage(req.image, prompt, req.aspect, images);
  return { demo: false, image: result.dataUrl, provider: result.provider, model: result.model };
}
