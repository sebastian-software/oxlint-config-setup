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
          <p className="hp-hero-kicker">Type-aware by default</p>
          <h1 className="hp-hero-title">
            <span>Native Oxlint.</span>
            <span>Type-aware TypeScript.</span>
            <span>One complete preset.</span>
          </h1>
          <p className="hp-hero-sub">
            Run fast native rules and semantic checks such as unhandled promises
            through one Oxlint command. Every policy level includes the pinned
            type-aware backend; React, Node.js, and AI remain deliberate
            additions.
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
            This starts with one of 24 complete core artifacts, then adds
            convention-based test, spec, and story overrides. Type-aware linting
            is enabled by default; syntax-only is explicit. No parallel ESLint
            process.
          </p>
        </div>
      </div>
    </header>
  );
}
