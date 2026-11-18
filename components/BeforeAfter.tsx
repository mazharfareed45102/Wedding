"use client";

import { useCallback, useRef, useState } from "react";

interface Props {
  before: string;
  after?: string;
  aspect: number; // width / height of the before photo
  loading?: boolean;
  loadingText?: string;
}

export default function BeforeAfter({ before, after, aspect, loading, loadingText }: Props) {
  const [mode, setMode] = useState<"slider" | "side">("slider");
  const [pos, setPos] = useState(50);
  const frameRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const moveTo = useCallback((clientX: number) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPos(Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)));
  }, []);

  const showSlider = mode === "slider" && after && !loading;

  return (
    <div className="ba">
      {after && !loading && (
        <div className="ba-modes" role="group" aria-label="Comparison view">
          <button type="button" aria-pressed={mode === "slider"} onClick={() => setMode("slider")}>
            Slider
          </button>
          <button type="button" aria-pressed={mode === "side"} onClick={() => setMode("side")}>
            Side by side
          </button>
        </div>
      )}

      {mode === "side" && after && !loading ? (
        <div className="ba-side">
          <figure>
            <div className="ba-frame" style={{ aspectRatio: aspect }}>
              <img src={before} alt="Your space before decorating" />
            </div>
            <figcaption>Before</figcaption>
          </figure>
          <figure>
            <div className="ba-frame" style={{ aspectRatio: aspect }}>
              <img src={after} alt="Your space decorated for the wedding" />
            </div>
            <figcaption>After</figcaption>
          </figure>
        </div>
      ) : (
        <div
          ref={frameRef}
          className={`ba-frame ba-compare${showSlider ? " is-interactive" : ""}`}
          style={{ aspectRatio: aspect }}
          onPointerDown={(e) => {
            if (!showSlider) return;
            dragging.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            moveTo(e.clientX);
          }}
          onPointerMove={(e) => dragging.current && moveTo(e.clientX)}
          onPointerUp={() => (dragging.current = false)}
          onPointerCancel={() => (dragging.current = false)}
        >
          <img src={before} alt="Your space before decorating" draggable={false} />
          {showSlider && (
            <>
              <img
                className="ba-after"
                src={after}
                alt="Your space decorated for the wedding"
                draggable={false}
                style={{ clipPath: `inset(0 0 0 ${pos}%)` }}
              />
              <div className="ba-handle" style={{ left: `${pos}%` }} aria-hidden="true">
                <span>‹ ›</span>
              </div>
              <span className="ba-tag ba-tag-before">Before</span>
              <span className="ba-tag ba-tag-after">After</span>
              <input
                className="visually-hidden"
                type="range"
                min={0}
                max={100}
                value={Math.round(pos)}
                onChange={(e) => setPos(Number(e.target.value))}
                aria-label="Drag to compare before and after"
              />
            </>
          )}
          {!after && !loading && <span className="ba-tag ba-tag-before">Before</span>}
          {loading && (
            <div className="ba-loading" role="status">
              <div className="spinner" aria-hidden="true" />
              <p>{loadingText ?? "Creating your after photo…"}</p>
              <small>This usually takes 20–60 seconds</small>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
