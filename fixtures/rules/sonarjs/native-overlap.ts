declare function record(value: string): void;

export function sharedPrefix(active: boolean): void {
  if (active) {
    record("shared");
    record("active");
  } else {
    record("shared");
    record("inactive");
  }
}
