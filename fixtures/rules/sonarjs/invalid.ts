export function duplicatedIf(mode: "read" | "write" | "idle"): string {
  if (mode === "read") {
    const state = "busy";
    return state;
  } else if (mode === "write") {
    const state = "busy";
    return state;
  }
  return "idle";
}

export function duplicatedSwitch(mode: "read" | "write" | "idle"): string {
  switch (mode) {
    case "read":
      {
        const state = "busy";
        return state;
      }
    case "write":
      {
        const state = "busy";
        return state;
      }
    case "idle":
      return "idle";
  }
}
