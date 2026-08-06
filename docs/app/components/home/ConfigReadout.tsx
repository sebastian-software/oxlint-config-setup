import type {
  ConfigSelection,
  ConfigStats,
} from "../../lib/configStats.js";

import { CodeBlock } from "./CodeBlock.js";
import { buildConfigSnippet } from "./configuratorData.js";

type ConfigReadoutProps = {
  selection: ConfigSelection;
  stats: ConfigStats;
};

export function ConfigReadout({ selection, stats }: ConfigReadoutProps) {
  return (
    <div className="hp-readout">
      <CodeBlock
        code={buildConfigSnippet(selection)}
        title="oxlint.config.ts"
      />
      <div aria-atomic="true" aria-live="polite" className="hp-readout-stats">
        <p className="hp-readout-primary">
          <span className="hp-readout-number">{stats.activeRules}</span>
          <span> active rules</span>
        </p>
        <dl className="hp-readout-details">
          <div>
            <dt>Plugins</dt>
            <dd>{stats.plugins}</dd>
          </div>
          <div>
            <dt>JSON</dt>
            <dd>{stats.artifactKb} KB</dd>
          </div>
          <div>
            <dt>Export</dt>
            <dd>
              <code>{stats.publicName}</code>
            </dd>
          </div>
        </dl>
        <p className="hp-readout-file">
          resolves to <code>{stats.fileName}</code>
        </p>
      </div>
    </div>
  );
}
