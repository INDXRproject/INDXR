import { Checkbox } from '@indxr/shared/Checkbox';

export function Default() {
  return <Checkbox id="default" />;
}

export function States() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Checkbox id="unchecked" />
        <label htmlFor="unchecked" style={{ fontSize: 14 }}>Unchecked</label>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Checkbox id="checked" defaultChecked />
        <label htmlFor="checked" style={{ fontSize: 14 }}>Checked</label>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Checkbox id="disabled" disabled />
        <label htmlFor="disabled" style={{ fontSize: 14, opacity: 0.5 }}>Disabled</label>
      </div>
    </div>
  );
}

export function Group() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Export options</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Checkbox id="txt" defaultChecked />
        <label htmlFor="txt" style={{ fontSize: 14 }}>Plain text (.txt)</label>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Checkbox id="srt" defaultChecked />
        <label htmlFor="srt" style={{ fontSize: 14 }}>Subtitles (.srt)</label>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Checkbox id="json" />
        <label htmlFor="json" style={{ fontSize: 14 }}>JSON with timestamps</label>
      </div>
    </div>
  );
}
