import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

export function jsonError(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({ error: "Something went wrong on the server. Please try again." }, { status: 500 });
}

/** When APP_PASSCODE is set, every API call must send it in the x-app-passcode header. */
export function requirePasscode(req: Request) {
  const expected = process.env.APP_PASSCODE;
  if (!expected) return;
  const given = req.headers.get("x-app-passcode") ?? "";
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new HttpError(401, "Please enter the app passcode.", "PASSCODE");
  }
}

export const ALLOWED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedMediaType = (typeof ALLOWED_MEDIA_TYPES)[number];

export interface InputImage {
  data: string; // base64, no data: prefix
  mediaType: AllowedMediaType;
}

const MAX_BASE64_LENGTH = 7_000_000; // ~5 MB of image bytes

export function parseInputImage(value: unknown): InputImage {
  if (!value || typeof value !== "object") throw new HttpError(400, "Please upload a photo of your space.");
  const { data, mediaType } = value as Record<string, unknown>;
  if (typeof data !== "string" || data.length === 0) throw new HttpError(400, "Please upload a photo of your space.");
  if (typeof mediaType !== "string" || !ALLOWED_MEDIA_TYPES.includes(mediaType as AllowedMediaType)) {
    throw new HttpError(400, "Please upload a JPG, PNG or WebP photo.");
  }
  if (data.length > MAX_BASE64_LENGTH) throw new HttpError(413, "That photo is too large. Please use a smaller photo.");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(data)) throw new HttpError(400, "The photo data is not valid.");
  return { data, mediaType: mediaType as AllowedMediaType };
}

export function str(value: unknown, max: number, fallback = ""): string {
  return typeof value === "string" ? value.slice(0, max) : fallback;
}
