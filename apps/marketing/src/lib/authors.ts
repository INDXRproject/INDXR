export interface Author {
  name: string
  slug: string
  avatar: string
  bio: string
  role: string
}

export const AUTHORS: Record<string, Author> = {
  "indxr-editorial": {
    name: "INDXR.AI Editorial",
    slug: "indxr-editorial",
    avatar: "/authors/indxr-editorial.jpg",
    bio: "The INDXR.AI team, covering tool pages, comparisons, and troubleshooting guides.",
    role: "Editorial",
  },
}
