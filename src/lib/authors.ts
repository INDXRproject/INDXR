export interface Author {
  name: string
  slug: string
  avatar: string
  bio: string
  role: string
}

export const AUTHORS: Record<string, Author> = {
  "alex-mercer": {
    name: "Alex Mercer",
    slug: "alex-mercer",
    avatar: "/authors/alex-mercer.jpg",
    bio: "Developer writing about RAG pipelines, AI tooling, and transcript processing workflows.",
    role: "AI & Developer Content",
  },
  "sarah-lindqvist": {
    name: "Sarah Lindqvist",
    slug: "sarah-lindqvist",
    avatar: "/authors/sarah-lindqvist.jpg",
    bio: "PKM practitioner covering Obsidian, Notion, and research workflows.",
    role: "PKM & Research Content",
  },
  "indxr-editorial": {
    name: "INDXR.AI Editorial",
    slug: "indxr-editorial",
    avatar: "/authors/indxr-editorial.jpg",
    bio: "The INDXR.AI team, covering tool pages, comparisons, and troubleshooting guides.",
    role: "Editorial",
  },
}
