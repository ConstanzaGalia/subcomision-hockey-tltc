import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { hasAccess, type UserRole } from "@/lib/roles"
import { anioTemporada } from "@/lib/categorias"
import { JugadorasClient } from "@/components/jugadoras-client"
import type { BloqueRow, DivisionRow, JugadoraRow } from "@/lib/jugadoras"

export default async function JugadorasPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const userRole = (profile?.role as UserRole) ?? "ENTRENADOR"

  if (!hasAccess(userRole, "/dashboard/admin/jugadoras")) {
    redirect("/dashboard")
  }

  const [divRes, bloqRes, jugRes] = await Promise.all([
    supabase.from("divisiones").select("*").order("orden", { ascending: true }),
    supabase.from("bloques").select("id, division_id, nombre, orden").order("orden", { ascending: true }),
    supabase
      .from("jugadoras")
      .select("id, apellido, nombre, dni, fecha_nacimiento, division_id, division_manual, bloque_id, activa")
      .order("apellido", { ascending: true })
      .order("nombre", { ascending: true }),
  ])

  const loadError =
    divRes.error || bloqRes.error || jugRes.error
      ? "No se pudo cargar el plantel. Ejecutá el script scripts/015_jugadoras.sql en el SQL Editor de Supabase."
      : null

  return (
    <JugadorasClient
      temporada={anioTemporada()}
      divisiones={(divRes.data ?? []) as DivisionRow[]}
      bloques={(bloqRes.data ?? []) as BloqueRow[]}
      jugadoras={(jugRes.data ?? []) as JugadoraRow[]}
      loadError={loadError}
    />
  )
}
