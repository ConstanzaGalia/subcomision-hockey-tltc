"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { Menu, LayoutDashboard, LandPlot, LogOut, ShieldCheck, Banknote, Scale } from "lucide-react"
import { toast } from "sonner"
import { type UserRole, ROLE_LABELS, hasAccess, getRoleColor } from "@/lib/roles"

const navItems = [
  {
    label: "Inicio",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Venta de Parcelas",
    href: "/dashboard/parcelas",
    icon: LandPlot,
  },
  {
    label: "Cuota Extraordinaria",
    href: "/dashboard/cuota-extraordinaria",
    icon: Banknote,
  },
  {
    label: "Prestamos",
    href: "/dashboard/prestamos",
    icon: Banknote,
  },
  {
    label: "Balance",
    href: "/dashboard/balance",
    icon: Scale,
  },
  {
    label: "Administracion",
    href: "/dashboard/admin",
    icon: ShieldCheck,
  },
]

function SidebarContent({
  userName,
  userRole,
  pathname,
  onLogout,
  onNavigate,
}: {
  userName: string
  userRole: UserRole
  pathname: string
  onLogout: () => void
  onNavigate?: () => void
}) {
  const filteredNavItems = navItems.filter((item) => hasAccess(userRole, item.href));
  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5">
        <Image
          src="/images/logo-ltc.png"
          alt="Lawn Tenis Club Logo"
          width={40}
          height={40}
          className="rounded"
        />
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-sidebar-foreground leading-tight">
            Lawn Tenis Club
          </span>
          <span className="text-xs text-sidebar-foreground/60 leading-tight">
            Sub Comision de Hockey
          </span>
        </div>
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <ul className="flex flex-col gap-1">
          {filteredNavItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4">
        <Separator className="mb-4 bg-sidebar-border" />
        <div className="mb-1 px-3">
          <span className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-medium", getRoleColor(userRole))}>
            {ROLE_LABELS[userRole]}
          </span>
        </div>
        <p className="mb-2 truncate px-3 text-xs text-sidebar-foreground/50">
          {userName}
        </p>
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Cerrar sesion
        </button>
      </div>
    </div>
  )
}

export function DashboardSidebar({ userName, userRole }: { userName: string; userRole: UserRole }) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success("Sesion cerrada")
    router.push("/auth/login")
    router.refresh()
  }

  return (
    <>
      {/* Mobile: top bar with hamburger */}
      <header className="sticky top-0 z-50 flex items-center gap-3 border-b border-border bg-card px-4 py-3 md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Abrir menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 bg-sidebar p-0">
            <SheetTitle className="sr-only">Menu de navegacion</SheetTitle>
            <SidebarContent
              userName={userName}
              userRole={userRole}
              pathname={pathname}
              onLogout={handleLogout}
              onNavigate={() => setOpen(false)}
            />
          </SheetContent>
        </Sheet>
        <Image
          src="/images/logo-ltc.png"
          alt="Lawn Tenis Club Logo"
          width={32}
          height={32}
          className="rounded"
        />
        <span className="text-sm font-semibold text-foreground">Lawn Tenis Club</span>
      </header>

      {/* Desktop: fixed sidebar */}
      <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:border-r md:border-sidebar-border md:bg-sidebar">
        <SidebarContent
          userName={userName}
          userRole={userRole}
          pathname={pathname}
          onLogout={handleLogout}
        />
      </aside>
    </>
  )
}
