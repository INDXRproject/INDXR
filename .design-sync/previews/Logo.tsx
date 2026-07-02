import { Logo } from '@indxr/shared/Logo';

export function Default() {
  return <Logo />;
}

export function Sizes() {
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      <Logo className="size-5" />
      <Logo className="size-8" />
      <Logo className="size-12" />
      <Logo className="size-16" />
    </div>
  );
}

export function WithText() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Logo className="size-8" />
      <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em' }}>INDXR</span>
    </div>
  );
}
