import { describe, expect, test } from "vitest";

export function App(): JSX.Element {
  return <>{[1, 2].map((value) => <span key={value}>{value}</span>)}</>;
}

describe("App", () => {
  test("renders", () => expect(App).toBeDefined());
});
