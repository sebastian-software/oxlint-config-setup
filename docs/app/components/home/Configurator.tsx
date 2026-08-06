import { useState } from "react";

import type {
  ConfigLevel,
  ConfigSelection,
} from "../../lib/configStats.js";
import { getConfigStats } from "../../lib/configStats.js";

import { ConfigReadout } from "./ConfigReadout.js";
import { FLAGS, LEVELS } from "./configuratorData.js";

const DEFAULT_SELECTION: ConfigSelection = {
  ai: false,
  level: "recommended",
  node: false,
  react: true,
};

export function Configurator() {
  const [selection, setSelection] =
    useState<ConfigSelection>(DEFAULT_SELECTION);
  const stats = getConfigStats(selection);

  function chooseLevel(level: ConfigLevel) {
    setSelection((current) => ({ ...current, level }));
  }

  function toggleFlag(flag: "ai" | "node" | "react") {
    setSelection((current) => ({ ...current, [flag]: !current[flag] }));
  }

  return (
    <section aria-labelledby="hp-configurator-title" className="hp-section">
      <div className="hp-container">
        <div className="hp-section-head">
          <h2 className="hp-section-title" id="hp-configurator-title">
            Your configuration already exists.
          </h2>
          <p className="hp-section-lead">
            Choose intent, not implementation details. Every combination below
            maps to a complete artifact generated and tested before release.
          </p>
        </div>

        <div className="hp-configurator">
          <div className="hp-configurator-controls">
            <fieldset className="hp-control-group">
              <legend>Policy level</legend>
              <div className="hp-level-options">
                {LEVELS.map((level) => (
                  <label className="hp-level-option" key={level.id}>
                    <input
                      checked={selection.level === level.id}
                      name="policy-level"
                      onChange={() => chooseLevel(level.id)}
                      type="radio"
                      value={level.id}
                    />
                    <span className="hp-control-label">{level.label}</span>
                    <span className="hp-control-description">
                      {level.description}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="hp-control-group">
              <legend>Project context</legend>
              <div className="hp-flag-options">
                {FLAGS.map((flag) => (
                  <label className="hp-flag-option" key={flag.id}>
                    <input
                      checked={selection[flag.id]}
                      onChange={() => toggleFlag(flag.id)}
                      type="checkbox"
                    />
                    <span aria-hidden="true" className="hp-toggle-track">
                      <span className="hp-toggle-thumb" />
                    </span>
                    <span>
                      <span className="hp-control-label">{flag.label}</span>
                      <span className="hp-control-description">
                        {flag.description}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="hp-configurator-output">
            <ConfigReadout selection={selection} stats={stats} />
          </div>
        </div>
        <p className="hp-section-close">
          Same selection, same artifact — on a laptop, in CI, and on the next
          clean install.
        </p>
      </div>
    </section>
  );
}
