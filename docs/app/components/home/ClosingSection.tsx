import { Link } from "react-router";

import { InstallCommand } from "./InstallCommand.js";

export function ClosingSection() {
  return (
    <section aria-labelledby="hp-closing-title" className="hp-closing">
      <div className="hp-container">
        <h2 id="hp-closing-title">Set the policy once. Let Oxlint repeat it.</h2>
        <p>
          Start with recommended, add only the project contexts you actually
          use, and tighten from evidence instead of inheriting a mystery stack.
        </p>
        <InstallCommand />
        <p className="hp-closing-links">
          <Link to="/guide/getting-started">Follow the installation guide</Link>
          <span aria-hidden="true"> · </span>
          <Link to="/reference/rule-catalog">Inspect every selected rule</Link>
        </p>
      </div>
    </section>
  );
}
