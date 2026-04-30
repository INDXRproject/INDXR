import type { Metadata } from "next"
import { MessagesClient } from "./MessagesClient"

export const metadata: Metadata = {
  title: "Messages — INDXR.AI",
  robots: { index: false },
}

export default function MessagesPage() {
  return <MessagesClient />
}
