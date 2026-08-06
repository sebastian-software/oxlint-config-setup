import type {
  ConfigStats,
  ProjectRuleGroup,
  RuleGroup,
} from "../../lib/configStats.js";

type ConfigReadoutProps = {
  stats: ConfigStats;
};

function RuleList({ rules }: { rules: string[] }) {
  return (
    <ul className="hp-rule-list">
      {rules.map((rule) => (
        <li key={rule}>
          <code>{rule}</code>
        </li>
      ))}
    </ul>
  );
}

function PolicyRuleGroup({ group }: { group: RuleGroup }) {
  return (
    <details className="hp-rule-group">
      <summary>
        <span>{group.label}</span>
        <span>{group.rules.length}</span>
      </summary>
      <RuleList rules={group.rules} />
    </details>
  );
}

function ProjectRuleDetails({ group }: { group: ProjectRuleGroup }) {
  const changeCount = group.added.length + group.adjusted.length;

  return (
    <details className="hp-rule-group">
      <summary>
        <span>{group.label}</span>
        <span>{changeCount}</span>
      </summary>
      {group.added.length > 0 ? (
        <div className="hp-rule-change">
          <p>
            <span>Added</span>
            <span>{group.added.length}</span>
          </p>
          <RuleList rules={group.added} />
        </div>
      ) : null}
      {group.adjusted.length > 0 ? (
        <div className="hp-rule-change">
          <p>
            <span>Adjusted</span>
            <span>{group.adjusted.length}</span>
          </p>
          <RuleList rules={group.adjusted} />
        </div>
      ) : null}
    </details>
  );
}

export function ConfigReadout({ stats }: ConfigReadoutProps) {
  return (
    <div className="hp-readout">
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

      <div className="hp-rule-breakdown">
        <section aria-labelledby="hp-policy-rules-title">
          <div className="hp-rule-column-head">
            <h3 id="hp-policy-rules-title">Policy level</h3>
            <p>
              {stats.policyRules.reduce(
                (total, group) => total + group.rules.length,
                0,
              )}{" "}
              base rules
            </p>
          </div>
          <div className="hp-rule-groups">
            {stats.policyRules.map((group) => (
              <PolicyRuleGroup group={group} key={group.id} />
            ))}
          </div>
        </section>

        <section aria-labelledby="hp-context-rules-title">
          <div className="hp-rule-column-head">
            <h3 id="hp-context-rules-title">Project context</h3>
            <p>Rules added or adjusted by the selected context</p>
          </div>
          {stats.projectRules.length > 0 ? (
            <div className="hp-rule-groups">
              {stats.projectRules.map((group) => (
                <ProjectRuleDetails group={group} key={group.id} />
              ))}
            </div>
          ) : (
            <p className="hp-rule-empty">
              No project-specific additions in this selection.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
