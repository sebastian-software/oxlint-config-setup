import React from "react";

declare function useEffect(effect: () => void, dependencies: unknown[]): void;
declare function useMemo<T>(create: () => T, dependencies: unknown[]): T;
declare function useState<T>(value: T): [T, (value: T) => void];

const ThemeContext = {};

export function AccessibleList({ values }: { values: readonly string[] }): JSX.Element {
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const theme = useMemo(() => ({ mode: "light" }), []);

  useEffect(() => {
    document.title = selected ?? "Nothing selected";
  }, [selected]);

  return (
    <ThemeContext.Provider value={theme}>
      <ul>
        {values.map((value) => (
          <li key={value}>
            <button type="button" onClick={() => setSelected(value)}>
              {value}
            </button>
          </li>
        ))}
      </ul>
      <a href="https://example.com" target="_blank" rel="noreferrer">
        Documentation
      </a>
      <img src="logo.svg" alt="Product logo" />
    </ThemeContext.Provider>
  );
}
