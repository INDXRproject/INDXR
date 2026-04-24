import { createClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { TranscriptViewer } from "@/components/library/TranscriptViewer";
import { AiSummaryView } from "@/components/library/AiSummaryView";
import { RagExportView } from "@/components/library/RagExportView";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function TranscriptPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const validTabs = ["original", "edited", "summary", "summary_edited", "developer"];
  const activeTab = validTabs.includes(resolvedSearchParams.tab as string) 
    ? (resolvedSearchParams.tab as string) 
    : "original";
  
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
    <div className="flex flex-col bg-background min-h-screen overflow-x-hidden p-6 max-w-7xl mx-auto w-full">
      <div className="mb-6 flex space-x-4 border-b border-border text-sm">
        <Link
          href={`/dashboard/library/${id}?tab=original`}
          className={cn(
            "pb-3 border-b-2 px-2 transition-colors",
            activeTab === "original"
              ? "border-[var(--accent)] font-medium text-foreground"
              : "border-transparent text-[var(--text-muted)] hover:text-foreground"
          )}
        >
          Original
        </Link>
        {transcript.edited_content && (
          <Link
            href={`/dashboard/library/${id}?tab=edited`}
            className={cn(
              "pb-3 border-b-2 px-2 transition-colors",
              activeTab === "edited"
                ? "border-[var(--accent)] font-medium text-foreground"
                : "border-transparent text-[var(--text-muted)] hover:text-foreground"
            )}
          >
            Edited
          </Link>
        )}
        {transcript.rag_exports && Array.isArray(transcript.rag_exports) && transcript.rag_exports.length > 0 && (
          <Link
            href={`/dashboard/library/${id}?tab=developer`}
            className={cn(
              "pb-3 border-b-2 px-2 transition-colors",
              activeTab === "developer"
                ? "border-[var(--accent)] font-medium text-foreground"
                : "border-transparent text-[var(--text-muted)] hover:text-foreground"
            )}
          >
            Developer <span className="text-primary text-[10px] font-bold align-super">✦</span>
          </Link>
        )}
        {transcript.ai_summary && (
          <>
            <Link
              href={`/dashboard/library/${id}?tab=summary`}
              className={cn(
                "pb-3 border-b-2 px-2 transition-colors",
                activeTab === "summary"
                  ? "border-[var(--accent)] font-medium text-foreground"
                  : "border-transparent text-[var(--text-muted)] hover:text-foreground"
              )}
            >
              AI Summary
            </Link>
            {transcript.ai_summary.edited_html && (
              <Link
                href={`/dashboard/library/${id}?tab=summary_edited`}
                className={cn(
                  "pb-3 border-b-2 px-2 transition-colors",
                  activeTab === "summary_edited"
                    ? "border-[var(--accent)] font-medium text-foreground"
                    : "border-transparent text-[var(--text-muted)] hover:text-foreground"
                )}
              >
                Edited Summary
              </Link>
            )}
          </>
        )}
      </div>

      {activeTab === "original" || activeTab === "edited" ? (
        <TranscriptViewer
          id={transcript.id}
          transcript={transcript.transcript}
          title={transcript.title || "Untitled Transcript"}
          videoUrl={`https://www.youtube.com/watch?v=${transcript.video_id}`}
          videoId={transcript.video_id}
          thumbnailUrl={transcript.thumbnail_url}
          editedContent={transcript.edited_content ?? null}
          aiSummary={transcript.ai_summary ?? null}
          viewedAt={transcript.viewed_at}
          mode={activeTab as "original" | "edited"}
          processingMethod={transcript.processing_method}
        />
      ) : (activeTab === "summary" || activeTab === "summary_edited") && transcript.ai_summary ? (
        <div className="pb-12 bg-background w-full relative z-10 w-full mt-2">
          <AiSummaryView 
            id={transcript.id} 
            initialSummary={transcript.ai_summary} 
            mode={activeTab === "summary" ? "original" : "edited"}
          />
        </div>
      ) : activeTab === "developer" ? (
        <RagExportView
          transcriptId={transcript.id}
          transcript={transcript.transcript}
          videoId={transcript.video_id}
          title={transcript.title ?? "Untitled"}
          processingMethod={transcript.processing_method}
          ragExports={transcript.rag_exports ?? []}
        />
      ) : null}
    </div>
  );
}
