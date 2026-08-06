import type {
  AllowWarnDeny,
  DummyRule,
  DummyRuleMap,
  OxlintConfig,
} from "oxlint";

export type RuleSeverity = "error" | "off" | "warn";

function isConfiguredRule(
  rule: DummyRule,
): rule is [AllowWarnDeny, ...unknown[]] {
  return Array.isArray(rule);
}

function explicitRuleMaps(config: OxlintConfig): DummyRuleMap[] {
  return [
    ...(config.rules === undefined ? [] : [config.rules]),
    ...(config.overrides ?? []).flatMap((override) =>
      override.rules === undefined ? [] : [override.rules],
    ),
  ];
}

/** Change an existing rule's severity while preserving its options. */
export function setRuleSeverity(
  config: OxlintConfig,
  ruleName: string,
  severity: RuleSeverity,
): void {
  for (const rules of explicitRuleMaps(config)) {
    const current = rules[ruleName];
    if (current === undefined) continue;
    rules[ruleName] = isConfiguredRule(current)
      ? [severity, ...current.slice(1)]
      : severity;
  }
}

/** Replace an existing rule's complete option list while preserving severity. */
export function configureRule(
  config: OxlintConfig,
  ruleName: string,
  options: readonly unknown[],
): void {
  for (const rules of explicitRuleMaps(config)) {
    const current = rules[ruleName];
    if (current === undefined) continue;
    const severity = isConfiguredRule(current) ? current[0] : current;
    rules[ruleName] = [severity, ...options];
  }
}

/** Disable every explicit occurrence of a rule. */
export function disableRule(config: OxlintConfig, ruleName: string): void {
  for (const rules of explicitRuleMaps(config)) {
    if (rules[ruleName] !== undefined) rules[ruleName] = "off";
  }
}

/** Add or replace a rule in the root configuration. */
export function addRule(
  config: OxlintConfig,
  ruleName: string,
  severity: RuleSeverity,
  options?: readonly unknown[],
): void {
  config.rules ??= {};
  config.rules[ruleName] =
    options === undefined ? severity : [severity, ...options];
}

/** Disable every explicit rule except one, primarily for diagnostics. */
export function disableAllRulesBut(
  config: OxlintConfig,
  keepRuleName: string,
): void {
  for (const rules of explicitRuleMaps(config)) {
    for (const ruleName of Object.keys(rules)) {
      if (ruleName !== keepRuleName) rules[ruleName] = "off";
    }
  }
}
