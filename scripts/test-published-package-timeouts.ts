import assert from "node:assert/strict";

import {
  fetchWithTimeout,
  runCommand,
} from "./published-package-timeouts.js";

assert.throws(
  () =>
    runCommand(
      "stalled npm metadata query",
      process.execPath,
      ["-e", "setTimeout(() => {}, 1_000)"],
      { timeoutMilliseconds: 10 },
    ),
  /stalled npm metadata query timed out after 10ms while running/u,
);

await assert.rejects(
  fetchWithTimeout(
    "stalled GitHub release query",
    "https://example.invalid/release",
    {},
    {
      timeoutMilliseconds: 10,
      fetchImplementation: async (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(init.signal?.reason);
          });
        }),
    },
  ),
  /stalled GitHub release query timed out after 10ms while fetching/u,
);

console.log("Published-package timeout guards fail stalled operations promptly.");
