"use client";

import { BUDGETS, EVENT_TYPES, SPACE_HINTS, STYLES, type EventDetails } from "@/lib/options";

interface Props {
  value: EventDetails;
  onChange: (value: EventDetails) => void;
  disabled?: boolean;
}

const ANY_STYLE = "Let the designer choose";

export default function EventForm({ value, onChange, disabled }: Props) {
  const set = <K extends keyof EventDetails>(key: K, v: EventDetails[K]) => onChange({ ...value, [key]: v });

  function toggleStyle(style: string) {
    if (style === ANY_STYLE) return set("styles", [ANY_STYLE]);
    const without = value.styles.filter((s) => s !== ANY_STYLE && s !== style);
    const next = value.styles.includes(style) ? without : [...without, style].slice(-3);
    set("styles", next.length ? next : [ANY_STYLE]);
  }

  return (
    <fieldset className="form" disabled={disabled}>
      <div className="field">
        <span className="label" id="event-label">
          Which function is this for?
        </span>
        <div className="chips" role="radiogroup" aria-labelledby="event-label">
          {EVENT_TYPES.map((ev) => (
            <button
              key={ev}
              type="button"
              role="radio"
              aria-checked={value.event === ev}
              className="chip"
              onClick={() => set("event", ev)}
            >
              {ev}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="label" id="style-label">
          Style you love <small>(pick up to 3)</small>
        </span>
        <div className="chips" role="group" aria-labelledby="style-label">
          {STYLES.map((st) => (
            <button
              key={st}
              type="button"
              aria-pressed={value.styles.includes(st)}
              className="chip"
              onClick={() => toggleStyle(st)}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="label" id="budget-label">
          Budget
        </span>
        <div className="segmented" role="radiogroup" aria-labelledby="budget-label">
          {BUDGETS.map((b) => (
            <button
              key={b.id}
              type="button"
              role="radio"
              aria-checked={value.budget === b.id}
              onClick={() => set("budget", b.id)}
            >
              <strong>{b.label}</strong>
              <small>{b.hint}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="grid-2">
        <label className="field">
          <span className="label">Colors you want (optional)</span>
          <input
            type="text"
            value={value.colors}
            maxLength={120}
            placeholder="e.g. yellow & green, ivory & gold"
            onChange={(e) => set("colors", e.target.value)}
          />
        </label>
        <label className="field">
          <span className="label">Number of guests (optional)</span>
          <input
            type="text"
            inputMode="numeric"
            value={value.guests}
            maxLength={20}
            placeholder="e.g. 80"
            onChange={(e) => set("guests", e.target.value)}
          />
        </label>
        <label className="field">
          <span className="label">City / country (optional)</span>
          <input
            type="text"
            value={value.location}
            maxLength={80}
            placeholder="For local prices and materials"
            onChange={(e) => set("location", e.target.value)}
          />
        </label>
        <label className="field">
          <span className="label">What is this space?</span>
          <select value={value.spaceHint} onChange={(e) => set("spaceHint", e.target.value)}>
            {SPACE_HINTS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="field">
        <span className="label">Anything else the designer should know? (optional)</span>
        <textarea
          rows={3}
          value={value.notes}
          maxLength={800}
          placeholder="e.g. We want a swing for the bride, the event is in the evening, grandparents need comfortable seating…"
          onChange={(e) => set("notes", e.target.value)}
        />
      </label>
    </fieldset>
  );
}
