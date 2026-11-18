"use client";

import { useEffect, useRef, useState } from "react";
import { EMPTY_SETTINGS, type AppSettings } from "@/lib/client/settings";

interface Props {
  value: AppSettings;
  onSave: (value: AppSettings) => void;
  onClose: () => void;
}

const FIELDS: { key: "anthropicKey" | "geminiKey" | "openaiKey"; label: string; help: string; link: string; placeholder: string }[] = [
  {
    key: "anthropicKey",
    label: "Anthropic API key (the designer)",
    help: "Needed for the real design analysis of your photo.",
    link: "https://console.anthropic.com/settings/keys",
    placeholder: "sk-ant-…",
  },
  {
    key: "geminiKey",
    label: "Google Gemini API key (after photos)",
    help: "Needed for photorealistic after pictures. Or use an OpenAI key below.",
    link: "https://aistudio.google.com/apikey",
    placeholder: "AIza…",
  },
  {
    key: "openaiKey",
    label: "OpenAI API key (after photos, optional)",
    help: "An alternative to Gemini for the after pictures.",
    link: "https://platform.openai.com/api-keys",
    placeholder: "sk-…",
  },
];

export default function SettingsDialog({ value, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<AppSettings>(value);
  const [show, setShow] = useState(false);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const both = draft.geminiKey.trim() && draft.openaiKey.trim();

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="settings-title">Settings</h2>
        <p className="muted small">
          Add your own API keys to get real AI designs. Keys are saved only on this device and are sent only to
          Anthropic, Google or OpenAI. Without keys the app shows sample designs.
        </p>
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            onSave({
              ...draft,
              anthropicKey: draft.anthropicKey.trim(),
              geminiKey: draft.geminiKey.trim(),
              openaiKey: draft.openaiKey.trim(),
            });
          }}
        >
          {FIELDS.map((f, i) => (
            <label className="field" key={f.key}>
              <span className="label">{f.label}</span>
              <input
                ref={i === 0 ? firstRef : undefined}
                type={show ? "text" : "password"}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                placeholder={f.placeholder}
                value={draft[f.key]}
                onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
              />
              <span className="muted small">
                {f.help}{" "}
                <a href={f.link} target="_blank" rel="noopener noreferrer">
                  Get a key
                </a>
              </span>
            </label>
          ))}

          <label className="check">
            <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Show keys
          </label>

          {both && (
            <div className="field">
              <span className="label" id="provider-label">
                Use for after photos
              </span>
              <div className="chips" role="radiogroup" aria-labelledby="provider-label">
                {(["auto", "gemini", "openai"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    role="radio"
                    aria-checked={draft.imageProvider === p}
                    className="chip"
                    onClick={() => setDraft({ ...draft, imageProvider: p })}
                  >
                    {p === "auto" ? "Automatic" : p === "gemini" ? "Gemini" : "OpenAI"}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setDraft(EMPTY_SETTINGS)}>
              Clear keys
            </button>
            <span className="spacer" />
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
