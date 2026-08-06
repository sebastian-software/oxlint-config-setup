export type Token = {
  start: number;
  type: string;
  value: string;
};

const PATTERN =
  /(?<space>\s+)|(?<comment>\/\/[^\n]*)|(?<string>"[^"]*"|'[^']*')|(?<keyword>\b(?:import|from|export|default|const|type|satisfies)\b)|(?<atom>\b(?:true|false|null|undefined|\d+(?:\.\d+)?)\b)|(?<fn>[A-Za-z_$][\w$]*(?=\())|(?<key>[A-Za-z_$][\w$]*(?=\s*:))|(?<ident>[A-Za-z_$][\w$]*)|(?<punc>\S)/y;

const TOKEN_TYPES = [
  "space",
  "comment",
  "string",
  "keyword",
  "atom",
  "fn",
  "key",
  "ident",
  "punc",
] as const;

function tokenType(groups: Record<string, string | undefined>): string {
  return (
    TOKEN_TYPES.find((type) => groups[type] !== undefined) ?? "punc"
  );
}

export function tokenize(code: string): Token[] {
  const tokens: Token[] = [];
  PATTERN.lastIndex = 0;
  let match = PATTERN.exec(code);

  while (match !== null) {
    tokens.push({
      start: match.index,
      type: tokenType(match.groups ?? {}),
      value: match[0],
    });
    match = PATTERN.exec(code);
  }

  return tokens;
}
