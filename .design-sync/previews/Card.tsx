import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction } from '@indxr/shared/Card';
import { Button } from '@indxr/shared/Button';
import { Badge } from '@indxr/shared/Badge';

export function Basic() {
  return (
    <Card style={{ maxWidth: 380 }}>
      <CardHeader>
        <CardTitle>Transcript ready</CardTitle>
        <CardDescription>Your video has been processed and indexed.</CardDescription>
      </CardHeader>
      <CardContent>
        <p style={{ fontSize: 14 }}>12,400 words · 48 minutes · English</p>
      </CardContent>
      <CardFooter style={{ gap: 8 }}>
        <Button size="sm">View transcript</Button>
        <Button size="sm" variant="ghost">Download</Button>
      </CardFooter>
    </Card>
  );
}

export function WithAction() {
  return (
    <Card style={{ maxWidth: 380 }}>
      <CardHeader>
        <CardTitle>Credits balance</CardTitle>
        <CardDescription>Remaining this month</CardDescription>
        <CardAction>
          <Badge variant="secondary">Pro</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p style={{ fontSize: 32, fontWeight: 700 }}>142 credits</p>
        <p style={{ fontSize: 13, marginTop: 4 }}>≈ 142 minutes of video</p>
      </CardContent>
    </Card>
  );
}

export function ContentOnly() {
  return (
    <Card style={{ maxWidth: 380 }}>
      <CardContent>
        <p style={{ fontSize: 14, lineHeight: 1.6 }}>
          INDXR extracts searchable transcripts from any YouTube video. Paste a URL, get full-text search and AI summaries in seconds.
        </p>
      </CardContent>
    </Card>
  );
}
