"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { hasAccess, type UserRole } from "@/lib/roles"
import { emailFromDni } from "@/lib/jugadora-auth"
import { normalizarDni, dniEsValido } from "@/lib/categorias"

export type SyncCuentasResult =
  | {
      ok: true
      created: number
      linked: number
      skipped: number
      errors: string[]
    }
  | { ok: false; error: string }

async function requireJugadorasManager(): Promise<
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
  if (!hasAccess(role, "/dashboard/admin/jugadoras")) {
    return { ok: false, error: "No tenés permiso" }
  }
  return { ok: true }
}

/**
 * Crea cuentas Auth (DNI/DNI) para jugadoras activas sin cuenta_user_id
 * y vincula cuenta_user_id. Idempotente.
 */
export async function syncCuentasJugadoras(): Promise<SyncCuentasResult> {
  const auth = await requireJugadorasManager()
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

  const { data: jugadoras, error } = await admin
    .from("jugadoras")
    .select("id, dni, nombre, apellido, cuenta_user_id, activa")
    .eq("activa", true)
    .order("apellido", { ascending: true })

  if (error) return { ok: false, error: error.message }

  let created = 0
  let linked = 0
  let skipped = 0
  const errors: string[] = []

  const emailToUserId = new Map<string, string>()
  let page = 1
  for (;;) {
    const { data: listed, error: listError } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    })
    if (listError) return { ok: false, error: listError.message }
    for (const u of listed?.users ?? []) {
      if (u.email) emailToUserId.set(u.email.toLowerCase(), u.id)
    }
    if (!listed?.users?.length || listed.users.length < 1000) break
    page += 1
    if (page > 20) break
  }

  for (const j of jugadoras ?? []) {
    const dni = normalizarDni(String(j.dni ?? ""))
    if (!dniEsValido(dni)) {
      skipped += 1
      errors.push(`${j.apellido}, ${j.nombre}: DNI inválido`)
      continue
    }

    if (j.cuenta_user_id) {
      skipped += 1
      continue
    }

    const email = emailFromDni(dni)
    let userId = emailToUserId.get(email.toLowerCase()) ?? null

    if (!userId) {
      const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
        email,
        password: dni,
        email_confirm: true,
        user_metadata: {
          role: "JUGADORA",
          nombre: j.nombre,
          apellido: j.apellido,
          dni,
        },
      })
      if (createError || !createdUser.user) {
        errors.push(
          `${j.apellido}, ${j.nombre}: ${createError?.message ?? "No se pudo crear la cuenta"}`,
        )
        continue
      }
      userId = createdUser.user.id
      emailToUserId.set(email.toLowerCase(), userId)
      created += 1
    } else {
      linked += 1
    }

    await admin
      .from("profiles")
      .update({
        role: "JUGADORA",
        nombre: j.nombre,
        apellido: j.apellido,
      })
      .eq("id", userId)

    const { error: linkError } = await admin
      .from("jugadoras")
      .update({ cuenta_user_id: userId })
      .eq("id", j.id)

    if (linkError) {
      errors.push(`${j.apellido}, ${j.nombre}: ${linkError.message}`)
    }
  }

  return { ok: true, created, linked, skipped, errors }
}

/** Crea / vincula la cuenta Auth de una jugadora concreta (alta o retry). */
export async function provisionCuentaJugadora(
  jugadoraId: string,
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const auth = await requireJugadorasManager()
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

  const { data: j, error } = await admin
    .from("jugadoras")
    .select("id, dni, nombre, apellido, cuenta_user_id, activa")
    .eq("id", jugadoraId)
    .maybeSingle()

  if (error || !j) return { ok: false, error: error?.message ?? "Jugadora no encontrada" }
  if (j.cuenta_user_id) return { ok: true, userId: j.cuenta_user_id }

  const dni = normalizarDni(String(j.dni ?? ""))
  if (!dniEsValido(dni)) return { ok: false, error: "DNI inválido" }

  const email = emailFromDni(dni)
  let userId: string | null = null

  const { data: listed } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const existing = listed?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (existing) {
    userId = existing.id
  } else {
    const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
      email,
      password: dni,
      email_confirm: true,
      user_metadata: {
        role: "JUGADORA",
        nombre: j.nombre,
        apellido: j.apellido,
        dni,
      },
    })
    if (createError || !createdUser.user) {
      return { ok: false, error: createError?.message ?? "No se pudo crear la cuenta" }
    }
    userId = createdUser.user.id
  }

  await admin
    .from("profiles")
    .update({
      role: "JUGADORA",
      nombre: j.nombre,
      apellido: j.apellido,
    })
    .eq("id", userId)

  const { error: linkError } = await admin
    .from("jugadoras")
    .update({ cuenta_user_id: userId })
    .eq("id", j.id)

  if (linkError) return { ok: false, error: linkError.message }
  return { ok: true, userId }
}
