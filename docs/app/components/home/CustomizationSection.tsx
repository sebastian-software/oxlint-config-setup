import { Link } from "react-router";

import { CodeBlock } from "./CodeBlock.js";

const CUSTOMIZATION = `import {
  configureRule,
  disableRule,
  getOxlintConfig,
  setRuleSeverity,
} from "oxlint-config-setup";

const config = getOxlintConfig({ ai: true });

configureRule(config, "eslint/valid-typeof", [
  { requireStringLiterals: true },
]);
setRuleSeverity(config, "eslint/no-warning-comments", "error");
disableRule(config, "import/no-duplicates");

export default config;`;

export function CustomizationSection() {
  return (
    <section
      aria-labelledby="hp-customization-title"
      className="hp-section hp-section-muted"
    >
      <div className="hp-container hp-split hp-split-code">
        <CodeBlock code={CUSTOMIZATION} title="oxlint.config.ts" />
        <div className="hp-section-head">
          <h2 className="hp-section-title" id="hp-customization-title">
            Opinionated does not mean sealed shut.
          </h2>
          <p className="hp-section-lead">
            Keep the prebuilt policy and adjust the exceptions that are genuinely
            yours. The helper API changes severities, merges detailed option
            objects, disables rules, adds project rules, or isolates one rule for
            diagnostics.
          </p>
          <p className="hp-section-close">
            Option patches merge recursively, so changing one nested value does
            not erase the rest of the preset.
          </p>
          <p className="hp-inline-link">
            <Link to="/guide/rule-customization">
              Customize rules without forking the preset
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
