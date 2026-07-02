import { Avatar, AvatarFallback } from '@indxr/shared/Avatar';

const circle = (size: number, fs: number): React.CSSProperties => ({
  width: size,
  height: size,
  borderRadius: '50%',
  background: '#e5e7eb',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: fs,
  fontWeight: 500,
  flexShrink: 0,
  overflow: 'hidden',
});

export function WithFallback() {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <div style={circle(32, 11)}>KH</div>
      <div style={circle(32, 11)}>AB</div>
      <div style={circle(32, 11)}>JD</div>
    </div>
  );
}

export function Sizes() {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <div style={circle(24, 8)}>XS</div>
      <div style={circle(32, 11)}>SM</div>
      <div style={circle(40, 14)}>MD</div>
      <div style={circle(56, 18)}>LG</div>
    </div>
  );
}
