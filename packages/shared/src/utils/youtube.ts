/**
 * YouTube URL Recognition & Validation Utility
 * Handles various formats: watch v=ID, youtu.be/ID, playlist?list=ID, mobile, etc.
 */

export type YouTubeUrlType =
  | 'VALID_VIDEO'
  | 'VALID_PLAYLIST'
  | 'PLAYLIST_IN_VIDEO'
  | 'CHANNEL'
  | 'MALFORMED'
  | 'NON_YOUTUBE';

export interface ValidationResult {
  type: YouTubeUrlType;
  id?: string;
}

/**
 * Validates a YouTube URL and identifies its type.
 */
export function validateYouTubeUrl(url: string, expectedTab: 'video' | 'playlist'): ValidationResult {
  if (!url) return { type: 'MALFORMED' };

  // 1. Basic format check
  const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
  if (!isYouTube) return { type: 'NON_YOUTUBE' };

  // 2. Identify if it's a playlist
  const isPlaylist = url.includes('list=') || url.includes('/playlist');

  // 2b. Channel URL (/@handle, /channel/, /c/, /user/) — INDXR extracts videos/playlists,
  // not whole channels. Detect explicitly so we can point the user at playlists instead of
  // failing as a generic "malformed" URL (ADR-071, DEEL 4). A channel URL that also carries
  // a ?list= is treated as the playlist it points to.
  const isChannel = /youtube\.com\/(?:@[^/?#\s]+|channel\/|c\/|user\/)/i.test(url);
  if (isChannel && !isPlaylist) return { type: 'CHANNEL' };

  // 3. Extract IDs
  const videoId = extractVideoId(url);
  const playlistId = extractPlaylistId(url);

  if (isPlaylist) {
    if (!playlistId) return { type: 'MALFORMED' };
    if (expectedTab === 'video') return { type: 'PLAYLIST_IN_VIDEO', id: playlistId };
    return { type: 'VALID_PLAYLIST', id: playlistId };
  }

  if (videoId) {
    return { type: 'VALID_VIDEO', id: videoId };
  }

  return { type: 'MALFORMED' };
}

/**
 * Extracts video ID from common YouTube URL formats.
 */
export function extractVideoId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2]?.length === 11) ? match[2] : null;
}

/**
 * Extracts playlist ID from common YouTube URL formats.
 */
export function extractPlaylistId(url: string): string | null {
  const regExp = /[&?]list=([^#&?]+)/;
  const match = url.match(regExp);
  return match ? match[1] : null;
}
