"use client";

import { useRef, useState } from "react";
import { prepareImage, type PreparedImage } from "@/lib/client/image";

interface Props {
  photo: PreparedImage | null;
  onPhoto: (photo: PreparedImage | null) => void;
  disabled?: boolean;
}

export default function Uploader({ photo, onPhoto, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/") && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) {
      setError("Please choose a photo (JPG, PNG or WebP).");
      return;
    }
    setError("");
    setBusy(true);
    try {
      onPhoto(await prepareImage(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't open that photo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="visually-hidden"
        id="photo-input"
        disabled={disabled}
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {photo ? (
        <div className="upload-preview">
          <img src={photo.dataUrl} alt="Your uploaded space" />
          <button type="button" className="btn btn-ghost" onClick={() => inputRef.current?.click()} disabled={disabled}>
            Change photo
          </button>
        </div>
      ) : (
        <label
          htmlFor="photo-input"
          className={`dropzone${dragOver ? " is-over" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            void handleFile(e.dataTransfer.files?.[0]);
          }}
        >
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="13" r="3.5" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <strong>{busy ? "Preparing photo…" : "Upload or take a photo of your space"}</strong>
          <span>Drag a photo here, or tap to choose one</span>
        </label>
      )}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <ul className="photo-tips">
        <li>Stand in a corner or doorway and shoot in landscape so the whole area is visible.</li>
        <li>Include the wall or spot where you imagine the stage.</li>
        <li>Daylight photos give the most accurate designs.</li>
      </ul>
    </div>
  );
}
