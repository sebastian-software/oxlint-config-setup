import { spawnSync } from "node:child_process";

export type ProcessFailureKind =
  | "success"
  | "diagnostics"
  | "configuration"
  | "timeout"
  | "crash";

export interface ProcessResult {
  kind: ProcessFailureKind;
  status: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
}

export interface OxlintDiagnostic {
  code: string;
  filename: string;
  labels: Array<{
    span: {
      line: number;
      column: number;
    };
  }>;
  severity: "warning" | "error";
}

export interface OxlintJsonResult {
  diagnostics: OxlintDiagnostic[];
  number_of_files: number;
  number_of_rules: number;
}

export function runProcess(
  binary: string,
  args: readonly string[],
  options: { cwd: string; timeout?: number },
): ProcessResult {
  const result = spawnSync(binary, args, {
    cwd: options.cwd,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
    timeout: options.timeout ?? 15_000,
  });
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";

  if (
    result.error !== undefined &&
    "code" in result.error &&
    result.error.code === "ETIMEDOUT"
  ) {
    return {
      kind: "timeout",
      status: result.status,
      signal: result.signal,
      stdout,
      stderr,
    };
  }
  if (result.signal !== null) {
    return {
      kind: "crash",
      status: result.status,
      signal: result.signal,
      stdout,
      stderr,
    };
  }
  if (result.status === 0) {
    return { kind: "success", status: 0, signal: null, stdout, stderr };
  }
  if (result.status === 1 && stdout.trimStart().startsWith("{")) {
    return {
      kind: "diagnostics",
      status: 1,
      signal: null,
      stdout,
      stderr,
    };
  }
  return {
    kind: "configuration",
    status: result.status,
    signal: null,
    stdout,
    stderr,
  };
}

export function parseOxlintJson(result: ProcessResult): OxlintJsonResult {
  if (result.kind !== "success" && result.kind !== "diagnostics") {
    throw new Error(
      `Oxlint did not produce diagnostics (${result.kind}, status ${String(result.status)}, signal ${String(result.signal)}): ${result.stderr || result.stdout}`,
    );
  }
  const value = JSON.parse(result.stdout) as Partial<OxlintJsonResult>;
  if (!Array.isArray(value.diagnostics)) {
    throw new TypeError("Oxlint JSON output is missing diagnostics");
  }
  return value as OxlintJsonResult;
}

export function normalizeDiagnosticCode(code: string): string {
  const match = /^(?<plugin>[^()]+)\((?<rule>[^()]+)\)$/u.exec(code);
  if (!match?.groups) return code;
  const plugin = match.groups.plugin === "react-hooks" ? "react" : match.groups.plugin;
  return `${plugin}/${match.groups.rule}`;
}
