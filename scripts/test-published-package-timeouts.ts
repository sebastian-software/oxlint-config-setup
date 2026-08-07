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
    async (response) => response,
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

await assert.rejects(
  fetchWithTimeout(
    "stalled GitHub release body",
    "https://example.invalid/release",
    async (response) => response.json(),
    {},
    {
      timeoutMilliseconds: 10,
      fetchImplementation: async (_url, init) => {
        const body = new ReadableStream<Uint8Array>({
          start(controller) {
            init?.signal?.addEventListener("abort", () => {
              controller.error(init.signal?.reason);
            });
          },
        });
        return new Response(body, {
          headers: { "content-type": "application/json" },
        });
      },
    },
  ),
  /stalled GitHub release body timed out after 10ms while fetching/u,
);

console.log("Published-package timeout guards fail stalled operations promptly.");
