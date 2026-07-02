import { Progress } from '@indxr/shared/Progress';

export function Default() {
  return <Progress value={60} style={{ maxWidth: 320 }} />;
}

export function Values() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 320 }}>
      <Progress value={0} />
      <Progress value={25} />
      <Progress value={50} />
      <Progress value={75} />
      <Progress value={100} />
    </div>
  );
}

export function WithLabels() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 320 }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
          <span>Extracting transcript</span>
          <span>68%</span>
        </div>
        <Progress value={68} />
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
          <span>Playlist complete</span>
          <span>12 / 12</span>
        </div>
        <Progress value={100} />
      </div>
    </div>
  );
}
