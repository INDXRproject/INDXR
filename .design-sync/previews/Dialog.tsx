import { Button } from '@indxr/shared/Button';

const shell: React.CSSProperties = {
  background: 'var(--bg, #ffffff)',
  border: '1px solid var(--border, #e5e7eb)',
  borderRadius: 12,
  padding: '24px',
  boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
  maxWidth: 420,
  width: '100%',
};

const title: React.CSSProperties = { fontSize: 16, fontWeight: 600, marginBottom: 6 };
const desc: React.CSSProperties = { fontSize: 14, opacity: 0.7, lineHeight: 1.5, marginBottom: 20 };
const footer: React.CSSProperties = { display: 'flex', justifyContent: 'flex-end', gap: 8 };

export function DeleteConfirm() {
  return (
    <div style={shell}>
      <p style={title}>Delete transcript?</p>
      <p style={desc}>
        This will permanently delete "How to Build in Public" and all associated data. This action cannot be undone.
      </p>
      <div style={footer}>
        <Button variant="outline" size="sm">Cancel</Button>
        <Button variant="destructive" size="sm">Delete</Button>
      </div>
    </div>
  );
}

export function ExportOptions() {
  return (
    <div style={shell}>
      <p style={title}>Export transcript</p>
      <p style={desc}>Choose a format to download your transcript.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
        <Button variant="outline" size="sm" style={{ justifyContent: 'flex-start' }}>Plain text (.txt)</Button>
        <Button variant="outline" size="sm" style={{ justifyContent: 'flex-start' }}>Subtitles (.srt)</Button>
        <Button variant="outline" size="sm" style={{ justifyContent: 'flex-start' }}>JSON with timestamps</Button>
      </div>
      <div style={footer}>
        <Button variant="ghost" size="sm">Cancel</Button>
      </div>
    </div>
  );
}
