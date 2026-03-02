"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useState } from "react"
import { toast } from "sonner"
import { User } from "@supabase/supabase-js"
import { updateProfileAction, resendVerificationAction } from "@/app/auth/actions"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react"

interface Profile {
  username: string | null
  role: string | null
  avatar_color?: string | null
}

const AVATAR_COLORS = [
  "bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-green-500",
  "bg-blue-500", "bg-indigo-500", "bg-purple-500", "bg-pink-500"
]

export function ProfileSettingsCard({ user, profile }: { user: User, profile: Profile | null }) {
  const [isEditing, setIsEditing] = useState(false)
  const [username, setUsername] = useState(profile?.username || "")
  const [role, setRole] = useState(profile?.role || "")
  const [avatarColor, setAvatarColor] = useState(profile?.avatar_color || AVATAR_COLORS[4]) // default blue
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)

  // Explicitly check for verification (Supabase sets email_confirmed_at)
  const isVerified = !!user.email_confirmed_at

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      const formData = new FormData()
      formData.append('username', username)
      formData.append('role', role)
      formData.append('avatar_color', avatarColor)
      
      const result = await updateProfileAction(formData)
      
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success("Profile updated")
        setIsEditing(false)
      }
    } catch (error) {
      toast.error("Failed to update profile")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResendVerification = async () => {
    if (!user.email) return
    setIsResending(true)
    try {
       const result = await resendVerificationAction(user.email)
       if (result?.error) {
           toast.error(result.error)
       } else {
           toast.success("Verification email sent")
       }
    } catch (e) {
        toast.error("Failed to send verification email")
    } finally {
        setIsResending(false)
    }
  }

  return (
    <Card className="bg-card/50 border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
            <CardTitle className="text-foreground">Profile & Identity</CardTitle>
            {isVerified ? (
                <Badge variant="outline" className="border-green-500/50 text-green-500 bg-green-500/10 gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Verified
                </Badge>
            ) : (
                <Badge variant="outline" className="border-yellow-500/50 text-yellow-500 bg-yellow-500/10 gap-1">
                    <AlertCircle className="h-3 w-3" /> Unverified
                </Badge>
            )}
        </div>
        <CardDescription className="text-muted-foreground">Manage your public profile and account details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Email Section */}
        <div className="space-y-2">
            <Label className="text-muted-foreground">Email Address</Label>
            <div className="flex items-center gap-2">
                <Input value={user.email || ""} disabled className="bg-card border-border text-muted-foreground" />
                {!isVerified && (
                     <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleResendVerification} 
                        disabled={isResending}
                        className="border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 hover:text-yellow-400 whitespace-nowrap"
                     >
                        {isResending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Resend Link"}
                     </Button>
                )}
            </div>
            {!isVerified && (
                <p className="text-xs text-yellow-500/80">
                    Your email is unverified. Please check your inbox to fully activate your account features.
                </p>
            )}
        </div>

        {/* Edit Form */}
        <form onSubmit={handleUpdateProfile} className="space-y-4 pt-4 border-t border-border/50">
            <div className="grid gap-2">
                <Label className="text-foreground">Username</Label>
                <Input 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)} 
                    disabled={!isEditing}
                    placeholder="e.g. creative_genius"
                    className="!bg-card !border-border !text-foreground placeholder:text-muted-foreground focus:ring-purple-500/20"
                />
                <p className="text-xs text-muted-foreground">
                    3-20 chars, letters, numbers, underscores, or hyphens only.
                </p>
            </div>
            
            <div className="grid gap-2">
                <Label className="text-foreground">Avatar Color</Label>
                <div className="flex gap-2">
                    {AVATAR_COLORS.map(color => (
                        <button
                            key={color}
                            type="button"
                            disabled={!isEditing}
                            onClick={() => setAvatarColor(color)}
                            className={`w-8 h-8 rounded-full ${color} transition-all border-2 ${
                                avatarColor === color ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-50 hover:opacity-100 disabled:hover:opacity-50'
                            }`}
                            aria-label={`Select ${color.replace('bg-', '').replace('-500', '')} avatar color`}
                        />
                    ))}
                </div>
            </div>
            
            <div className="grid gap-2">
                <Label className="text-foreground">Main Usage</Label>
                {isEditing ? (
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-border bg-card px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
                  >
                    <option value="" disabled>Select your role</option>
                    <option value="student">Student</option>
                    <option value="personal_projects">Personal Projects</option>
                    <option value="academic_researcher">Academic/Researcher</option>
                    <option value="content_creator">Content Creator</option>
                    <option value="marketing_business">Marketing/Business Professional</option>
                    <option value="developer_technical">Developer/Technical</option>
                    <option value="other">Other</option>
                  </select>
                ) : (
                  <Input 
                    value={role ? role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : "Not set"} 
                    disabled 
                    className="bg-card border-border text-foreground"
                  />
                )}
            </div>
            
            {isEditing ? (
                 <div className="flex gap-2 justify-end pt-2">
                    <Button 
                        type="button" 
                        variant="ghost" 
                        onClick={() => {
                            setIsEditing(false)
                            setUsername(profile?.username || "")
                            setRole(profile?.role || "")
                            setAvatarColor(profile?.avatar_color || AVATAR_COLORS[4])
                        }}
                        className="text-muted-foreground hover:text-foreground hover:bg-card"
                    >
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting} className="bg-white text-black hover:bg-zinc-200">
                        {isSubmitting ? "Saving..." : "Save Changes"}
                    </Button>
                 </div>
            ) : (
                 <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsEditing(true)} 
                    className="w-full border-border bg-card text-foreground hover:bg-white hover:text-black transition-colors"
                 >
                    Edit Profile
                 </Button>
            )}
        </form>
      </CardContent>
    </Card>
  )
}
