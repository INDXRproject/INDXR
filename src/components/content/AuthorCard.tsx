"use client"

import Image from "next/image"
import { useState } from "react"
import type { Author } from "@/lib/authors"

interface AuthorCardProps {
  author: Author
  publishedAt: string
  updatedAt: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
}

export function AuthorCard({ author, publishedAt, updatedAt }: AuthorCardProps) {
  const [imgError, setImgError] = useState(false)

  return (
    <div className="flex items-center gap-3 py-3">
      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-[var(--accent-subtle)] flex items-center justify-center">
        {!imgError ? (
          <Image
            src={author.avatar}
            alt={author.name}
            width={40}
            height={40}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="text-xs font-semibold text-[var(--accent)]">
            {initials(author.name)}
          </span>
        )}
      </div>
      <div>
        <div className="text-sm font-medium text-[var(--text-primary)]">{author.name}</div>
        <div className="text-xs text-[var(--text-muted)]">
          Published {formatDate(publishedAt)} · Updated {formatDate(updatedAt)}
        </div>
      </div>
    </div>
  )
}
