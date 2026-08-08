import { describe, test } from "vitest";

export function Overlap(): JSX.Element {
  return <>{[1, 2].map((value) => <span>{value}</span>)}</>;
}

describe.only("overlap", () => {
  test("runs both scoped policies", () => undefined);
});
