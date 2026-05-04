"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface UserRow {
  id: string
  email: string
  username: string | null
  role: string | null
  balance: number
  purchased: number
  joined: string
  lastActive: string | null
  suspended: boolean
}

interface TranscriptDetail {
  id: string
  title: string | null
  processing_method: string | null
  created_at: string
}

interface TransactionDetail {
  id: string
  amount: number
  type: string
  reason: string
  created_at: string
}

type Status = { type: "success" | "error"; message: string }

function StatusBanner({
  status,
  onDismiss,
}: {
  status: Status
  onDismiss: () => void
}) {
  return (
    <div
      className={`flex items-center justify-between px-4 py-2.5 rounded-md text-sm mb-4 border ${
        status.type === "success"
          ? "bg-success-subtle text-success-fg border-success/20"
          : "bg-error-subtle text-error-fg border-error/20"
      }`}
    >
      <span>{status.message}</span>
      <button
        onClick={onDismiss}
        className="ml-4 opacity-60 hover:opacity-100 text-base leading-none"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  )
}

function AddCreditsModal({
  user,
  open,
  onClose,
  onStatus,
  onBalanceUpdate,
}: {
  user: UserRow
  open: boolean
  onClose: () => void
  onStatus: (s: Status) => void
  onBalanceUpdate: (userId: string, amount: number) => void
}) {
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    const num = parseInt(amount)
    if (!num || num <= 0) {
      onStatus({ type: "error", message: "Enter a valid amount" })
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/admin/add-credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          amount: num,
          reason: reason || "Admin credit grant",
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onBalanceUpdate(user.id, num)
      onStatus({ type: "success", message: `Added ${num} credits to ${user.email}` })
      setAmount("")
      setReason("")
      onClose()
    } catch (err: unknown) {
      onStatus({ type: "error", message: err instanceof Error ? err.message : "Failed to add credits" })
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Credits</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-fg-muted">{user.email}</p>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Amount</Label>
            <Input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="10"
            />
          </div>
          <div className="space-y-1">
            <Label>Reason</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Admin credit grant"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Adding…" : "Add Credits"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DeleteModal({
  user,
  open,
  onClose,
  onStatus,
}: {
  user: UserRow
  open: boolean
  onClose: () => void
  onStatus: (s: Status) => void
}) {
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onStatus({ type: "success", message: `Deleted ${user.email}` })
      onClose()
      window.location.reload()
    } catch (err: unknown) {
      onStatus({ type: "error", message: err instanceof Error ? err.message : "Failed to delete user" })
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete User</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <p className="text-sm font-medium">{user.email}</p>
          <p className="text-sm text-error">
            This permanently deletes all user data including transcripts,
            credits, and their account. This action cannot be undone.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? "Deleting…" : "Delete User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function UserDetail({ userId }: { userId: string }) {
  const [transcripts, setTranscripts] = useState<TranscriptDetail[] | null>(null)
  const [transactions, setTransactions] = useState<TransactionDetail[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  async function load() {
    setLoading(true)
    const [t, tx] = await Promise.all([
      fetch(`/api/admin/user-detail?userId=${userId}&type=transcripts`).then((r) => r.json()),
      fetch(`/api/admin/user-detail?userId=${userId}&type=transactions`).then((r) => r.json()),
    ])
    setTranscripts(t.data ?? [])
    setTransactions(tx.data ?? [])
    setLoaded(true)
    setLoading(false)
  }

  if (!loaded) {
    return (
      <div className="py-2 px-4">
        <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
          {loading ? "Loading…" : "Load details"}
        </Button>
      </div>
    )
  }

  return (
    <div className="py-3 px-6 space-y-4 bg-surface-elevated/30 border-t">
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted mb-2">
            Transcripts ({transcripts?.length ?? 0})
          </p>
          {transcripts?.length === 0 ? (
            <p className="text-xs text-fg-muted">None</p>
          ) : (
            <div className="space-y-1 max-h-36 overflow-y-auto">
              {transcripts?.map((t) => (
                <div key={t.id} className="text-xs flex gap-3">
                  <span className="text-fg-muted shrink-0">
                    {new Date(t.created_at).toLocaleDateString()}
                  </span>
                  <span className="truncate">{t.title ?? "Untitled"}</span>
                  <span className="text-fg-muted shrink-0">
                    {t.processing_method ?? "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted mb-2">
            Credit History ({transactions?.length ?? 0})
          </p>
          {transactions?.length === 0 ? (
            <p className="text-xs text-fg-muted">None</p>
          ) : (
            <div className="space-y-1 max-h-36 overflow-y-auto">
              {transactions?.map((tx) => (
                <div key={tx.id} className="text-xs flex gap-3">
                  <span className="text-fg-muted shrink-0">
                    {new Date(tx.created_at).toLocaleDateString()}
                  </span>
                  <span
                    className={`font-mono shrink-0 ${
                      tx.type === "credit" ? "text-success-fg" : "text-error"
                    }`}
                  >
                    {tx.type === "credit" ? "+" : "-"}
                    {tx.amount}
                  </span>
                  <span className="truncate text-fg-muted">
                    {tx.reason}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function UserRowItem({
  user,
  onStatus,
  onBalanceUpdate,
}: {
  user: UserRow
  onStatus: (s: Status) => void
  onBalanceUpdate: (userId: string, amount: number) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [addCreditsOpen, setAddCreditsOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [suspending, setSuspending] = useState(false)
  const [isSuspended, setIsSuspended] = useState(user.suspended)

  async function toggleSuspend() {
    setSuspending(true)
    try {
      const res = await fetch("/api/admin/suspend-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, suspend: !isSuspended }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setIsSuspended(!isSuspended)
      onStatus({
        type: "success",
        message: !isSuspended
          ? `Suspended ${user.email}`
          : `Unsuspended ${user.email}`,
      })
    } catch (err: unknown) {
      onStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to update suspension",
      })
    } finally {
      setSuspending(false)
    }
  }

  return (
    <>
      <TableRow>
        <TableCell className="max-w-[200px] truncate text-xs">
          {user.email}
        </TableCell>
        <TableCell className="text-xs">{user.username ?? "—"}</TableCell>
        <TableCell className="text-xs">{user.role ?? "—"}</TableCell>
        <TableCell className="text-xs font-mono">{user.balance}</TableCell>
        <TableCell className="text-xs font-mono">{user.purchased}</TableCell>
        <TableCell className="text-xs text-fg-muted">
          {new Date(user.joined).toLocaleDateString()}
        </TableCell>
        <TableCell className="text-xs text-fg-muted">
          {user.lastActive
            ? new Date(user.lastActive).toLocaleDateString()
            : "—"}
        </TableCell>
        <TableCell>
          <Badge
            variant={isSuspended ? "destructive" : "secondary"}
            className="text-xs"
          >
            {isSuspended ? "suspended" : "active"}
          </Badge>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1 flex-wrap min-w-[280px]">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? "Hide" : "View"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => setAddCreditsOpen(true)}
            >
              Add Credits
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={toggleSuspend}
              disabled={suspending}
            >
              {isSuspended ? "Unsuspend" : "Suspend"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-error hover:text-error"
              onClick={() => setDeleteOpen(true)}
            >
              Delete
            </Button>
            <a
              href={`https://app.posthog.com/project/${process.env.NEXT_PUBLIC_POSTHOG_PROJECT_ID}/persons/${user.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-fg-muted hover:text-fg px-1"
            >
              PostHog →
            </a>
          </div>
        </TableCell>
      </TableRow>

      {expanded && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={9} className="p-0">
            <UserDetail userId={user.id} />
          </TableCell>
        </TableRow>
      )}

      <AddCreditsModal
        user={user}
        open={addCreditsOpen}
        onClose={() => setAddCreditsOpen(false)}
        onStatus={onStatus}
        onBalanceUpdate={onBalanceUpdate}
      />
      <DeleteModal
        user={user}
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onStatus={onStatus}
      />
    </>
  )
}

export function UsersTable({ users: initialUsers }: { users: UserRow[] }) {
  const [users, setUsers] = useState<UserRow[]>(initialUsers)
  const [status, setStatus] = useState<Status | null>(null)

  function updateUserBalance(userId: string, addedAmount: number) {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, balance: u.balance + addedAmount, purchased: u.purchased + addedAmount } : u
      )
    )
  }

  return (
    <div>
      {status && (
        <StatusBanner status={status} onDismiss={() => setStatus(null)} />
      )}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Purchased</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center text-fg-muted py-8"
                >
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <UserRowItem
                  key={user.id}
                  user={user}
                  onStatus={(s) => {
                    setStatus(null)
                    setTimeout(() => setStatus(s), 0)
                  }}
                  onBalanceUpdate={updateUserBalance}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
