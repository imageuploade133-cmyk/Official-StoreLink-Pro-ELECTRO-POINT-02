"use client"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth as useFirebaseAuth } from "@/firebase"
import { useUser } from "@/firebase"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { signOut } from "firebase/auth"
import { LogOut, Settings, UserCircle, Loader2 } from "lucide-react"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"

export function UserNav() {
  const { user } = useUser()
  const { permissions } = useAuth()
  const auth = useFirebaseAuth()
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const { toast } = useToast()

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await signOut(auth)
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      })
      router.push('/')
    } catch (error) {
      console.error('Error logging out:', error)
      toast({
        variant: 'destructive',
        title: 'Logout Failed',
        description: 'An error occurred while logging out.',
      })
      setIsLoggingOut(false)
    }
  }

  const getInitials = (email?: string | null) => {
    if (!email) return 'U'
    const parts = email.split('@')[0].replace(/[^a-zA-Z]/g, ' ').split(' ').filter(Boolean)
     if (parts.length > 1) {
        return (parts[0][0] + (parts[1][0] || '')).toUpperCase()
    }
    if (parts.length === 1 && parts[0].length > 1) {
      return parts[0].substring(0,2).toUpperCase()
    }
    return email.substring(0, 2).toUpperCase()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" className="gap-2 rounded-full border-2 border-primary/20 px-3 py-1 h-auto">
            <Avatar className="h-8 w-8">
                <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || 'User'} />
                <AvatarFallback>{getInitials(user?.email)}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{user?.displayName || 'User'}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.displayName || 'User'}</p>
                <p className="text-xs leading-none text-muted-foreground">
                {user?.email}
                </p>
            </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/dashboard/profile')} disabled={isLoggingOut}>
            <UserCircle className="mr-2 h-4 w-4" />
            <span>My Profile</span>
        </DropdownMenuItem>
        {permissions.manage_settings && (
          <DropdownMenuItem onClick={() => router.push('/dashboard/settings')} disabled={isLoggingOut}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut}>
          {isLoggingOut ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="mr-2 h-4 w-4" />
          )}
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
