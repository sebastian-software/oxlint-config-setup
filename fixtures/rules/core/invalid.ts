debugger;

const config = { port: 1, port: 2 };

function finalize(): number {
  try {
    return 1;
  } finally {
    return 2;
  }
}

export function isString(value: unknown): boolean {
  return typeof value === "strnig";
}

void config;
void finalize;
