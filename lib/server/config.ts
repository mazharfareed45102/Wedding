import { EFFORTS, type DesignerConfig, type Effort } from "../ai/designer";
import type { ImageConfig } from "../ai/images";

// Reads the web server's AI settings from environment variables.

export function serverDesignerConfig(): DesignerConfig | null {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) return null;
  const effort = process.env.DESIGNER_EFFORT as Effort;
  return {
    // apiKey omitted: the Anthropic SDK reads ANTHROPIC_API_KEY itself.
    model: process.env.DESIGNER_MODEL || undefined,
    effort: EFFORTS.includes(effort) ? effort : "medium",
  };
}

export function serverImageConfig(): ImageConfig | null {
  const gemini = process.env.GEMINI_API_KEY;
  const openai = process.env.OPENAI_API_KEY;
  const preferred = process.env.IMAGE_PROVIDER?.toLowerCase();
  const useOpenAI = openai && (preferred === "openai" || !gemini);
  if (useOpenAI) {
    return {
      provider: "openai",
      apiKey: openai,
      model: process.env.OPENAI_IMAGE_MODEL,
      quality: process.env.OPENAI_IMAGE_QUALITY,
      baseUrl: process.env.OPENAI_API_BASE,
      settingsHint: { model: "OPENAI_IMAGE_MODEL" },
    };
  }
  if (gemini) {
    return {
      provider: "gemini",
      apiKey: gemini,
      model: process.env.GEMINI_IMAGE_MODEL,
      baseUrl: process.env.GEMINI_API_BASE,
      settingsHint: { model: "GEMINI_IMAGE_MODEL" },
    };
  }
  return null;
}
