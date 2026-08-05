async function save(): Promise<void> {
  await Promise.resolve();
}

await save();

async function waitForNumber(): Promise<void> {
  await Promise.resolve(42);
}

type State = "idle" | "running" | "done";

export function label(state: State): string {
  switch (state) {
    case "idle":
      return "Idle";
    case "running":
      return "Running";
    case "done":
      return "Done";
  }
}

void waitForNumber;
