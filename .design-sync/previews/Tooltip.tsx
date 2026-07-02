import { Button } from '@indxr/shared/Button';

const bubble: React.CSSProperties = {
  display: 'inline-block',
  background: '#1a1a1a',
  color: '#ffffff',
  fontSize: 12,
  padding: '4px 10px',
  borderRadius: 6,
  position: 'relative',
  whiteSpace: 'nowrap',
};

const arrow: React.CSSProperties = {
  position: 'absolute',
  bottom: -4,
  left: '50%',
  transform: 'translateX(-50%) rotate(45deg)',
  width: 8,
  height: 8,
  background: '#1a1a1a',
  borderRadius: 2,
};

export function Default() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
      <div style={bubble}>
        Download transcript
        <div style={arrow} />
      </div>
      <Button variant="outline" size="sm">Download</Button>
    </div>
  );
}

export function Examples() {
  return (
    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-end' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <div style={bubble}>Copy to clipboard<div style={arrow} /></div>
        <Button variant="ghost" size="sm">Copy</Button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <div style={bubble}>Add credits to your account<div style={arrow} /></div>
        <Button variant="outline" size="sm">Add credits</Button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <div style={bubble}>Delete permanently<div style={{ ...arrow, background: '#1a1a1a' }} /></div>
        <Button variant="destructive" size="sm">Delete</Button>
      </div>
    </div>
  );
}
