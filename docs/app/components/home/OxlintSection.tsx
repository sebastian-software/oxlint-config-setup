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
            Oxlint is not the fast lane. It is the road.
          </h2>
          <p className="hp-section-lead">
            Oxlint remains the only lint process. Native rules cover JavaScript,
            TypeScript, imports, React, accessibility, Node.js, Vitest, and Jest;
            the package also resolves Testing Library, Playwright, and Storybook
            checks for their canonical unit-test, spec, and story files.
            Type-aware checks stay inside the same command through the pinned
            native backend.
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
