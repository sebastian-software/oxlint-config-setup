declare function useEffect(effect: () => void, dependencies: unknown[]): void;
declare function useState<T>(value: T): [T, (value: T) => void];

const ThemeContext = {};

export function ConditionalHook({ enabled }: { enabled: boolean }): null {
  if (enabled) {
    useState(0);
  }
  return null;
}

export function MissingDependency({ value }: { value: string }): null {
  useEffect(() => {
    console.log(value);
  }, []);
  return null;
}

export function BrokenMarkup({ values }: { values: readonly string[] }): JSX.Element {
  return (
    <>
      {values.map((value) => <span>{value}</span>)}
      {values.map((value, index) => <span key={index}>{value}</span>)}
      <div className="first" className="second" />
      <div class="not-react" />
      <a href="javascript:void(0)">Unsafe action</a>
      <a href="https://example.com" target="_blank">External link</a>
      <img src="logo.svg" />
      <div onClick={() => undefined}>Keyboard inaccessible action</div>
    </>
  );
}

export function UnstableContext(): JSX.Element {
  return <ThemeContext.Provider value={{ mode: "light" }} />;
}

export function Parent(): JSX.Element {
  function Child(): JSX.Element {
    return <span>Nested component</span>;
  }
  return <Child />;
}

export const cacheKey = "not a component";
