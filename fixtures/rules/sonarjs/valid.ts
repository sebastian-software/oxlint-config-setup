export function describeState(active: boolean): string {
  if (active) {
    return "active";
  }
  return "inactive";
}

export function describeMode(mode: "read" | "write"): string {
  switch (mode) {
    case "read":
      return "reading";
    case "write":
      return "writing";
  }
}

export const visibleState = (active: boolean): string =>
  active ? "visible" : "hidden";
