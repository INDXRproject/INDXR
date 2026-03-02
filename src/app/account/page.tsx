"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { User } from "@supabase/supabase-js"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login?redirect=/account')
        return
      }
      setUser(session.user)
      setLoading(false)
    })
  }, [router, supabase.auth])

  if (loading) {
    return (
      <div className="container max-w-4xl py-24 px-4 mx-auto">
        <p className="text-zinc-400">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="container max-w-4xl py-24 px-4 mx-auto">
      <h1 className="text-4xl font-bold text-white mb-2">Account Settings</h1>
      <p className="text-zinc-400 mb-10">Manage your account preferences and settings</p>

      <div className="space-y-6">
        {/* Account Information */}
        <Card className="bg-zinc-950/50 border-zinc-800/50 text-white">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription className="text-zinc-400">
              Your account details and email address
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={user.email || ''}
                disabled
                className="bg-zinc-900 border-zinc-800 text-zinc-400"
              />
              <p className="text-xs text-zinc-500">Email cannot be changed at this time</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-id">User ID</Label>
              <Input
                id="user-id"
                type="text"
                value={user.id}
                disabled
                className="bg-zinc-900 border-zinc-800 text-zinc-400 font-mono text-xs"
              />
            </div>
            <div className="space-y-2">
              <Label>Account Created</Label>
              <Input
                type="text"
                value={new Date(user.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
                disabled
                className="bg-zinc-900 border-zinc-800 text-zinc-400"
              />
            </div>
          </CardContent>
        </Card>

        {/* Password Change - Coming Soon */}
        <Card className="bg-zinc-950/50 border-zinc-800/50 text-white">
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription className="text-zinc-400">
              Change your password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" disabled className="opacity-50">
              Change Password (Coming Soon)
            </Button>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="bg-zinc-950/50 border-red-900/50 text-white">
          <CardHeader>
            <CardTitle className="text-red-400">Danger Zone</CardTitle>
            <CardDescription className="text-zinc-400">
              Irreversible account actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="destructive" 
              disabled 
              className="opacity-50"
            >
              Delete Account (Coming Soon)
            </Button>
            <p className="text-xs text-zinc-500 mt-2">
              This will permanently delete your account and all associated data
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
