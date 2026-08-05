export function List(): JSX.Element {
  return <>{[1, 2].map((value) => <span key={value}>{value}</span>)}</>;
}

function Present(): JSX.Element {
  return <span>Present</span>;
}

export function StableHook(): null {
  useState(0);
  return null;
}

void Present;
declare function useState(value: number): void;
