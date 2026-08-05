const config = { host: "localhost", port: 8080 };

function finalize(): number {
  try {
    return 1;
  } finally {
    console.info("complete");
  }
}

export function isString(value: unknown): value is string {
  return typeof value === "string";
}

void config;
void finalize;
