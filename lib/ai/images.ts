import { HttpError } from "../errors";
import type { ImageProvider, InputImage } from "../schema";

// Turns the original photo + an edit instruction into the decorated "after" photo.
// Supports Google Gemini image models and OpenAI GPT Image. Runs on the server
// (web app) or directly on the phone (Android app). Model names change often,
// so each provider tries a short list and skips models the key can't use.

export interface ImageConfig {
  provider: ImageProvider;
  apiKey: string;
  /** Preferred model; the defaults are tried after it. */
  model?: string;
  /** OpenAI only: low | medium | high */
  quality?: string;
  /** Override the API host, e.g. for an API gateway or local testing. */
  baseUrl?: string;
  /** Where the user changes settings, used in error messages. */
  settingsHint?: { model: string };
}

export interface GeneratedImage {
  dataUrl: string;
  provider: ImageProvider;
  model: string;
}

export async function generateImage(
  image: InputImage,
  prompt: string,
  aspect: number,
  cfg: ImageConfig,
): Promise<GeneratedImage> {
  if (cfg.provider === "gemini") return generateWithGemini(image, prompt, aspect, cfg);
  return generateWithOpenAI(image, prompt, aspect, cfg);
}

function candidates(preferred: string | undefined, defaults: string[]) {
  return [...new Set([preferred?.trim(), ...defaults].filter((m): m is string => Boolean(m)))];
}

function base64ToBytes(b64: string) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

class ModelUnavailable extends Error {}

// Models this server has already found missing, so later requests skip them.
const unavailable = new Set<string>();

async function tryModels(models: string[], run: (model: string) => Promise<string>, cfg: ImageConfig) {
  const { provider } = cfg;
  const usable = models.filter((m) => !unavailable.has(`${provider}:${m}`));
  for (const model of usable.length ? usable : models) {
    try {
      return { dataUrl: await run(model), provider, model };
    } catch (error) {
      if (error instanceof ModelUnavailable) {
        unavailable.add(`${provider}:${model}`);
        continue;
      }
      if (error instanceof Error && error.name === "TimeoutError") {
        throw new HttpError(504, "The picture took too long to create. Please try again.");
      }
      if (error instanceof TypeError) {
        throw new HttpError(503, `Couldn't reach the ${provider} image service. Check your internet connection.`);
      }
      throw error;
    }
  }
  throw new HttpError(
    500,
    `None of these ${provider} image models are available to your API key: ${models.join(", ")}. Set ${
      cfg.settingsHint?.model ?? "the image model"
    } to a model your account can use.`,
  );
}

function looksLikeMissingModel(status: number, message: string) {
  return status === 404 || /model.*(not found|does not exist|not supported|unknown|invalid)|(not found|unknown|invalid).*model/i.test(message);
}

function statusToError(status: number, message: string, provider: string) {
  if (status === 401 || status === 403) return new HttpError(500, `The ${provider} API key is invalid or lacks access. (${message})`);
  if (status === 429) return new HttpError(429, `The ${provider} image service is rate-limited or out of credit. Please try again later. (${message})`);
  if (status >= 500) return new HttpError(503, `The ${provider} image service is temporarily unavailable. Please try again.`);
  return new HttpError(502, `The ${provider} image service returned an error: ${message}`);
}

// ---------- Google Gemini ----------

const GEMINI_RATIOS: [string, number][] = [
  ["1:1", 1],
  ["4:5", 4 / 5],
  ["5:4", 5 / 4],
  ["3:4", 3 / 4],
  ["4:3", 4 / 3],
  ["2:3", 2 / 3],
  ["3:2", 3 / 2],
  ["9:16", 9 / 16],
  ["16:9", 16 / 9],
  ["21:9", 21 / 9],
];

function closestRatio(aspect: number) {
  return GEMINI_RATIOS.reduce((best, cur) =>
    Math.abs(Math.log(cur[1] / aspect)) < Math.abs(Math.log(best[1] / aspect)) ? cur : best,
  )[0];
}

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType?: string; data?: string };
  inline_data?: { mime_type?: string; data?: string };
}

