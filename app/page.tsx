"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BeforeAfter from "@/components/BeforeAfter";
import ConceptDetails from "@/components/ConceptDetails";
import EventForm from "@/components/EventForm";
import SettingsDialog from "@/components/SettingsDialog";
import SpaceReport from "@/components/SpaceReport";
import Uploader from "@/components/Uploader";
import { ApiError, loadPasscode, savePasscode } from "@/lib/client/api";
import { deviceBackend, serverBackend } from "@/lib/client/backend";
import { renderDemoAfter } from "@/lib/client/demoOverlay";
import { prepareImage, slugify, toApiImage, type PreparedImage } from "@/lib/client/image";
import {
  chooseImageProvider,
  EMPTY_SETTINGS,
  isNativeApp,
  loadSettings,
  saveSettings,
  STANDALONE,
  type AppSettings,
} from "@/lib/client/settings";
import { planToText, saveImage, shareText } from "@/lib/client/share";
import { DEFAULT_DETAILS, type EventDetails } from "@/lib/options";
import type { AnalyzeResponse, DesignConcept, StatusResponse } from "@/lib/schema";

interface Version {
  url: string;
  demo: boolean;
  label: string;
}

interface AfterState {
  status: "idle" | "loading" | "done" | "error";
  versions: Version[];
  current: number;
  error?: string;
  loadingText?: string;
}

interface Result extends AnalyzeResponse {
  photo: PreparedImage;
  details: EventDetails;
}

const EMPTY_AFTER: AfterState = { status: "idle", versions: [], current: -1 };

const ANALYZING_MESSAGES = [
  "Walking through your space…",
  "Measuring walls, light and floor area…",
  "Finding the best spot for the stage…",
  "Choosing palettes for your function…",
  "Sketching three design concepts…",
  "Pricing the shopping list…",
];

function conceptPrompt(c: DesignConcept) {
  if (c.image_prompt.trim()) return c.image_prompt;
  return [
    `Decorate the space in the "${c.name}" style (${c.style}) for a ${c.best_for_event} function: ${c.tagline}`,
    `Stage: ${c.stage.placement} Backdrop: ${c.stage.backdrop}. Seating: ${c.stage.seating}. Florals: ${c.stage.florals}. Lighting: ${c.stage.lighting}.`,
    `Around the space: ${c.decor_zones.map((z) => `${z.zone} — ${z.ideas}`).join("; ")}.`,
    `Color palette: ${c.palette.map((p) => p.name).join(", ")}. ${c.lighting_plan}`,
  ].join("\n");
}

function isCancel(e: unknown) {
  return e instanceof Error && /cancel/i.test(e.message);
}

function Logo() {
  return (
    <svg width="34" height="34" viewBox="0 0 64 64" aria-hidden="true">
      <g transform="translate(32 32)">
        {Array.from({ length: 8 }, (_, i) => (
          <ellipse key={i} rx="7" ry="15" cy="-13" fill="var(--gold)" opacity="0.85" transform={`rotate(${i * 45})`} />
        ))}
        <circle r="9" fill="var(--plum)" />
        <circle r="4" fill="var(--gold-light)" />
      </g>
    </svg>
  );
}

