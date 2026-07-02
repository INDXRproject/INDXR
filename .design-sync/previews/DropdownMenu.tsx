import { Button } from '@indxr/shared/Button';

const menu: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: '4px',
  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
  minWidth: 160,
};

const item = (destructive = false): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 8px',
  borderRadius: 4,
  fontSize: 14,
  cursor: 'default',
  color: destructive ? '#dc2626' : '#111111',
});

const divider: React.CSSProperties = {
  height: 1,
  background: '#e5e7eb',
  margin: '4px 0',
};

export function Default() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
      <Button variant="outline" size="sm">Actions ▾</Button>
      <div style={menu}>
        <div style={item()}>View transcript</div>
        <div style={item()}>Copy link</div>
        <div style={item()}>Export…</div>
        <div style={divider} />
        <div style={item(true)}>Delete</div>
      </div>
    </div>
  );
}

export function WithIcons() {
  return (
    <div style={menu}>
      <div style={item()}>📄  View transcript</div>
      <div style={item()}>🔗  Copy link</div>
      <div style={item()}>⬇️  Export</div>
      <div style={divider} />
      <div style={item(true)}>🗑  Delete</div>
    </div>
  );
}
