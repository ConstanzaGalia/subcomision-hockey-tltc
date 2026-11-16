"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { hasAccess, type UserRole } from "@/lib/roles"
import { matchJugadoraByNombre } from "@/lib/match-jugadora"
import type { JugadoraOption } from "@/lib/jugadoras"

export type VincularMovimientosResult =
  | {
      ok: true
      rifas: { linked: number; unresolved: number }
      cuotas: { linked: number; unresolved: number }
      parcelas: { linked: number; unresolved: number }
      unresolvedNames: string[]
    }
  | { ok: false; error: string }

async function requireFinanzasManager(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "No autorizado" }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const role = (profile?.role as UserRole) ?? "ENTRENADOR"
  if (
    !hasAccess(role, "/dashboard/rifas") &&
    !hasAccess(role, "/dashboard/admin/jugadoras")
  ) {
    return { ok: false, error: "No tenés permiso" }
  }
  return { ok: true }
}

async function linkTable(
  admin: ReturnType<typeof createAdminClient>,
  table: "rifas" | "cuota_extraordinaria" | "parcelas_ventas",
  jugadoras: JugadoraOption[],
): Promise<{ linked: number; unresolved: number; unresolvedNames: string[] }> {
  const { data: rows, error } = await admin
    .from(table)
    .select("id, nombre_apellido")
    .is("jugadora_id", null)

  if (error) throw new Error(`${table}: ${error.message}`)

  let linked = 0
  let unresolved = 0
  const unresolvedNames: string[] = []
  const seenUnresolved = new Set<string>()

  for (const row of rows ?? []) {
    const match = matchJugadoraByNombre(String(row.nombre_apellido ?? ""), jugadoras)
    if (!match) {
      unresolved += 1
      const name = String(row.nombre_apellido ?? "").trim()
      if (name && !seenUnresolved.has(name)) {
        seenUnresolved.add(name)
        unresolvedNames.push(name)
      }
      continue
    }

    const { error: updError } = await admin
      .from(table)
      .update({
        jugadora_id: match.id,
        nombre_apellido: `${match.nombre} ${match.apellido}`.trim(),
      })
      .eq("id", row.id)

    if (updError) {
      unresolved += 1
      continue
    }
    linked += 1
  }

  return { linked, unresolved, unresolvedNames }
}

/** Vincula rifas / cuota / parcelas sin jugadora_id usando el nombre libre. */
export async function vincularMovimientosAJugadoras(): Promise<VincularMovimientosResult> {
  const auth = await requireFinanzasManager()
  if (!auth.ok) return auth

  let admin
  try {
    admin = createAdminClient()
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? e.message
          : "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor",
    }
  }

  const { data: jugadorasRaw, error } = await admin
    .from("jugadoras")
    .select("id, apellido, nombre, dni")
    .eq("activa", true)

  if (error) return { ok: false, error: error.message }
  const jugadoras = (jugadorasRaw ?? []) as JugadoraOption[]

  try {
    const rifas = await linkTable(admin, "rifas", jugadoras)
    const cuotas = await linkTable(admin, "cuota_extraordinaria", jugadoras)
    const parcelas = await linkTable(admin, "parcelas_ventas", jugadoras)

    const unresolvedNames = [
      ...new Set([
        ...rifas.unresolvedNames,
        ...cuotas.unresolvedNames,
        ...parcelas.unresolvedNames,
      ]),
    ].sort((a, b) => a.localeCompare(b, "es"))

    return {
      ok: true,
      rifas: { linked: rifas.linked, unresolved: rifas.unresolved },
      cuotas: { linked: cuotas.linked, unresolved: cuotas.unresolved },
      parcelas: { linked: parcelas.linked, unresolved: parcelas.unresolved },
      unresolvedNames: unresolvedNames.slice(0, 40),
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Error al vincular movimientos",
    }
  }
}
