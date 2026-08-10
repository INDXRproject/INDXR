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
    // No avatar asset for the editorial byline — AuthorCard shows the initials instead.
    // Leave empty (not a missing-file path) so no broken image is ever fetched.
    avatar: "",
    bio: "The INDXR.AI team, covering tool pages, comparisons, and troubleshooting guides.",
    role: "Editorial",
  },
}
