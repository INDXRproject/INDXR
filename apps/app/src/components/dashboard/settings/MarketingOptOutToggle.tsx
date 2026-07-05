"use client"

import { useState } from "react"
import { Switch } from "@indxr/shared/components/ui/switch"
import { saveMarketingOptOutAction } from "@/app/actions/profile"

// `initialValue` is the SUBSCRIBED state (toggle on = receiving marketing).
// It maps to profiles.marketing_unsubscribed inverted in the action.
export function MarketingOptOutToggle({ initialValue }: { initialValue: boolean }) {
  const [subscribed, setSubscribed] = useState(initialValue)
  const [saving, setSaving]         = useState(false)

  const handleChange = async (value: boolean) => {
    setSubscribed(value)
    setSaving(true)
    await saveMarketingOptOutAction(value)
    setSaving(false)
  }

  return (
    <Switch
      checked={subscribed}
      onCheckedChange={handleChange}
      disabled={saving}
      aria-label="Toggle marketing and product emails"
    />
  )
}
