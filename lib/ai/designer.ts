import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { HttpError } from "../errors";
import type { EventDetails } from "../options";
import { buildDesignRequest, DESIGNER_SYSTEM_PROMPT } from "../prompts";
import { DesignResultSchema, type DesignResult, type InputImage } from "../schema";

// The AI interior designer: Claude studies the photo and returns a structured
// design plan. Runs on the server (web app) or directly on the phone (Android app).

export const EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
export type Effort = (typeof EFFORTS)[number];

export interface DesignerConfig {
  /** Omit on the server to use ANTHROPIC_API_KEY from the environment. */
  apiKey?: string;
  model?: string;
  effort?: Effort;
  /** True when calling from a browser / app WebView with the user's own key. */
  browser?: boolean;
}

const DEFAULT_MODEL = "claude-opus-5-5";
const clients = new Map<string, Anthropic>();

function getClient(cfg: DesignerConfig) {
  const id = `${cfg.browser ? "b" : "s"}:${cfg.apiKey ?? ""}`;
  let client = clients.get(id);
  if (!client) {
    client = new Anthropic({
      ...(cfg.apiKey ? { apiKey: cfg.apiKey } : {}),
      ...(cfg.browser ? { dangerouslyAllowBrowser: true } : {}),
    });
    clients.set(id, client);
  }
  return client;
}

export async function designSpace(image: InputImage, details: EventDetails, cfg: DesignerConfig): Promise<DesignResult> {
  const format = betaZodOutputFormat(DesignResultSchema);
  let response;
  try {
    // Plain create (not .parse) so a refusal or cut-off reply can be reported
    // nicely instead of failing inside the SDK's JSON parser.
    response = await getClient(cfg).beta.messages.create({
      model: cfg.model || DEFAULT_MODEL,
      max_tokens: 16000,
      // If the model declines for policy reasons, let the API retry on its default fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [{ type: "text", text: DESIGNER_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      output_config: { effort: cfg.effort ?? "medium", format },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data } },
            { type: "text", text: buildDesignRequest(details) },
          ],
        },
      ],
    });
  } catch (error) {
    throw toHttpError(error, cfg);
  }

  if (response.stop_reason === "refusal") {
    throw new HttpError(422, "The designer couldn't work with this photo. Please try a different photo of your space.");
  }
  if (response.stop_reason === "max_tokens") {
    throw new HttpError(502, "The design plan was cut off. Please try again.");
  }
  const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  let design: DesignResult;
  try {
    design = format.parse(text);
  } catch (error) {
    console.error("Unreadable design response", error);
    throw new HttpError(502, "The designer's response could not be read. Please try again.");
  }
  return normalize(design);
}

function normalize(design: DesignResult): DesignResult {
  const concepts = design.concepts.slice(0, 3).map((c) => ({
    ...c,
    match_score: Math.max(0, Math.min(100, Math.round(c.match_score))),
    palette: c.palette.filter((p) => /^#[0-9a-fA-F]{6}$/.test(p.hex.trim())).map((p) => ({ ...p, hex: p.hex.trim() })),
  }));
  const rec = Math.round(design.recommended_index);
  return {
    ...design,
    concepts,
    recommended_index: rec >= 0 && rec < concepts.length ? rec : 0,
  };
}

function toHttpError(error: unknown, cfg: DesignerConfig): HttpError {
  const keyName = cfg.browser ? "Anthropic API key in Settings" : "ANTHROPIC_API_KEY";
  if (error instanceof Anthropic.AuthenticationError) {
    return new HttpError(500, `The Anthropic API key is invalid. Check the ${keyName}.`);
  }
  if (error instanceof Anthropic.PermissionDeniedError) {
    return new HttpError(500, "The Anthropic API key doesn't have access to this model.");
  }
  if (error instanceof Anthropic.RateLimitError) {
    return new HttpError(429, "The designer is busy right now. Please wait a minute and try again.");
  }
  if (error instanceof Anthropic.BadRequestError) {
    return new HttpError(400, `The designer couldn't process this request: ${error.message}`);
  }
  if (error instanceof Anthropic.InternalServerError) {
    return new HttpError(503, "The AI service is temporarily unavailable. Please try again shortly.");
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return new HttpError(503, "Couldn't reach the AI service. Check your internet connection.");
  }
  if (error instanceof Anthropic.APIError) {
    return new HttpError(502, `AI service error: ${error.message}`);
  }
  console.error(error);
  return new HttpError(500, "Something went wrong while designing. Please try again.");
}
