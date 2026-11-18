import type { EventDetails } from "../options";
import type { AnalyzeResponse, GenerateRequest, GenerateResponse, InputImage } from "../schema";
import { postJSON } from "./api";
import { chooseImageProvider, type AppSettings } from "./settings";

// Where the AI work happens:
// - web app: on the server, via /api routes (keys stay on the server)
// - Android app: directly from the phone with the user's own keys

export interface Backend {
  analyze(image: InputImage, details: EventDetails): Promise<AnalyzeResponse>;
  generate(req: GenerateRequest): Promise<GenerateResponse>;
}

export function serverBackend(passcode: string): Backend {
  return {
    analyze: (image, details) => postJSON<AnalyzeResponse>("/api/analyze", { image, details }, passcode),
    generate: (req) => postJSON<GenerateResponse>("/api/generate", req, passcode),
  };
}

export function deviceBackend(settings: AppSettings): Backend {
  // Loaded on demand so the web app's bundle doesn't include the AI SDK.
  const service = () => import("../ai/service");
  return {
    async analyze(image, details) {
      const key = settings.anthropicKey.trim();
      const { analyzeSpace } = await service();
      return analyzeSpace(image, details, key ? { apiKey: key, browser: true } : null);
    },
    async generate(req) {
      const provider = chooseImageProvider(settings);
      const { renderAfterPhoto } = await service();
      if (!provider) return renderAfterPhoto(req, null);
      const apiKey = (provider === "gemini" ? settings.geminiKey : settings.openaiKey).trim();
      return renderAfterPhoto(req, { provider, apiKey, settingsHint: { model: "a different image model" } });
    },
  };
}