export default function Home() {
  const [serverStatus, setServerStatus] = useState<StatusResponse | null>(null);
  const [settings, setSettings] = useState<AppSettings>(EMPTY_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [native, setNative] = useState(false);
  const [toast, setToast] = useState("");
  const [photo, setPhoto] = useState<PreparedImage | null>(null);
  const [details, setDetails] = useState<EventDetails>(DEFAULT_DETAILS);
  const [passcode, setPasscode] = useState("");
  const [needPasscode, setNeedPasscode] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [msgIndex, setMsgIndex] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [selected, setSelected] = useState(0);
  const [afters, setAfters] = useState<Record<number, AfterState>>({});
  const [refineText, setRefineText] = useState("");

  const aftersRef = useRef(afters);
  aftersRef.current = afters;
  const sessionRef = useRef(0);
  const resultsRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setNative(isNativeApp());
    if (STANDALONE) {
      setSettings(loadSettings());
      setSettingsLoaded(true);
      return;
    }
    setPasscode(loadPasscode());
    fetch("/api/status")
      .then((r) => r.json())
      .then((s: StatusResponse) => {
        setServerStatus(s);
        if (s.passcodeRequired) setNeedPasscode(true);
      })
      .catch(() => setServerStatus(null));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const status: StatusResponse | null = STANDALONE
    ? settingsLoaded
      ? { designer: Boolean(settings.anthropicKey), imageProvider: chooseImageProvider(settings), passcodeRequired: false }
      : null
    : serverStatus;

  const backend = useMemo(() => (STANDALONE ? deviceBackend(settings) : serverBackend(passcode)), [settings, passcode]);

  useEffect(() => {
    if (!analyzing) return;
    setMsgIndex(0);
    const t = setInterval(() => setMsgIndex((i) => (i + 1) % ANALYZING_MESSAGES.length), 2600);
    return () => clearInterval(t);
  }, [analyzing]);

  const handleApiError = useCallback((e: unknown) => {
    if (e instanceof ApiError && e.code === "PASSCODE") setNeedPasscode(true);
    return e instanceof Error ? e.message : "Something went wrong. Please try again.";
  }, []);

  const updateAfter = (index: number, fn: (s: AfterState) => AfterState) =>
    setAfters((prev) => ({ ...prev, [index]: fn(prev[index] ?? EMPTY_AFTER) }));

  const generateAfter = useCallback(
    async (res: Result, index: number, refinement?: string) => {
      const session = sessionRef.current;
      const concept = res.design.concepts[index];
      const state = aftersRef.current[index] ?? EMPTY_AFTER;
      const currentVersion = state.versions[state.current];
      updateAfter(index, (s) => ({
        ...s,
        status: "loading",
        error: undefined,
        loadingText: refinement ? "Applying your changes…" : "Decorating your space…",
      }));
      try {
        const base = refinement && currentVersion && !currentVersion.demo ? await prepareImage(currentVersion.url) : res.photo;
        const data = await backend.generate({
          image: toApiImage(base),
          mode: refinement ? "refine" : "design",
          prompt: refinement ?? conceptPrompt(concept),
          aspect: res.photo.width / res.photo.height,
        });
        let version: Version;
        if (data.demo || !data.image) {
          const url = await renderDemoAfter(
            res.photo.dataUrl,
            concept.palette.map((p) => p.hex),
            index * 31 + state.versions.length * 7 + 3,
          );
          version = { url, demo: true, label: "" };
        } else {
          version = { url: data.image, demo: false, label: "" };
        }
        if (session !== sessionRef.current) return;
        updateAfter(index, (s) => {
          const versions = [...s.versions, { ...version, label: refinement ? `Edit: ${refinement}` : "Design" }];
          return { status: "done", versions, current: versions.length - 1 };
        });
      } catch (e) {
        if (session !== sessionRef.current) return;
        const message = handleApiError(e);
        updateAfter(index, (s) => ({ ...s, status: s.versions.length ? "done" : "error", error: message }));
      }
    },
    [backend, handleApiError],
  );

  async function design() {
    if (!photo) return;
    setError("");
    setAnalyzing(true);
    const session = ++sessionRef.current;
    try {
      const data: AnalyzeResponse = await backend.analyze(toApiImage(photo), details);
      if (session !== sessionRef.current) return;
      const res: Result = { ...data, photo, details };
      setResult(res);
      setAfters({});
      setRefineText("");
      setSelected(data.design.recommended_index);
      requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
      if (data.design.usable_photo && data.design.concepts.length) {
        void generateAfter(res, data.design.recommended_index);
      }
    } catch (e) {
      if (session === sessionRef.current) setError(handleApiError(e));
    } finally {
      if (session === sessionRef.current) setAnalyzing(false);
    }
  }

  function startOver() {
    sessionRef.current++;
    setResult(null);
    setAfters({});
    setPhoto(null);
    setError("");
    setAnalyzing(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function editDetails() {
    document.getElementById("occasion")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function savePhoto(url: string, name: string, index: number) {
    try {
      const ext = url.startsWith("data:image/jpeg") ? "jpg" : "png";
      const how = await saveImage(url, `wedding-design-${slugify(name)}-v${index + 1}.${ext}`, name);
      if (how === "downloaded") setToast("Photo downloaded");
    } catch (e) {
      if (!isCancel(e)) setToast("Couldn't save the photo. Please try again.");
    }
  }

  async function sharePlan() {
    if (!result || !concept) return;
    try {
      const how = await shareText(`${concept.name} — wedding decor plan`, planToText(result.design, concept, result.details.event));
      if (how === "copied") setToast("Plan copied — paste it into WhatsApp or notes");
    } catch (e) {
      if (!isCancel(e)) setToast("Couldn't share the plan.");
    }
  }

  const concept = result?.design.concepts[selected];
  const after = afters[selected] ?? EMPTY_AFTER;
  const version = after.versions[after.current];
  const anyAiMissing = status && (!status.designer || !status.imageProvider);

  return (
    <>
      <header className="site-header">
        <div className="wrap header-inner">
          <a className="brand" href="/">
            <Logo />
            <span>
              Wedding Decor <em>Studio</em>
            </span>
          </a>
          <div className="header-actions">
            {status && (
              <span className={`pill ${anyAiMissing ? "pill-warn" : "pill-ok"}`}>
                {anyAiMissing ? "Demo mode" : "AI ready"}
              </span>
            )}
            {STANDALONE && (
              <button
                type="button"
                className="icon-btn"
                aria-label="Settings"
                title="Settings"
                onClick={() => setShowSettings(true)}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                  <path
                    d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      </header>

      {showSettings && (
        <SettingsDialog
          value={settings}
          onClose={() => setShowSettings(false)}
          onSave={(next) => {
            setSettings(next);
            const stored = saveSettings(next);
            setShowSettings(false);
            setToast(stored ? "Settings saved" : "Settings saved for this session only");
          }}
        />
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}

      <main className="wrap">
        <section className="hero">
          <p className="eyebrow">Your personal AI wedding designer</p>
          <h1>See your home dressed for the big day</h1>
          <p className="lead">
            Upload a photo of your living room, courtyard, lawn or rooftop. An expert designer studies the space, picks
            the best spot for the stage, and shows you before &amp; after pictures of three decor concepts.
          </p>
          <ol className="steps">
            <li>
              <span>1</span>Snap your space
            </li>
            <li>
              <span>2</span>Tell us the occasion
            </li>
            <li>
              <span>3</span>Get designs &amp; before/after photos
            </li>
          </ol>
        </section>

        {anyAiMissing &&
          (STANDALONE ? (
            <div className="notice" role="note">
              <strong>Demo mode.</strong>{" "}
              {!status.designer && "Add your Anthropic API key for a real designer's analysis of your photo. "}
              {!status.imageProvider && "Add a Gemini or OpenAI key for photorealistic after pictures. "}
              Until then you&rsquo;ll see sample designs.{" "}
              <button type="button" className="link-btn" onClick={() => setShowSettings(true)}>
                Open Settings
              </button>
            </div>
          ) : (
            <div className="notice" role="note">
              <strong>Demo mode.</strong>{" "}
              {!status.designer && "Add ANTHROPIC_API_KEY to get a real designer's analysis of your photo. "}
              {!status.imageProvider && "Add GEMINI_API_KEY or OPENAI_API_KEY for photorealistic after pictures. "}
              Until then you&rsquo;ll see sample designs so you can try the app.
            </div>
          ))}

        <section className="card step" aria-labelledby="space-step">
          <h2 id="space-step">
            <span className="step-num">1</span> Your space
          </h2>
          <Uploader photo={photo} onPhoto={setPhoto} disabled={analyzing} />
        </section>

        <section className="card step" id="occasion" aria-labelledby="occasion-step">
          <h2 id="occasion-step">
            <span className="step-num">2</span> The occasion
          </h2>
          <EventForm value={details} onChange={setDetails} disabled={analyzing} />
          {needPasscode && !STANDALONE && (
            <label className="field passcode">
              <span className="label">App passcode</span>
              <input
                type="password"
                value={passcode}
                autoComplete="current-password"
                placeholder="Ask the app owner for the passcode"
                onChange={(e) => {
                  setPasscode(e.target.value);
                  savePasscode(e.target.value);
                }}
              />
            </label>
          )}
        </section>

        <div className="cta">
          <button type="button" className="btn btn-primary btn-lg" onClick={design} disabled={!photo || analyzing}>
            {analyzing ? "Designing…" : result ? "Redesign with these details" : "Design my wedding space"}
          </button>
          {!photo && <p className="muted">Add a photo of your space to begin.</p>}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
        </div>

        {analyzing && (
          <section className="card analyzing" role="status" aria-live="polite">
            {photo && <img src={photo.dataUrl} alt="" />}
            <div className="scanline" aria-hidden="true" />
            <div className="analyzing-text">
              <div className="spinner" aria-hidden="true" />
              <p>{ANALYZING_MESSAGES[msgIndex]}</p>
              <small>Your designer is working — this takes about a minute.</small>
            </div>
          </section>
        )}

        {result && (
          <section ref={resultsRef} className="results" aria-labelledby="results-title">
            {!result.design.usable_photo ? (
              <div className="card warn-card">
                <h2 id="results-title">Let&rsquo;s try a different photo</h2>
                <p>{result.design.photo_issue}</p>
                <button type="button" className="btn btn-primary" onClick={startOver}>
                  Upload another photo
                </button>
              </div>
            ) : (
              <>
                <div className="results-head">
                  <p className="eyebrow">Your designs {result.demo && <span className="pill pill-warn">Sample</span>}</p>
                  <h2 id="results-title">
                    Three ways to dress your space for the {result.details.event}
                  </h2>
                </div>

                <div className="concept-tabs" role="tablist" aria-label="Design concepts">
                  {result.design.concepts.map((c, i) => (
                    <button
                      key={c.name + i}
                      type="button"
                      role="tab"
                      id={`tab-${i}`}
                      aria-selected={selected === i}
                      aria-controls="concept-panel"
                      className="concept-tab"
                      onClick={() => setSelected(i)}
                    >
                      {i === result.design.recommended_index && <span className="badge">Designer&rsquo;s pick</span>}
                      <strong>{c.name}</strong>
                      <small>
                        {c.style} · {c.best_for_event}
                      </small>
                      <span className="tab-foot">
                        <span className="dots" aria-hidden="true">
                          {c.palette.slice(0, 5).map((p) => (
                            <i key={p.hex} style={{ background: p.hex }} />
                          ))}
                        </span>
                        <span className="score">{c.match_score}% match</span>
                      </span>
                    </button>
                  ))}
                </div>

                {concept && (
                  <div role="tabpanel" id="concept-panel" aria-labelledby={`tab-${selected}`}>
                    <section className="card concept-hero">
                      <h3>{concept.name}</h3>
                      <p className="tagline">{concept.tagline}</p>

                      <BeforeAfter
                        before={result.photo.dataUrl}
                        after={version?.url}
                        aspect={result.photo.width / result.photo.height}
                        loading={after.status === "loading"}
                        loadingText={after.loadingText}
                      />

                      {after.error && (
                        <p className="form-error" role="alert">
                          {after.error}
                        </p>
                      )}
                      {version?.demo && (
                        <p className="muted small">
                          This is a demo preview.{" "}
                          {STANDALONE
                            ? "Add a Gemini or OpenAI key in Settings to get a photorealistic AI design of your space."
                            : "Add GEMINI_API_KEY or OPENAI_API_KEY to the server to get a photorealistic AI design of your space."}
                        </p>
                      )}

                      <div className="after-actions">
                        {after.status !== "loading" && !version && (
                          <button type="button" className="btn btn-primary" onClick={() => generateAfter(result, selected)}>
                            {after.status === "error" ? "Try again" : "Show me the after photo"}
                          </button>
                        )}
                        {version && after.status !== "loading" && (
                          <>
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={() => savePhoto(version.url, concept.name, after.current)}
                            >
                              {native ? "Save or share photo" : "Download after photo"}
                            </button>
                            <button type="button" className="btn btn-ghost" onClick={() => generateAfter(result, selected)}>
                              Generate another version
                            </button>
                          </>
                        )}
                      </div>

                      {after.versions.length > 1 && (
                        <div className="versions" role="group" aria-label="Versions">
                          <span className="muted small">Versions:</span>
                          {after.versions.map((v, i) => (
                            <button
                              key={i}
                              type="button"
                              aria-pressed={after.current === i}
                              title={v.label}
                              disabled={after.status === "loading"}
                              onClick={() => updateAfter(selected, (s) => ({ ...s, current: i }))}
                            >
                              {i + 1}
                            </button>
                          ))}
                        </div>
                      )}

                      {version && (
                        <form
                          className="refine"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const text = refineText.trim();
                            if (!text || after.status === "loading") return;
                            setRefineText("");
                            void generateAfter(result, selected, text);
                          }}
                        >
                          <label htmlFor="refine-input" className="label">
                            Want changes? Tell the designer
                          </label>
                          <div className="refine-row">
                            <input
                              id="refine-input"
                              type="text"
                              value={refineText}
                              maxLength={300}
                              placeholder="e.g. add more marigolds on the ceiling, make the stage bigger"
                              onChange={(e) => setRefineText(e.target.value)}
                              disabled={after.status === "loading"}
                            />
                            <button
                              type="submit"
                              className="btn btn-dark"
                              disabled={!refineText.trim() || after.status === "loading"}
                            >
                              Update photo
                            </button>
                          </div>
                        </form>
                      )}
                    </section>

                    <ConceptDetails concept={concept} />
                  </div>
                )}

                <SpaceReport design={result.design} />

                <section className="card" aria-labelledby="notes-title">
                  <p className="eyebrow">From your designer</p>
                  <h3 id="notes-title" className="h-section">
                    Expert tips for your space
                  </h3>
                  <div className="grid-2 lists">
                    <ul className="ticks">
                      {result.design.designer_notes.map((n) => (
                        <li key={n}>{n}</li>
                      ))}
                    </ul>
                    <div>
                      <h4>Avoid</h4>
                      <ul className="cross">
                        {result.design.avoid.map((n) => (
                          <li key={n}>{n}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </section>
              </>
            )}

            <div className="results-actions no-print">
              {result.design.usable_photo && (
                <button type="button" className="btn btn-ghost" onClick={sharePlan}>
                  Share this plan
                </button>
              )}
              {result.design.usable_photo && !native && (
                <button type="button" className="btn btn-ghost" onClick={() => window.print()}>
                  Save plan as PDF
                </button>
              )}
              <button type="button" className="btn btn-ghost" onClick={editDetails}>
                Try another function or style
              </button>
              <button type="button" className="btn btn-ghost" onClick={startOver}>
                Start over with a new photo
              </button>
            </div>
          </section>
        )}
      </main>

      <footer className="site-footer">
        <div className="wrap">
          AI designs are inspiration — confirm sizes, safety and prices with your decorator before booking.
        </div>
      </footer>
    </>
  );
}
