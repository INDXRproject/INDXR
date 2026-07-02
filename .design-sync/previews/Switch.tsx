import { Switch } from '@indxr/shared/Switch';

export function Default() {
  return <Switch defaultChecked />;
}

export function States() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Switch />
        <span style={{ fontSize: 14 }}>Off</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Switch defaultChecked />
        <span style={{ fontSize: 14 }}>On</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Switch disabled />
        <span style={{ fontSize: 14, opacity: 0.5 }}>Disabled</span>
      </div>
    </div>
  );
}

export function WithLabels() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 300 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 500 }}>Email notifications</p>
          <p style={{ fontSize: 12, opacity: 0.6 }}>Receive updates on your transcripts</p>
        </div>
        <Switch defaultChecked />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 500 }}>Auto-summarise</p>
          <p style={{ fontSize: 12, opacity: 0.6 }}>Generate AI summary on extraction</p>
        </div>
        <Switch />
      </div>
    </div>
  );
}
