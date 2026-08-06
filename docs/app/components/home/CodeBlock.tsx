import { tokenize } from "./highlight.js";

type CodeBlockProps = {
  className?: string;
  code: string;
  title?: string;
};

export function CodeBlock({ className, code, title }: CodeBlockProps) {
  const tokens = tokenize(code);
  const classes = className === undefined ? "hp-code" : `hp-code ${className}`;

  return (
    <figure className={classes}>
      {title === undefined ? null : (
        <figcaption className="hp-code-title">{title}</figcaption>
      )}
      <pre className="hp-code-pre">
        <code>
          {tokens.map((token) =>
            token.type === "space" ? (
              token.value
            ) : (
              <span className={`hp-tk-${token.type}`} key={token.start}>
                {token.value}
              </span>
            ),
          )}
        </code>
      </pre>
    </figure>
  );
}
