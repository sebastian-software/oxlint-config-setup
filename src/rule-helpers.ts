import type {
  AllowWarnDeny,
  DummyRule,
  DummyRuleMap,
  OxlintConfig,
} from "oxlint";

import {
  assertKnownScopedConfig,
  scopedConfigForOverride,
  type ScopedConfig,
} from "./composition.js";

export type RuleSeverity = "error" | "off" | "warn";

export interface RuleTarget {
  scope?: ScopedConfig;
}

function isConfiguredRule(
  rule: DummyRule,
): rule is [AllowWarnDeny, ...unknown[]] {
  return Array.isArray(rule);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function mergeOption(current: unknown, update: unknown): unknown {
  if (!isPlainObject(current) || !isPlainObject(update)) return update;

  return {
    ...current,
    ...Object.fromEntries(
      Object.entries(update).map(([key, value]) => [
        key,
        mergeOption(current[key], value),
      ]),
    ),
  };
}

function mergeOptions(
  current: readonly unknown[],
  updates: readonly unknown[],
): unknown[] {
  return Array.from(
    { length: Math.max(current.length, updates.length) },
    (_, index) =>
      index < updates.length
        ? mergeOption(current[index], updates[index])
        : current[index],
  );
}

function explicitRuleMaps(
  config: OxlintConfig,
  target: RuleTarget | undefined,
): DummyRuleMap[] {
  const scope = target?.scope;
  if (scope !== undefined) {
    assertKnownScopedConfig(scope);
    const scopedRules = (config.overrides ?? []).flatMap((override) => {
      if (scopedConfigForOverride(override) !== scope) return [];
      override.rules ??= {};
      return [override.rules];
    });
    if (scopedRules.length === 0) {
      throw new RangeError(`Oxlint config does not contain scope: ${scope}`);
    }
    return scopedRules;
  }
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
  target?: RuleTarget,
): void {
  for (const rules of explicitRuleMaps(config, target)) {
    const current = rules[ruleName];
    if (current === undefined) continue;
    rules[ruleName] = isConfiguredRule(current)
      ? [severity, ...current.slice(1)]
      : severity;
  }
}

/** Merge an existing rule's options while preserving severity. */
export function configureRule(
  config: OxlintConfig,
  ruleName: string,
  options: readonly unknown[],
  target?: RuleTarget,
): void {
  for (const rules of explicitRuleMaps(config, target)) {
    const current = rules[ruleName];
    if (current === undefined || options.length === 0) continue;
    const severity = isConfiguredRule(current) ? current[0] : current;
    const currentOptions = isConfiguredRule(current) ? current.slice(1) : [];
    rules[ruleName] = [severity, ...mergeOptions(currentOptions, options)];
  }
}

/** Disable every explicit occurrence of a rule. */
export function disableRule(
  config: OxlintConfig,
  ruleName: string,
  target?: RuleTarget,
): void {
  for (const rules of explicitRuleMaps(config, target)) {
    if (rules[ruleName] !== undefined) rules[ruleName] = "off";
  }
}

/** Add or replace a rule in the root configuration. */
export function addRule(
  config: OxlintConfig,
  ruleName: string,
  severity: RuleSeverity,
  options?: readonly unknown[],
  target?: RuleTarget,
): void {
  if (target?.scope !== undefined) {
    const [rules] = explicitRuleMaps(config, target);
    rules[ruleName] =
      options === undefined ? severity : [severity, ...options];
    return;
  }
  config.rules ??= {};
  config.rules[ruleName] =
    options === undefined ? severity : [severity, ...options];
}

/** Disable every explicit rule except one, primarily for diagnostics. */
export function disableAllRulesBut(
  config: OxlintConfig,
  keepRuleName: string,
  target?: RuleTarget,
): void {
  for (const rules of explicitRuleMaps(config, target)) {
    for (const ruleName of Object.keys(rules)) {
      if (ruleName !== keepRuleName) rules[ruleName] = "off";
    }
  }
}
