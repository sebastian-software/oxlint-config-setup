// @ts-expect-error -- the fixture intentionally proves a checked suppression
const checked: number = "not a number";

enum Status {
  Ready = 1,
  Done = 2,
}

declare const optional: string | undefined;
const asserted = optional!;

void checked;
void Status;
void asserted;
