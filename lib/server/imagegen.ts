import { HttpError, type InputImage } from "./http";

// Turns the original photo + an edit instruction into the decorated "after" photo.
// Supports Google Gemini image models and OpenAI GPT Image. Model names change
// often, so each provider tries a short list and skips models the account
// doesn't have.

export type ImageProvider = "gemini" | "openai";

// Optional overrides, e.g. for an API gateway or local testing.
const GEMINI_BASE = (process.env.GEMINI_API_BASE || "https://generativelanguage.googleapis.com").replace(/\/$/, "");
const OPENAI_BASE = (process.env.OPENAI_API_BASE || "https://api.openai.com").replace(/\/$/, "");

export interface GeneratedImage {
  dataUrl: string;
  provider: ImageProvider;
  model: string;
}

export function imageProvider(): ImageProvider | null {
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
  const preferred = process.env.IMAGE_PROVIDER?.toLowerCase();
  if (preferred === "openai" && hasOpenAI) return "openai";
  if (preferred === "gemini" && hasGemini) return "gemini";
  if (hasGemini) return "gemini";
  if (hasOpenAI) return "openai";
  return null;
}

export async function generateImage(image: InputImage, prompt: string, aspect: number): Promise<GeneratedImage> {
  const provider = imageProvider();
  if (provider === "gemini") return generateWithGemini(image, prompt, aspect);
  if (provider === "openai") return generateWithOpenAI(image, prompt, aspect);
  throw new HttpError(500, "No image provider is configured.");
}

function candidates(envValue: string | undefined, defaults: string[]) {
  return [...new Set([envValue?.trim(), ...defaults].filter((m): m is string => Boolean(m)))];
}

class ModelUnavailable extends Error {}

// Models this server has already found missing, so later requests skip them.
const unavailable = new Set<string>();

async function tryModels(models: string[], run: (model: string) => Promise<string>, provider: ImageProvider) {
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
        throw new HttpError(503, `Couldn't reach the ${provider} image service. Check the server's internet connection.`);
      }
      throw error;
    }
  }
  throw new HttpError(
    500,
    `None of these ${provider} image models are available to your API key: ${models.join(", ")}. Set ${
      provider === "gemini" ? "GEMINI_IMAGE_MODEL" : "OPENAI_IMAGE_MODEL"
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

async function generateWithGemini(image: InputImage, prompt: string, aspect: number) {
  const models = candidates(process.env.GEMINI_IMAGE_MODEL, [
    "gemini-3.1-flash-image",
    "gemini-3.1-flash-image-preview",
    "gemini-3-pro-image-preview",
    "gemini-2.5-flash-image",
  ]);
  return tryModels(
    models,
    async (model) => {
      const res = await fetch(
        `${GEMINI_BASE}/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY ?? "" },
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
    "gemini",
  );
}

// ---------- OpenAI GPT Image ----------

function openAISize(aspect: number) {
  if (aspect > 1.15) return "1536x1024";
  if (aspect < 0.87) return "1024x1536";
  return "1024x1024";
}

async function generateWithOpenAI(image: InputImage, prompt: string, aspect: number) {
  const models = candidates(process.env.OPENAI_IMAGE_MODEL, ["gpt-image-2", "gpt-image-1.5", "gpt-image-1"]);
  const quality = process.env.OPENAI_IMAGE_QUALITY || "medium";
  const bytes = Buffer.from(image.data, "base64");
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
      const res = await fetch(`${OPENAI_BASE}/v1/images/edits`, {
        method: "POST",
        headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ""}` },
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
    "openai",
  );
}
