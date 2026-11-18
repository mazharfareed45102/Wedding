import type { ImageProvider } from "../schema";

/** Set at build time: the Android app is built with NEXT_PUBLIC_APP_MODE=standalone. */
export const STANDALONE = process.env.NEXT_PUBLIC_APP_MODE === "standalone";

/** True inside the installed Android app (Capacitor injects window.Capacitor). */
export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

// In the standalone app the user's own API keys live only on this device.
export interface AppSettings {
  anthropicKey: string;
  geminiKey: string;
  openaiKey: string;
  imageProvider: "auto" | ImageProvider;
}

export const EMPTY_SETTINGS: AppSettings = { anthropicKey: "", geminiKey: "", openaiKey: "", imageProvider: "auto" };

const KEY = "wds-settings";

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      anthropicKey: typeof parsed.anthropicKey === "string" ? parsed.anthropicKey : "",
      geminiKey: typeof parsed.geminiKey === "string" ? parsed.geminiKey : "",
      openaiKey: typeof parsed.openaiKey === "string" ? parsed.openaiKey : "",
      imageProvider: parsed.imageProvider === "gemini" || parsed.imageProvider === "openai" ? parsed.imageProvider : "auto",
    };
  } catch {
    return EMPTY_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}

export function chooseImageProvider(s: AppSettings): ImageProvider | null {
  const hasGemini = Boolean(s.geminiKey.trim());
  const hasOpenAI = Boolean(s.openaiKey.trim());
  if (s.imageProvider === "openai" && hasOpenAI) return "openai";
  if (s.imageProvider === "gemini" && hasGemini) return "gemini";
  if (hasGemini) return "gemini";
  if (hasOpenAI) return "openai";
  return null;
}
