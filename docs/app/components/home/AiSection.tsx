import { Link } from "react-router";

import { getConfigStats } from "../../lib/configStats.js";

const WITHOUT_AI = getConfigStats({
  ai: false,
  level: "recommended",
  node: false,
  react: true,
});
const WITH_AI = getConfigStats({
  ai: true,
  level: "recommended",
  node: false,
  react: true,
});

export function AiSection() {
  return (
    <section aria-labelledby="hp-ai-title" className="hp-section">
      <div className="hp-container">
        <div className="hp-section-head hp-section-head-narrow">
          <h2 className="hp-section-title" id="hp-ai-title">
            AI is an overlay, not a fourth policy level.
          </h2>
          <p className="hp-section-lead">
            Generated code can absorb feedback that would be tedious to enforce
            manually. The overlay may tighten a rule your level already enabled,
            or add an explicitly AI-only guardrail. It cannot reach into a higher
            policy level and switch those rules on by surprise.
          </p>
        </div>

        <div className="hp-ai-contract">
          <p>
            <span className="hp-num">{WITHOUT_AI.activeRules}</span>
            <small>recommended + React</small>
          </p>
          <span aria-hidden="true" className="hp-ai-arrow">
            →
          </span>
          <p>
            <span className="hp-num">{WITH_AI.activeRules}</span>
            <small>with the AI overlay</small>
          </p>
          <p className="hp-ai-contract-note">
            The small rule-count change is deliberate. Most AI behavior comes
            from tightening options on rules that are already active.
          </p>
        </div>

        <ul className="hp-guardrails">
          <li>Never activates a higher-level rule.</li>
          <li>Never weakens or disables an active rule.</li>
          <li>Every AI-only addition needs a distinct rationale.</li>
        </ul>
        <p className="hp-inline-link">
          <Link to="/guide/ai-mode">Read the complete AI contract</Link>
        </p>
      </div>
    </section>
  );
}
