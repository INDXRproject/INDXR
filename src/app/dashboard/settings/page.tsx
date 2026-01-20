import { Separator } from "@/components/ui/separator"

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white">Profile</h3>
        <p className="text-sm text-zinc-400">
          This is how others will see you on the site.
        </p>
      </div>
      <Separator className="bg-zinc-800" />
      <div className="space-y-8">
         <p className="text-zinc-500">Settings implementation coming soon.</p>
      </div>
    </div>
  )
}
