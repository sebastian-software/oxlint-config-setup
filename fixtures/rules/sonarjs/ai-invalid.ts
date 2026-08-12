export function nestedSelection(outer: string, inner: string): number {
  switch (outer) {
    case "outer":
      switch (inner) {
        case "inner":
          return 1;
        default:
          return 2;
      }
    default:
      return 3;
  }
}
