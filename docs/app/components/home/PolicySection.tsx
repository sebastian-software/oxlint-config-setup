import { Link } from "react-router";

import { getConfigStats } from "../../lib/configStats.js";

const LEVEL_ROWS = [
  {
    count: getConfigStats({
      ai: false,
      level: "essential",
      node: false,
      react: false,
    }).activeRules,
    description:
      "Oxlint correctness rules for the lowest-noise supported baseline.",
    label: "Essential",
  },
  {
    count: getConfigStats({
      ai: false,
      level: "recommended",
      node: false,
      react: false,
    }).activeRules,
    description: "Adds suspicious and performance rules. This is the default.",
    label: "Recommended",
  },
  {
    count: getConfigStats({
      ai: false,
      level: "strict",
      node: false,
      react: false,
    }).activeRules,
    description:
      "Adds pedantic, style, and restriction rules while nursery stays off.",
    label: "Strict",
  },
] as const;

export function PolicySection() {
  return (
    <section aria-labelledby="hp-policy-title" className="hp-section">
      <div className="hp-container hp-split hp-split-policy">
        <div className="hp-section-head">
          <h2 className="hp-section-title" id="hp-policy-title">
            Strict should mean chosen, not bundled.
          </h2>
          <p className="hp-section-lead">
            Each level adds stable native Oxlint categories. The build expands
            them into explicit rules, so moving up is predictable, reviewable,
            and every higher level remains a strict superset.
          </p>
          <p className="hp-inline-link">
            <Link to="/guide/configuration">Compare the policy levels</Link>
          </p>
        </div>
        <ol className="hp-level-ledger">
          {LEVEL_ROWS.map((level, index) => (
            <li key={level.label}>
              <span className="hp-level-index">0{index + 1}</span>
              <div>
                <h3>{level.label}</h3>
                <p>{level.description}</p>
              </div>
              <span className="hp-level-count">
                {level.count} <small>base rules</small>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
