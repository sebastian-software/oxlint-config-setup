import { execFileSync, type ExecFileSyncOptions } from "node:child_process";

export const EXTERNAL_OPERATION_TIMEOUT_MILLISECONDS = 30_000;

interface CommandOptions {
  cwd?: string;
  stdio?: ExecFileSyncOptions["stdio"];
  timeoutMilliseconds?: number;
}

interface FetchOptions {
  fetchImplementation?: typeof fetch;
  timeoutMilliseconds?: number;
}

interface CommandFailure extends NodeJS.ErrnoException {
  signal?: string;
}

function timedOut(error: unknown): boolean {
  return (
    error instanceof Error &&
    ((error as CommandFailure).code === "ETIMEDOUT" ||
      (error as CommandFailure).signal === "SIGTERM")
  );
}

export function runCommand(
  operation: string,
  binary: string,
  args: string[],
  options: CommandOptions = {},
): string {
  const timeoutMilliseconds =
    options.timeoutMilliseconds ?? EXTERNAL_OPERATION_TIMEOUT_MILLISECONDS;
  try {
    return (
      execFileSync(binary, args, {
        cwd: options.cwd,
        encoding: "utf8",
        env: { ...process.env, NO_COLOR: "1" },
        stdio: options.stdio ?? ["ignore", "pipe", "pipe"],
        timeout: timeoutMilliseconds,
      }) ?? ""
    );
  } catch (error: unknown) {
    if (timedOut(error)) {
      throw new Error(
        `${operation} timed out after ${timeoutMilliseconds}ms while running ${binary}`,
        { cause: error },
      );
    }
    throw error;
  }
}

export async function fetchWithTimeout<T>(
  operation: string,
  url: string,
  consume: (response: Response) => Promise<T>,
  init: RequestInit = {},
  options: FetchOptions = {},
): Promise<T> {
  const timeoutMilliseconds =
    options.timeoutMilliseconds ?? EXTERNAL_OPERATION_TIMEOUT_MILLISECONDS;
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMilliseconds);
  try {
    const response = await (options.fetchImplementation ?? fetch)(url, {
      ...init,
      signal: controller.signal,
    });
    return await consume(response);
  } catch (error: unknown) {
    if (controller.signal.aborted) {
      throw new Error(
        `${operation} timed out after ${timeoutMilliseconds}ms while fetching ${url}`,
        { cause: error },
      );
    }
    throw new Error(`${operation} failed while fetching ${url}`, { cause: error });
  } finally {
    clearTimeout(timeout);
  }
}
