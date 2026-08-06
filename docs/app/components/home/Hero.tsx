import { Link } from "react-router";

import type { ConfigSelection } from "../../lib/configStats.js";

import { CodeBlock } from "./CodeBlock.js";
import {
  buildConfigSnippet,
  REPOSITORY_URL,
} from "./configuratorData.js";
import { InstallCommand } from "./InstallCommand.js";

const HERO_SELECTION: ConfigSelection = {
  ai: true,
  level: "recommended",
  node: false,
  react: true,
};

export function Hero() {
  return (
    <header className="hp-hero">
      <div className="hp-container hp-hero-grid">
        <div className="hp-hero-copy">
          <h1 className="hp-hero-title">
            <span>One native linter.</span>
            <span>Three deliberate levels.</span>
            <span>No accidental strictness.</span>
          </h1>
          <p className="hp-hero-sub">
            Prebuilt Oxlint configurations for modern TypeScript projects. Pick
            the policy your team can sustain, add React or Node.js where they
            belong, and layer on AI guardrails without smuggling stricter human
            policy into the build.
          </p>
          <InstallCommand />
          <p className="hp-hero-links">
            <Link to="/guide/getting-started">Install in five minutes</Link>
            <span aria-hidden="true"> · </span>
            <a href={REPOSITORY_URL}>Inspect the repository</a>
          </p>
        </div>
        <div className="hp-hero-proof">
          <CodeBlock
            code={buildConfigSnippet(HERO_SELECTION)}
            title="oxlint.config.ts"
          />
          <p>
            This selects one of 24 complete JSON artifacts. No runtime preset
            graph. No ESLint compatibility layer.
          </p>
        </div>
      </div>
    </header>
  );
}
