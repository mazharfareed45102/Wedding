import type { DesignConcept } from "@/lib/schema";

export default function ConceptDetails({ concept }: { concept: DesignConcept }) {
  const { stage } = concept;
  return (
    <div className="concept-details">
      <section className="card">
        <p className="eyebrow">Why it works</p>
        <p className="lead">{concept.why_it_works}</p>
        <div className="palette" aria-label="Color palette">
          {concept.palette.map((c) => (
            <div className="swatch" key={c.hex + c.name}>
              <span style={{ background: c.hex }} aria-hidden="true" />
              <strong>{c.name}</strong>
              <small>{c.hex.toUpperCase()}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="card" aria-labelledby="stage-title">
        <p className="eyebrow">Centrepiece</p>
        <h3 id="stage-title" className="h-section">
          Stage design
        </h3>
        <dl className="spec">
          <div>
            <dt>Placement</dt>
            <dd>{stage.placement}</dd>
          </div>
          <div>
            <dt>Size</dt>
            <dd>{stage.size}</dd>
          </div>
          <div>
            <dt>Backdrop</dt>
            <dd>{stage.backdrop}</dd>
          </div>
          <div>
            <dt>Couple seating</dt>
            <dd>{stage.seating}</dd>
          </div>
          <div>
            <dt>Florals</dt>
            <dd>{stage.florals}</dd>
          </div>
          <div>
            <dt>Lighting</dt>
            <dd>{stage.lighting}</dd>
          </div>
        </dl>
      </section>

      <section className="card" aria-labelledby="zones-title">
        <p className="eyebrow">Room by room</p>
        <h3 id="zones-title" className="h-section">
          Decor around the space
        </h3>
        <div className="zones">
          {concept.decor_zones.map((z) => (
            <div className="zone" key={z.zone}>
              <strong>{z.zone}</strong>
              <p>{z.ideas}</p>
            </div>
          ))}
        </div>
        <div className="lighting-plan">
          <strong>Lighting plan</strong>
          <p>{concept.lighting_plan}</p>
        </div>
      </section>

      <section className="card" aria-labelledby="shop-title">
        <p className="eyebrow">Plan &amp; budget</p>
        <h3 id="shop-title" className="h-section">
          Shopping &amp; rental list
        </h3>
        <div className="table-wrap">
          <table className="shop">
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col">Qty</th>
                <th scope="col">Est. cost</th>
              </tr>
            </thead>
            <tbody>
              {concept.shopping_list.map((i, idx) => (
                <tr key={idx}>
                  <td>{i.item}</td>
                  <td>{i.quantity}</td>
                  <td>{i.est_cost}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" colSpan={2}>
                  Estimated total
                </th>
                <td>{concept.budget_total}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="grid-2 lists">
          <div>
            <h4>Save money</h4>
            <ul className="ticks">
              {concept.money_saving_tips.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Setup</h4>
            <ul className="plain">
              <li>
                <span>Time needed</span> {concept.setup.time_needed}
              </li>
              <li>
                <span>Crew</span> {concept.setup.crew}
              </li>
              <li>
                <span>DIY friendly</span> {concept.setup.diy_friendly ? "Yes" : "Better with a decorator"}
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
