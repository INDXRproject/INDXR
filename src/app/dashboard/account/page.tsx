import { Separator } from "@/components/ui/separator"

export default function AccountPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white">Account</h3>
        <p className="text-sm text-zinc-400">
          Update your account settings. Set your preferred language and timezone.
        </p>
      </div>
      <Separator className="bg-zinc-800" />
       <div className="space-y-8">
         <p className="text-zinc-500">Account management coming soon.</p>
      </div>
    </div>
  )
}
