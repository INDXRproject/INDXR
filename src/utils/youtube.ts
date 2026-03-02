/**
 * YouTube URL Recognition & Validation Utility
 * Handles various formats: watch v=ID, youtu.be/ID, playlist?list=ID, mobile, etc.
 */

export type YouTubeUrlType = 
  | 'VALID_VIDEO' 
  | 'VALID_PLAYLIST' 
  | 'PLAYLIST_IN_VIDEO' 
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
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
}

/**
 * Extracts playlist ID from common YouTube URL formats.
 */
export function extractPlaylistId(url: string): string | null {
  const regExp = /[&?]list=([^#&?]+)/;
  const match = url.match(regExp);
  return match ? match[1] : null;
}
