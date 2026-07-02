import { Alert, AlertTitle, AlertDescription } from '@indxr/shared/Alert';

export function Default() {
  return (
    <Alert style={{ maxWidth: 400 }}>
      <AlertTitle>Extraction complete</AlertTitle>
      <AlertDescription>Your transcript is ready. 12,400 words indexed.</AlertDescription>
    </Alert>
  );
}

export function Destructive() {
  return (
    <Alert variant="destructive" style={{ maxWidth: 400 }}>
      <AlertTitle>Extraction failed</AlertTitle>
      <AlertDescription>Could not retrieve captions. The video may be private or unavailable.</AlertDescription>
    </Alert>
  );
}

export function Variants() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 400 }}>
      <Alert>
        <AlertTitle>Heads up</AlertTitle>
        <AlertDescription>Whisper transcription takes 2–5 minutes for long videos.</AlertDescription>
      </Alert>
      <Alert variant="destructive">
        <AlertTitle>Credit limit reached</AlertTitle>
        <AlertDescription>You've used all your credits. Upgrade to continue.</AlertDescription>
      </Alert>
    </div>
  );
}
