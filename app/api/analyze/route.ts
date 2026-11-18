import { NextResponse } from "next/server";
import { analyzeSpace } from "@/lib/ai/service";
import { BUDGETS, DEFAULT_DETAILS, type BudgetId, type EventDetails } from "@/lib/options";
import type { AnalyzeResponse } from "@/lib/schema";
import { serverDesignerConfig } from "@/lib/server/config";
import { HttpError, jsonError, parseInputImage, requirePasscode, str } from "@/lib/server/http";

export const runtime = "nodejs";
export const maxDuration = 180;

function parseDetails(value: unknown): EventDetails {
  const v = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const budget = BUDGETS.some((b) => b.id === v.budget) ? (v.budget as BudgetId) : DEFAULT_DETAILS.budget;
  const styles = Array.isArray(v.styles) ? v.styles.filter((s): s is string => typeof s === "string").slice(0, 6) : [];
  return {
    event: str(v.event, 60, DEFAULT_DETAILS.event) || DEFAULT_DETAILS.event,
    styles: styles.map((s) => s.slice(0, 60)),
    budget,
    colors: str(v.colors, 120),
    guests: str(v.guests, 20),
    location: str(v.location, 80),
    spaceHint: str(v.spaceHint, 60),
    notes: str(v.notes, 800),
  };
}

export async function POST(req: Request) {
  try {
    requirePasscode(req);
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) throw new HttpError(400, "Invalid request.");
    const image = parseInputImage(body.image);
    const details = parseDetails(body.details);
    return NextResponse.json<AnalyzeResponse>(await analyzeSpace(image, details, serverDesignerConfig()));
  } catch (error) {
    return jsonError(error);
  }
}
