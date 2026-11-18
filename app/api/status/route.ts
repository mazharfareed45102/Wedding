import { NextResponse } from "next/server";
import type { StatusResponse } from "@/lib/schema";
import { serverDesignerConfig, serverImageConfig } from "@/lib/server/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json<StatusResponse>({
    designer: serverDesignerConfig() !== null,
    imageProvider: serverImageConfig()?.provider ?? null,
    passcodeRequired: Boolean(process.env.APP_PASSCODE),
  });
}
