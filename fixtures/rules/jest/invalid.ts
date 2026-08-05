import { describe, expect, test } from "@jest/globals";

jasmine.DEFAULT_TIMEOUT_INTERVAL = 5000;

describe.only("feature", () => {
  test.only("works", () => expect(true).toBe(true));
  test("works", () => expect(true).toBe(true));
});
