"use client"

import { useState } from "react"
import { HelpCircle, Lightbulb, Bug, Send, CheckCircle } from "lucide-react"
import { Button } from "@indxr/shared/components/ui/button"

type Category = "feedback" | "bug" | "question"

const CATEGORIES: { id: Category; icon: typeof HelpCircle; title: string; blurb: string; prompt: string; placeholder: string }[] = [
  {
    id: "feedback",
    icon: Lightbulb,
    title: "Feedback or suggestion",
    blurb: "An idea for a feature, a workflow you wish existed, or something that would make INDXR better.",
    prompt: "What's your idea?",
    placeholder: "Tell us about your idea — what problem it solves, how it would work…",
  },
  {
    id: "bug",
    icon: Bug,
    title: "Report a bug",
    blurb: "Something isn't working the way it should. Tell us what happened and what you expected.",
    prompt: "What went wrong?",
    placeholder: "Describe what you did, what happened, and what you expected instead…",
  },
  {
    id: "question",
    icon: HelpCircle,
    title: "General question",
    blurb: "Anything else — a question about how INDXR works, or something you're not sure about.",
    prompt: "What can we help you with?",
    placeholder: "Ask away…",
  },
]

export default function ContactPage() {
  const [category, setCategory] = useState<Category | null>(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [company, setCompany] = useState("") // honeypot
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const active = CATEGORIES.find((c) => c.id === category)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!category) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, name, email, message, company }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error || "Something went wrong. Please try again.")
      }
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <div className="max-w-3xl mx-auto px-4 py-20">
        <div className="text-center mb-14">
          <h1 className="text-3xl font-semibold text-[var(--fg)] mb-3">How can we help?</h1>
          <p className="text-[var(--fg-subtle)]">Tell us what&apos;s on your mind — we read and reply to everything.</p>
        </div>

        {/* Category selection */}
        {!category && !submitted && (
          <div className="grid sm:grid-cols-3 gap-4 mb-12">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className="group text-left p-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-elevated)] hover:border-[var(--border-strong)] transition-all cursor-pointer"
              >
                <div className="h-10 w-10 rounded-[var(--radius)] bg-[var(--accent-subtle)] flex items-center justify-center mb-4">
                  <c.icon className="h-5 w-5 text-[var(--accent)]" />
                </div>
                <h2 className="text-base font-semibold text-[var(--fg)] mb-2">{c.title}</h2>
                <p className="text-sm text-[var(--fg-muted)] leading-relaxed">{c.blurb}</p>
              </button>
            ))}
          </div>
        )}

        {/* Form */}
        {active && !submitted && (
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <active.icon className="h-5 w-5 text-[var(--accent)]" />
              <h2 className="text-base font-semibold text-[var(--fg)]">{active.title}</h2>
              <button
                onClick={() => { setCategory(null); setError(null) }}
                className="ml-auto text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors cursor-pointer"
              >
                ← Back
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Honeypot — hidden from real users; bots that fill it get dropped server-side. */}
              <input
                type="text"
                name="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="hidden"
              />

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="name" className="ph-no-capture text-sm font-medium text-[var(--fg)]">Name</label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    maxLength={100}
                    placeholder="Your name"
                    className="w-full h-11 px-3 text-sm rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-sunken)] text-[var(--fg)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="email" className="ph-no-capture text-sm font-medium text-[var(--fg)]">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    maxLength={200}
                    placeholder="you@example.com"
                    className="w-full h-11 px-3 text-sm rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-sunken)] text-[var(--fg)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="message" className="ph-no-capture text-sm font-medium text-[var(--fg)]">{active.prompt}</label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  maxLength={5000}
                  rows={5}
                  placeholder={active.placeholder}
                  className="w-full px-3 py-2 text-sm rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-sunken)] text-[var(--fg)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] resize-none"
                />
              </div>

              {error && <p className="text-sm text-[var(--error)]">{error}</p>}

              <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                <Send className="h-4 w-4 mr-2" />
                {submitting ? "Sending…" : "Send message"}
              </Button>
            </form>
          </div>
        )}

        {/* Confirmation */}
        {submitted && (
          <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
            <CheckCircle className="h-10 w-10 text-[var(--success)] mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-[var(--fg)] mb-2">Message received</h2>
            <p className="text-sm text-[var(--fg-muted)] max-w-sm mx-auto">
              Thanks — we&apos;ve got your message and will reply to <span className="text-[var(--fg)]">{email}</span>.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
