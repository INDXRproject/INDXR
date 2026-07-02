import { Badge } from '@indxr/shared/Badge';

export function Variants() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      <Badge variant="default">Pro</Badge>
      <Badge variant="secondary">Draft</Badge>
      <Badge variant="outline">Beta</Badge>
      <Badge variant="destructive">Error</Badge>
    </div>
  );
}

export function Usages() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      <Badge>New</Badge>
      <Badge variant="secondary">In progress</Badge>
      <Badge variant="outline">Archived</Badge>
      <Badge variant="destructive">Failed</Badge>
      <Badge>Basic</Badge>
      <Badge variant="secondary">Plus</Badge>
    </div>
  );
}
