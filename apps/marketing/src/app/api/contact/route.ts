import { NextResponse } from "next/server"
import { z } from "zod"

export const runtime = "nodejs"

// Public contact form (logged-out visitors). Logged-in users use the in-app Support tab, which
// creates a real ticket with a reply thread. This just emails support@indxr.ai with reply-to set
// to the sender, so we can answer from the mailbox. No billing category here — that's an
// account/paid matter that belongs in the in-app support flow.
const CATEGORY_LABEL: Record<string, string> = {
  feedback: "Feedback or suggestion",
  bug: "Bug report",
  question: "General question",
}

const schema = z.object({
  category: z.enum(["feedback", "bug", "question"]),
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(200),
  message: z.string().trim().min(1).max(5000),
  // Honeypot: real users never fill this (it's hidden). Bots that do get a silent 200.
  company: z.string().optional(),
})

export async function POST(req: Request) {
  let data: z.infer<typeof schema>
  try {
    data = schema.parse(await req.json())
  } catch {
    return NextResponse.json({ error: "Please fill in every field with a valid email." }, { status: 400 })
  }

  if (data.company) return NextResponse.json({ ok: true }) // honeypot tripped → drop silently

  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM
  const fallback = "Something went wrong sending your message. Please email us directly at support@indxr.ai."

  if (!apiKey || !from) {
    console.warn("[contact] RESEND_API_KEY/RESEND_FROM not set — message not sent")
    return NextResponse.json({ error: fallback }, { status: 503 })
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from,
        to: "support@indxr.ai",
        reply_to: data.email,
        subject: `[INDXR Contact] ${CATEGORY_LABEL[data.category]} — ${data.name}`,
        text: `New contact message\n\nCategory: ${CATEGORY_LABEL[data.category]}\nName: ${data.name}\nEmail: ${data.email}\n\n${data.message}`,
      }),
    })
    if (!res.ok) {
      console.warn("[contact] resend non-ok:", res.status)
      return NextResponse.json({ error: fallback }, { status: 502 })
    }
  } catch (err) {
    console.warn("[contact] resend failed:", err)
    return NextResponse.json({ error: fallback }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
