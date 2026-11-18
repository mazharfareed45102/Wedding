import type { DesignResult } from "@/lib/schema";

export default function SpaceReport({ design }: { design: DesignResult }) {
  const { space } = design;
  return (
    <section className="card space-report" aria-labelledby="space-title">
      <p className="eyebrow">The designer&rsquo;s read of your space</p>
      <h2 id="space-title">{space.space_type}</h2>
      <p className="lead">{space.summary}</p>

      <div className="facts">
        <div>
          <span>Approx. size</span>
          <strong>{space.estimated_size}</strong>
        </div>
        <div>
          <span>Guest capacity</span>
          <strong>{space.guest_capacity}</strong>
        </div>
        <div>
          <span>Light &amp; power</span>
          <strong>{space.light}</strong>
        </div>
      </div>

      <div className="stage-spot">
        <span className="stage-spot-icon" aria-hidden="true">
          ★
        </span>
        <div>
          <strong>Best spot for the stage</strong>
          <p>{space.best_stage_spot}</p>
        </div>
      </div>

      <div className="grid-2 lists">
        <div>
          <h3>Working in your favour</h3>
          <ul className="ticks">
            {space.strengths.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3>What we&rsquo;ll design around</h3>
          <ul className="notes-list">
            {space.challenges.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
