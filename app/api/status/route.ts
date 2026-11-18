import { NextResponse } from "next/server";
import type { StatusResponse } from "@/lib/schema";
import { claudeConfigured } from "@/lib/server/claude";
import { imageProvider } from "@/lib/server/imagegen";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json<StatusResponse>({
    designer: claudeConfigured(),
    imageProvider: imageProvider(),
    passcodeRequired: Boolean(process.env.APP_PASSCODE),
  });
}
