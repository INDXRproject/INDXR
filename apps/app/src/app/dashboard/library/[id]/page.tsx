import { createClient } from "@indxr/shared/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import { TranscriptViewer } from "@/components/library/TranscriptViewer";
import { SummaryTab } from "@/components/library/SummaryTab";
import { EditableSummaryView } from "@/components/library/EditableSummaryView";
import { RagExportView } from "@/components/library/RagExportView";
import { TranscriptTabs, ViewTab } from "@/components/library/TranscriptTabs";
import { TranscriptHeader } from "@/components/library/TranscriptHeader";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function TranscriptPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`${process.env.NEXT_PUBLIC_MARKETING_URL || 'http://localhost:3000'}/login`);
  }

  const [{ data: transcript, error }, { data: profileData }] = await Promise.all([
    supabase.from("transcripts").select("*").eq("id", id).eq("user_id", user.id).single(),
    supabase.from("profiles").select("rag_chunk_size").eq("id", user.id).single(),
  ]);

  if (error || !transcript) {
    if (error) console.error("Error fetching transcript:", error);
    return notFound();
  }

  // Tabs appear only when their content exists. A requested ?tab whose content is gone (an edit
  // reverted, an export that never happened) falls back to Transcript — never a dead tab.
  const hasRag = Array.isArray(transcript.rag_exports) && transcript.rag_exports.length > 0;
  const requestedTab = resolvedSearchParams.tab as string | undefined;
  // The Edited tab may be entered fresh (?tab=edited) to START an edit — it is seeded from the
  // original, so the edit happens on the Edited tab, never in edit-mode on the original.
  const canEdited = !!transcript.edited_content || requestedTab === "edited";
  // Same rule for the summary: the Edited-summary tab can be entered fresh (?tab=summary_edited) to
  // start an edit — seeded from the generated summary, never editing it in place. Only when a summary
  // exists to edit.
  const canSummaryEdit = !!transcript.ai_summary && (!!transcript.ai_summary_edited || requestedTab === "summary_edited");
  const tabs: ViewTab[] = [
    { id: "original", label: "Transcript" },
    ...(canEdited ? [{ id: "edited", label: "Edited" }] : []),
    // Summary is ALWAYS present — it is the generate/progress/result destination (SummaryTab shows an
    // empty state with a Generate button when there is no summary yet).
    { id: "summary", label: "Summary" },
    ...(canSummaryEdit ? [{ id: "summary_edited", label: "Edited summary" }] : []),
    ...(hasRag ? [{ id: "developer", label: "Developer" }] : []),
  ];
  const activeTab = tabs.some((t) => t.id === requestedTab) ? (requestedTab as string) : "original";

  // Collection name for the breadcrumb (only when the transcript is in one).
  let collectionName: string | null = null;
  if (transcript.collection_id) {
    const { data: col } = await supabase.from("collections").select("name").eq("id", transcript.collection_id).single();
    collectionName = (col as { name?: string } | null)?.name ?? null;
  }

  return (
    <div className="flex flex-col overflow-x-hidden max-w-7xl mx-auto w-full">
      <TranscriptHeader
        id={transcript.id}
        title={transcript.title || "Untitled Transcript"}
        collectionId={transcript.collection_id ?? null}
        collectionName={collectionName}
        processingMethod={transcript.processing_method}
        hasEdit={!!transcript.edited_content}
        hasSummary={!!transcript.ai_summary}
        hasSummaryEdit={!!transcript.ai_summary_edited}
        hasRag={hasRag}
        duration={transcript.duration ?? null}
        characterCount={transcript.character_count ?? null}
        createdAt={transcript.created_at}
      />
      <div className="mb-6">
        <TranscriptTabs tabs={tabs} activeId={activeTab} transcriptId={id} />
      </div>

      {activeTab === "original" || activeTab === "edited" ? (
        <TranscriptViewer
          id={transcript.id}
          transcript={transcript.transcript}
          title={transcript.title || "Untitled Transcript"}
          videoUrl={transcript.video_id ? `https://www.youtube.com/watch?v=${transcript.video_id}` : ""}
          videoId={transcript.video_id ?? ""}
          channelTitle={transcript.channel ?? undefined}
          language={transcript.language ?? null}
          thumbnailUrl={transcript.thumbnail_url}
          editedContent={transcript.edited_content ?? null}
          viewedAt={transcript.viewed_at}
          mode={activeTab as "original" | "edited"}
          processingMethod={transcript.processing_method}
          ragExports={transcript.rag_exports ?? []}
          userChunkSize={profileData?.rag_chunk_size ?? 60}
          duration={transcript.duration ?? undefined}
          speakerNames={transcript.speaker_names ?? null}
        />
      ) : activeTab === "summary" ? (
        <div className="pb-12 bg-bg w-full relative z-10 w-full mt-2">
          <SummaryTab
            id={transcript.id}
            initialSummary={transcript.ai_summary ?? null}
            videoId={transcript.video_id ?? undefined}
            editedContentUpdatedAt={transcript.edited_content_updated_at ?? null}
            title={transcript.title || "Untitled Transcript"}
            channel={transcript.channel ?? undefined}
            language={transcript.language ?? undefined}
            durationSeconds={transcript.duration ?? undefined}
            extractionMethod={transcript.processing_method ?? undefined}
            hasSummaryEdit={!!transcript.ai_summary_edited}
          />
        </div>
      ) : activeTab === "summary_edited" && transcript.ai_summary ? (
        <div className="pb-12 bg-bg w-full relative z-10 w-full mt-2">
          <EditableSummaryView
            id={transcript.id}
            generatedSummary={transcript.ai_summary}
            editedContent={transcript.ai_summary_edited ?? null}
            editedUpdatedAt={transcript.ai_summary_edited_updated_at ?? null}
          />
        </div>
      ) : activeTab === "developer" && Array.isArray(transcript.rag_exports) && (transcript.rag_exports as unknown[]).length > 0 ? (
        <RagExportView
          transcriptId={transcript.id}
          transcript={transcript.transcript}
          videoId={transcript.video_id}
          title={transcript.title ?? "Untitled"}
          processingMethod={transcript.processing_method}
          ragExports={transcript.rag_exports ?? []}
          speakerNames={transcript.speaker_names ?? null}
        />
      ) : null}
    </div>
  );
}
