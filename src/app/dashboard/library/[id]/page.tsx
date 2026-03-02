import { createClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import { TranscriptViewer } from "@/components/library/TranscriptViewer";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function TranscriptPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: transcript, error } = await supabase
    .from("transcripts")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !transcript) {
    if (error) console.error("Error fetching transcript:", error);
    return notFound();
  }

  return (
    <TranscriptViewer
      id={transcript.id}
      transcript={transcript.transcript}
      title={transcript.title || "Untitled Transcript"}
      videoUrl={`https://www.youtube.com/watch?v=${transcript.video_id}`}
      thumbnailUrl={transcript.thumbnail_url}
    />
  );
}
