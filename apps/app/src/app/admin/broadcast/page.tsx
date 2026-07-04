import { BroadcastComposer } from "./BroadcastComposer"

export default function AdminBroadcastPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Broadcast</h1>
        <p className="text-fg-muted text-sm">
          Send an in-app message to a target audience — optionally by email too.
        </p>
      </div>
      <BroadcastComposer />
    </div>
  )
}
