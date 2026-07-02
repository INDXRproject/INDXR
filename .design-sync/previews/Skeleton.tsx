import { Skeleton } from '@indxr/shared/Skeleton';

const skStyle = { background: '#e5e7eb' };

export function Default() {
  return <Skeleton style={{ ...skStyle, width: 240, height: 20 }} />;
}

export function Card() {
  return (
    <div style={{ maxWidth: 340, padding: 16, border: '1px solid #e5e7eb', borderRadius: 8 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <Skeleton style={{ ...skStyle, width: 40, height: 40, borderRadius: '50%' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Skeleton style={{ ...skStyle, height: 14, width: '60%' }} />
          <Skeleton style={{ ...skStyle, height: 12, width: '40%' }} />
        </div>
      </div>
      <Skeleton style={{ ...skStyle, height: 12, width: '100%', marginBottom: 6 }} />
      <Skeleton style={{ ...skStyle, height: 12, width: '90%', marginBottom: 6 }} />
      <Skeleton style={{ ...skStyle, height: 12, width: '75%' }} />
    </div>
  );
}

export function List() {
  return (
    <div style={{ maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[100, 85, 90, 70].map((w, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Skeleton style={{ ...skStyle, width: 32, height: 32, borderRadius: 4, flexShrink: 0 }} />
          <Skeleton style={{ ...skStyle, height: 14, width: `${w}%` }} />
        </div>
      ))}
    </div>
  );
}
