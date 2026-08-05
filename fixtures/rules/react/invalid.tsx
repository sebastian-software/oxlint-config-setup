export function List(): JSX.Element {
  return <>{[1, 2].map((value) => <span>{value}</span>)}</>;
}

export function UndefinedComponent(): JSX.Element {
  return <Missing />;
}

export function ConditionalHook({ enabled }: { enabled: boolean }): null {
  if (enabled) {
    useState(0);
  }
  return null;
}

declare function useState(value: number): void;
