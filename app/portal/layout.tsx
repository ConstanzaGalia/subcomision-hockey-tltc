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
    <div className="min-h-screen bg-background pb-[env(safe-area-inset-bottom)]">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-3 py-2.5 sm:px-6 sm:py-3">
          <Link href="/portal" className="flex min-w-0 items-center gap-2.5">
            <Image
              src="/images/logo-ltc.png"
              alt="Lawn Tenis Club"
              width={36}
              height={36}
              className="rounded-md"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">Portal jugadoras</p>
              <p className="truncate text-xs text-muted-foreground">{displayName}</p>
            </div>
          </Link>
          <PortalSignOutButton />
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