async function generateWithGemini(image: InputImage, prompt: string, aspect: number, cfg: ImageConfig) {
  const base = (cfg.baseUrl || "https://generativelanguage.googleapis.com").replace(/\/$/, "");
  const models = candidates(cfg.model, [
    "gemini-3.1-flash-image",
    "gemini-3.1-flash-image-preview",
    "gemini-3-pro-image-preview",
    "gemini-2.5-flash-image",
  ]);
  return tryModels(
    models,
    async (model) => {
      const res = await fetch(
        `${base}/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": cfg.apiKey },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ inline_data: { mime_type: image.mediaType, data: image.data } }, { text: prompt }],
              },
            ],
            generationConfig: {
              responseModalities: ["TEXT", "IMAGE"],
              imageConfig: { aspectRatio: closestRatio(aspect) },
            },
          }),
          signal: AbortSignal.timeout(170_000),
        },
      );
      const body = (await res.json().catch(() => ({}))) as {
        error?: { message?: string };
        candidates?: { content?: { parts?: GeminiPart[] }; finishReason?: string }[];
        promptFeedback?: { blockReason?: string };
      };
      if (!res.ok) {
        const message = body.error?.message ?? res.statusText;
        if (looksLikeMissingModel(res.status, message)) throw new ModelUnavailable(message);
        throw statusToError(res.status, message, "Gemini");
      }
      for (const part of body.candidates?.[0]?.content?.parts ?? []) {
        const inline = part.inlineData ?? (part.inline_data && { mimeType: part.inline_data.mime_type, data: part.inline_data.data });
        if (inline?.data) return `data:${inline.mimeType ?? "image/png"};base64,${inline.data}`;
      }
      const reason = body.promptFeedback?.blockReason ?? body.candidates?.[0]?.finishReason;
      throw new HttpError(
        422,
        `The image model didn't return a picture${reason ? ` (${reason})` : ""}. Try generating again, or try a different photo.`,
      );
    },
    cfg,
  );
}

// ---------- OpenAI GPT Image ----------

function openAISize(aspect: number) {
  if (aspect > 1.15) return "1536x1024";
  if (aspect < 0.87) return "1024x1536";
  return "1024x1024";
}

async function generateWithOpenAI(image: InputImage, prompt: string, aspect: number, cfg: ImageConfig) {
  const base = (cfg.baseUrl || "https://api.openai.com").replace(/\/$/, "");
  const models = candidates(cfg.model, ["gpt-image-2", "gpt-image-1.5", "gpt-image-1"]);
  const quality = cfg.quality || "medium";
  const bytes = base64ToBytes(image.data);
  const ext = image.mediaType.split("/")[1];
  return tryModels(
    models,
    async (model) => {
      const form = new FormData();
      form.append("model", model);
      form.append("prompt", prompt);
      form.append("image", new Blob([bytes], { type: image.mediaType }), `home.${ext}`);
      form.append("size", openAISize(aspect));
      form.append("quality", quality);
      form.append("n", "1");
      const res = await fetch(`${base}/v1/images/edits`, {
        method: "POST",
        headers: { authorization: `Bearer ${cfg.apiKey}` },
        body: form,
        signal: AbortSignal.timeout(170_000),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: { message?: string; code?: string };
        data?: { b64_json?: string }[];
      };
      if (!res.ok) {
        const message = body.error?.message ?? res.statusText;
        if (body.error?.code === "model_not_found" || looksLikeMissingModel(res.status, message)) {
          throw new ModelUnavailable(message);
        }
        if (body.error?.code === "moderation_blocked") {
          throw new HttpError(422, "The image model declined this request. Try a different photo or refinement.");
        }
        throw statusToError(res.status, message, "OpenAI");
      }
      const b64 = body.data?.[0]?.b64_json;
      if (!b64) throw new HttpError(502, "The image model didn't return a picture. Please try again.");
      return `data:image/png;base64,${b64}`;
    },
    cfg,
  );
}
