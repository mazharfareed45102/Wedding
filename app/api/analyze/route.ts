import { NextResponse } from "next/server";
import { demoDesign } from "@/lib/demo";
import { BUDGETS, DEFAULT_DETAILS, type BudgetId, type EventDetails } from "@/lib/options";
import type { AnalyzeResponse } from "@/lib/schema";
import { claudeConfigured, designSpace } from "@/lib/server/claude";
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

    if (!claudeConfigured()) {
      await new Promise((r) => setTimeout(r, 1200)); // let the loading screen show briefly
      return NextResponse.json<AnalyzeResponse>({ design: demoDesign(details.event), demo: true });
    }

    const design = await designSpace(image, details);
    return NextResponse.json<AnalyzeResponse>({ design, demo: false });
  } catch (error) {
    return jsonError(error);
  }
}
