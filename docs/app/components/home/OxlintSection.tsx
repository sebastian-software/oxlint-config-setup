import { Link } from "react-router";

import { CodeBlock } from "./CodeBlock.js";

const COMMAND = `// package.json
{
  "scripts": {
    "lint": "oxlint ."
  }
}`;

export function OxlintSection() {
  return (
    <section aria-labelledby="hp-oxlint-title" className="hp-section hp-section-muted">
      <div className="hp-container hp-split">
        <div className="hp-section-head">
          <h2 className="hp-section-title" id="hp-oxlint-title">
            Type information without the second linter.
          </h2>
          <p className="hp-section-lead">
            Native Oxlint rules cover JavaScript, TypeScript, imports, React,
            accessibility, Node.js, Vitest, and Jest. When a TypeScript rule
            needs semantic information, the same command uses the pinned{" "}
            <code>oxlint-tsgolint</code> backend. Package-owned Testing Library,
            Playwright, and Storybook compatibility runtimes remain scoped to
            canonical test, spec, and story files. There is no parallel ESLint
            process.
          </p>
          <p className="hp-section-close">
            One configuration model. One diagnostic stream. One place to update.
          </p>
          <p className="hp-inline-link">
            <Link to="/guide/architecture">See the runtime architecture</Link>
          </p>
        </div>
        <CodeBlock code={COMMAND} title="package.json" />
      </div>
    </section>
  );
}
