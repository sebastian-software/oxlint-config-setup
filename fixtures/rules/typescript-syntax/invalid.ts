// @ts-ignore
const ignored: number = "not a number";

enum Status {
  Ready = 1,
  Done = 1,
}

declare const optional: string | undefined;
const asserted = optional!!;

void ignored;
void Status;
void asserted;
