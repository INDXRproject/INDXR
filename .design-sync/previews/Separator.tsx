import { Separator } from '@indxr/shared/Separator';

export function Horizontal() {
  return (
    <div style={{ maxWidth: 320 }}>
      <p style={{ fontSize: 14, marginBottom: 12 }}>Section above</p>
      <Separator />
      <p style={{ fontSize: 14, marginTop: 12 }}>Section below</p>
    </div>
  );
}

export function Vertical() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: 32 }}>
      <span style={{ fontSize: 14 }}>Transcript</span>
      <Separator orientation="vertical" />
      <span style={{ fontSize: 14 }}>Summary</span>
      <Separator orientation="vertical" />
      <span style={{ fontSize: 14 }}>Chapters</span>
    </div>
  );
}
