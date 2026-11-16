import { redirect } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { homePathForRole, isJugadoraRole } from "@/lib/roles"
import { PortalSignOutButton } from "@/components/portal-sign-out-button"

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, nombre, apellido")
    .eq("id", user.id)
    .single()

  const role = profile?.role ?? null
  if (!isJugadoraRole(role)) {
    redirect(homePathForRole(role))
  }

  const displayName =
    [profile?.nombre, profile?.apellido].filter(Boolean).join(" ").trim() || "Mi cuenta"

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/portal" className="flex items-center gap-3">
            <Image
              src="/images/logo-ltc.png"
              alt="Lawn Tenis Club"
              width={40}
              height={40}
              className="rounded-md"
            />
            <div>
              <p className="text-sm font-semibold text-foreground">Portal jugadoras</p>
              <p className="text-xs text-muted-foreground">{displayName}</p>
            </div>
          </Link>
          <PortalSignOutButton />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
    </div>
  )
}
