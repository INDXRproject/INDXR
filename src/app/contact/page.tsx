"use client"

// TODO: Form submit — POST naar /api/support (implementeren)
// TODO: Email routing — categorie pre-selected stuurt naar juist inbox-label

import { useState } from "react"
import { HelpCircle, Lightbulb, Send, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Footer } from "@/components/Footer"

type Category = "help" | "feedback"

export default function SupportPage() {
  const [category, setCategory] = useState<Category | null>(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    // TODO: POST naar /api/support met { category, name, email, message }
    await new Promise((r) => setTimeout(r, 800))
    setSubmitted(true)
    setSubmitting(false)
  }

  return (
    <>
      <div className="min-h-screen bg-[var(--bg)]">
        <div className="max-w-3xl mx-auto px-4 py-20">
          {/* Hero */}
          <div className="text-center mb-14">
            <h1 className="text-3xl font-semibold text-[var(--fg)] mb-3">How can we help?</h1>
            {/* KHIDR: finaliseer copy voor beide cards */}
            <p className="text-[var(--fg-subtle)]">Tell us what&apos;s on your mind — we read and respond to everything.</p>
          </div>

          {/* Two entry cards */}
          {!category && (
            <div className="grid sm:grid-cols-2 gap-4 mb-12">
              <button
                onClick={() => setCategory("help")}
                className="group text-left p-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-elevated)] hover:border-[var(--border-strong)] transition-all cursor-pointer"
              >
                <div className="h-10 w-10 rounded-[var(--radius)] bg-[var(--accent-subtle)] flex items-center justify-center mb-4">
                  <HelpCircle className="h-5 w-5 text-[var(--accent)]" />
                </div>
                <h2 className="text-base font-semibold text-[var(--fg)] mb-2">I need help</h2>
                <p className="text-sm text-[var(--fg-muted)] leading-relaxed">
                  Something isn&apos;t working, you have a question, or you need assistance with a specific transcript.
                </p>
                <span className="mt-4 inline-block text-sm text-[var(--accent)] font-medium group-hover:underline">
                  Contact us →
                </span>
              </button>

              <button
                onClick={() => setCategory("feedback")}
                className="group text-left p-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-elevated)] hover:border-[var(--border-strong)] transition-all cursor-pointer"
              >
                <div className="h-10 w-10 rounded-[var(--radius)] bg-[var(--accent-subtle)] flex items-center justify-center mb-4">
                  <Lightbulb className="h-5 w-5 text-[var(--accent)]" />
                </div>
                <h2 className="text-base font-semibold text-[var(--fg)] mb-2">I have a suggestion</h2>
                <p className="text-sm text-[var(--fg-muted)] leading-relaxed">
                  An idea for a new feature, a workflow you wish existed, or something that would make INDXR better for you.
                </p>
                <span className="mt-4 inline-block text-sm text-[var(--accent)] font-medium group-hover:underline">
                  Share feedback →
                </span>
              </button>
            </div>
          )}

          {/* Contact form */}
          {category && !submitted && (
            <div id="contact-form" className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                {category === "help" ? (
                  <HelpCircle className="h-5 w-5 text-[var(--accent)]" />
                ) : (
                  <Lightbulb className="h-5 w-5 text-[var(--accent)]" />
                )}
                <h2 className="text-base font-semibold text-[var(--fg)]">
                  {category === "help" ? "Contact us" : "Share feedback"}
                </h2>
                <button
                  onClick={() => setCategory(null)}
                  className="ml-auto text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors cursor-pointer"
                >
                  ← Back
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <input type="hidden" name="category" value={category} />

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="name" className="text-sm font-medium text-[var(--fg)]">Name</label>
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      placeholder="Your name"
                      className="w-full h-11 px-3 text-sm rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-sunken)] text-[var(--fg)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="email" className="text-sm font-medium text-[var(--fg)]">Email</label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="you@example.com"
                      className="w-full h-11 px-3 text-sm rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-sunken)] text-[var(--fg)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="message" className="text-sm font-medium text-[var(--fg)]">
                    {category === "help" ? "What can we help you with?" : "What's your idea?"}
                  </label>
                  <textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    rows={5}
                    placeholder={category === "help"
                      ? "Describe what happened, or what you need help with…"
                      : "Tell us about your idea — what problem it solves, how it would work…"
                    }
                    className="w-full px-3 py-2 text-sm rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-sunken)] text-[var(--fg)] placeholder:text-[var(--fg-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-ring)] resize-none"
                  />
                </div>

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
                We&apos;ve received your message — check your{" "}
                <a href="/dashboard/messages" className="text-[var(--accent)] hover:underline">Messages inbox</a>{" "}
                for our reply.
              </p>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  )
}
