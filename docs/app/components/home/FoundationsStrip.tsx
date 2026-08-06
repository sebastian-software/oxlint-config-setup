const FOUNDATIONS = [
  ["Oxlint", "https://oxc.rs"],
  ["TypeScript", "https://www.typescriptlang.org"],
  ["React", "https://react.dev"],
  ["Node.js", "https://nodejs.org"],
  ["Vitest", "https://vitest.dev"],
  ["Jest", "https://jestjs.io"],
] as const;

export function FoundationsStrip() {
  return (
    <section aria-label="Supported ecosystem" className="hp-foundations">
      <div className="hp-container">
        <p>Built for</p>
        <ul>
          {FOUNDATIONS.map(([name, href]) => (
            <li key={name}>
              <a href={href}>{name}</a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
