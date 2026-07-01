"use client"

import { useState } from "react"
import { Switch } from "@indxr/shared/components/ui/switch"
import { saveEmailNotificationsAction } from "@/app/actions/profile"

export function EmailNotificationsToggle({ initialValue }: { initialValue: boolean }) {
  const [enabled, setEnabled] = useState(initialValue)
  const [saving, setSaving]   = useState(false)

  const handleChange = async (value: boolean) => {
    setEnabled(value)
    setSaving(true)
    await saveEmailNotificationsAction(value)
    setSaving(false)
  }

  return (
    <Switch
      checked={enabled}
      onCheckedChange={handleChange}
      disabled={saving}
      aria-label="Toggle email notifications"
    />
  )
}
