import { Input } from '@indxr/shared/Input';

export function Default() {
  return <Input placeholder="Search transcripts…" style={{ maxWidth: 320 }} />;
}

export function Types() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 320 }}>
      <Input type="text" placeholder="Full name" />
      <Input type="email" placeholder="you@example.com" />
      <Input type="password" placeholder="Password" />
      <Input type="url" placeholder="https://youtube.com/watch?v=…" />
    </div>
  );
}

export function States() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 320 }}>
      <Input placeholder="Enabled" />
      <Input placeholder="Disabled" disabled />
      <Input placeholder="With value" defaultValue="My transcript notes" />
    </div>
  );
}
