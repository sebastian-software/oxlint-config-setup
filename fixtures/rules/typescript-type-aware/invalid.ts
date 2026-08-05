async function save(): Promise<void> {
  await Promise.resolve();
}

save();

async function waitForNumber(): Promise<void> {
  await 42;
}

type State = "idle" | "running" | "done";

export function label(state: State): string {
  switch (state) {
    case "idle":
      return "Idle";
    case "running":
      return "Running";
  }
}

void waitForNumber;
