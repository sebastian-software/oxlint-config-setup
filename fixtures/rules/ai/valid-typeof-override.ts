const expectedType = "string";

export function hasExpectedType(value: unknown): boolean {
  return typeof value === expectedType;
}
