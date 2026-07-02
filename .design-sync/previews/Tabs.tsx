import { Tabs, TabsList, TabsTrigger, TabsContent } from '@indxr/shared/Tabs';

export function Default() {
  return (
    <Tabs defaultValue="transcript" style={{ maxWidth: 480 }}>
      <TabsList>
        <TabsTrigger value="transcript">Transcript</TabsTrigger>
        <TabsTrigger value="summary">Summary</TabsTrigger>
        <TabsTrigger value="chapters">Chapters</TabsTrigger>
      </TabsList>
      <TabsContent value="transcript">
        <p style={{ fontSize: 14, lineHeight: 1.6, marginTop: 8 }}>
          Full transcript content appears here. Timestamps, speaker labels, and searchable text.
        </p>
      </TabsContent>
    </Tabs>
  );
}

export function TwoTabs() {
  return (
    <Tabs defaultValue="all" style={{ maxWidth: 360 }}>
      <TabsList>
        <TabsTrigger value="all">All videos</TabsTrigger>
        <TabsTrigger value="recent">Recent</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
