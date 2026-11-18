import type { DesignConcept, DesignResult } from "../schema";
import { isNativeApp } from "./settings";

// Saving and sharing that works in a normal browser and in the Android app
// (where download links don't work, so we hand files to the Android share sheet).

export async function saveImage(dataUrl: string, filename: string, title: string): Promise<"shared" | "downloaded"> {
  if (isNativeApp()) {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import("@capacitor/filesystem"),
      import("@capacitor/share"),
    ]);
    const data = dataUrl.slice(dataUrl.indexOf(",") + 1);
    const { uri } = await Filesystem.writeFile({ path: filename, data, directory: Directory.Cache });
    await Share.share({ title, files: [uri], dialogTitle: "Save or share your design" });
    return "shared";
  }
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  return "downloaded";
}

/** Share text (native share sheet, Web Share API, or clipboard). */
export async function shareText(title: string, text: string): Promise<"shared" | "copied"> {
  if (isNativeApp()) {
    const { Share } = await import("@capacitor/share");
    await Share.share({ title, text, dialogTitle: "Share your wedding plan" });
    return "shared";
  }
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title, text });
      return "shared";
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return "shared";
    }
  }
  await navigator.clipboard.writeText(text);
  return "copied";
}

export function planToText(design: DesignResult, concept: DesignConcept, event: string): string {
  const s = concept.stage;
  const lines = [
    `${concept.name} — ${event} decor plan`,
    concept.tagline,
    "",
    `Colors: ${concept.palette.map((p) => p.name).join(", ")}`,
    "",
    "STAGE",
    `• Where: ${s.placement}`,
    `• Size: ${s.size}`,
    `• Backdrop: ${s.backdrop}`,
    `• Couple seating: ${s.seating}`,
    `• Flowers: ${s.florals}`,
    `• Lighting: ${s.lighting}`,
    "",
    "AROUND THE SPACE",
    ...concept.decor_zones.map((z) => `• ${z.zone}: ${z.ideas}`),
    "",
    "SHOPPING & RENTAL LIST",
    ...concept.shopping_list.map((i) => `• ${i.item} × ${i.quantity} — ${i.est_cost}`),
    `Estimated total: ${concept.budget_total}`,
    "",
    `Setup: ${concept.setup.time_needed}, ${concept.setup.crew}`,
    "",
    "DESIGNER TIPS",
    ...design.designer_notes.map((n) => `• ${n}`),
    "",
    "Made with Wedding Decor Studio",
  ];
  return lines.join("\n");
}
