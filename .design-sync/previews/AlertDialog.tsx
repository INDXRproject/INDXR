import { Button } from '@indxr/shared/Button';

const shell: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  padding: '24px',
  boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
  maxWidth: 400,
  textAlign: 'center',
};

const title: React.CSSProperties = { fontSize: 18, fontWeight: 600, marginBottom: 8 };
const desc: React.CSSProperties = { fontSize: 14, opacity: 0.65, lineHeight: 1.5, marginBottom: 20 };
const footer: React.CSSProperties = { display: 'flex', justifyContent: 'flex-end', gap: 8 };

export function DeleteAccount() {
  return (
    <div style={shell}>
      <p style={title}>Delete account?</p>
      <p style={desc}>
        Your account and all transcripts will be permanently deleted. This cannot be undone.
      </p>
      <div style={footer}>
        <Button variant="outline">Cancel</Button>
        <Button variant="destructive">Delete account</Button>
      </div>
    </div>
  );
}

export function ConfirmAction() {
  return (
    <div style={shell}>
      <p style={title}>Confirm extraction</p>
      <p style={desc}>
        This will use 48 credits (48 minutes). You have 142 credits remaining.
      </p>
      <div style={footer}>
        <Button variant="outline">Cancel</Button>
        <Button>Confirm</Button>
      </div>
    </div>
  );
}
