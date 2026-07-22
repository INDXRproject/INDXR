import { isValidElement, type ReactNode } from "react"

/**
 * Flatten a ReactNode to plain visible text — used to serialize FAQ answers into
 * JSON-LD (`acceptedAnswer.text`). Previously answers that were JSX (e.g. an answer
 * containing a <Link>) serialized to an empty string; this extracts the visible text so
 * the schema matches what the reader sees.
 */
export function reactNodeToText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return ""
  if (typeof node === "string") return node
  if (typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(reactNodeToText).join("")
  if (isValidElement(node)) {
    return reactNodeToText((node.props as { children?: ReactNode }).children)
  }
  return ""
}
