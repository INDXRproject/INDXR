import { redirect } from "next/navigation"

export default function SupportPage() {
  redirect("/dashboard/messages?tab=support")
}
