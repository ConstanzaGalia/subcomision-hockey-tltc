"use client"

import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

export function PortalSignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-10 shrink-0 px-3"
      onClick={handleSignOut}
    >
      <span className="sm:hidden">Salir</span>
      <span className="hidden sm:inline">Cerrar sesión</span>
    </Button>
  )
}
