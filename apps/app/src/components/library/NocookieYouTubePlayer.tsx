"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

// Privacy (ADR-085): the player is loaded ONLY when this component mounts (i.e. when the user
// opens the video) and points at youtube-nocookie.com, so nothing from YouTube loads — and no
// cookie is set — until the user explicitly opens the video, and even then not until playback.
// The IFrame Player API script (youtube.com) is fetched once, lazily, on that first open.

/* eslint-disable @typescript-eslint/no-explicit-any */
let apiPromise: Promise<void> | null = null;
function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if ((window as any).YT?.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<void>((resolve) => {
    const prev = (window as any).onYouTubeIframeAPIReady;
    (window as any).onYouTubeIframeAPIReady = () => { prev?.(); resolve(); };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return apiPromise;
}

export interface YouTubePlayerHandle {
  seekTo: (seconds: number) => void;
}

export const NocookieYouTubePlayer = forwardRef<YouTubePlayerHandle, { videoId: string; className?: string }>(
  function NocookieYouTubePlayer({ videoId, className }, ref) {
    const hostRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<any>(null);
    const pendingSeek = useRef<number | null>(null);

    useImperativeHandle(ref, () => ({
      seekTo: (s: number) => {
        const secs = Math.max(0, Math.floor(s));
        if (playerRef.current?.seekTo) {
          playerRef.current.seekTo(secs, true);
          playerRef.current.playVideo?.();
        } else {
          pendingSeek.current = secs; // player not ready yet — apply on ready
        }
      },
    }), []);

    useEffect(() => {
      let cancelled = false;
      loadYouTubeApi().then(() => {
        if (cancelled || !hostRef.current) return;
        playerRef.current = new (window as any).YT.Player(hostRef.current, {
          videoId,
          host: "https://www.youtube-nocookie.com",
          playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
          events: {
            onReady: () => {
              if (pendingSeek.current != null) {
                playerRef.current.seekTo(pendingSeek.current, true);
                playerRef.current.playVideo?.();
                pendingSeek.current = null;
              }
            },
          },
        });
      });
      return () => {
        cancelled = true;
        try { playerRef.current?.destroy?.(); } catch { /* ignore */ }
        playerRef.current = null;
      };
    }, [videoId]);

    // YT.Player replaces this div with its iframe.
    return (
      <div className={className}>
        <div ref={hostRef} className="h-full w-full" />
      </div>
    );
  },
);
