// Alt text for the editorial photos, keyed by article slug. Each line describes what is
// visible in the decorative photo (not the article title). Presence of a slug here is also
// the single source of truth for "this article has an editorial image" — an article with no
// entry falls back to the seeded hexagon header (see ArticleHero). Images live under
// /editorial/{slug}-{400,800,1440}.{avif,webp}, {slug}-800.jpg, {slug}-og.jpg.
export const editorialAlts: Record<string, string> = {
  "audio-to-text": "vintage microphone head resting on sandy ground casting long shadow",
  "chunk-youtube-transcripts-for-rag": "amber glass block with ribbed segments glowing on sand",
  "transcript-export-formats": "five brass measuring cups lined up casting long shadows",
  "video-to-text": "translucent strip of film laid across pale gritty ground",
  "youtube-channel-knowledge-base": "open drawer packed with tightly filed cards in warm light",
  "youtube-playlist-transcript": "silver film reel with tape trailing across the sand",
  "youtube-transcript-non-english": "row of worn leather books with foreign-script spines",
  "youtube-transcript-not-available": "clear cassette tape with unspooled ribbon on sandy ground",
  "youtube-transcript-obsidian": "glossy black obsidian shard glinting on gritty ground",
  "youtube-transcripts-vector-database": "brass armillary sphere casting circular shadow on pale floor",
  "youtube-transcript-without-extension": "edge of a glass pane standing on stone floor",
}

export function hasEditorialImage(slug?: string): boolean {
  return !!slug && slug in editorialAlts
}

export function editorialAlt(slug: string): string {
  return editorialAlts[slug] ?? ""
}
