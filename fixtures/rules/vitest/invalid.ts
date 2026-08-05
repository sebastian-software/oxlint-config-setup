import { test as nodeTest } from "node:test";
import { describe, expect, test } from "vitest";

describe.only("feature", () => {
  test("works", () => expect(true).toBe(true));
  test("works", () => expect(true).toBe(true));
});

void nodeTest;
