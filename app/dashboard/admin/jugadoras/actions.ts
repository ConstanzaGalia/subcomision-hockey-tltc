"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { hasAccess, type UserRole } from "@/lib/roles"
import {
  dniEsValido,
  divisionCodigoPorFecha,
  normalizarDni,
  PREINTERMEDIA_CODIGO,
} from "@/lib/categorias"
import type { BloqueRow, DivisionRow, JugadoraInput, JugadoraRow } from "@/lib/jugadoras"

export type JugadorasActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string }

type ManagerAuth =
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>>; userId: string }
  | { ok: false; error: string }

async function requireManager(): Promise<ManagerAuth> {
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
    return { ok: false, error: "No tenés permiso para gestionar jugadoras" }
  }
  return { ok: true, supabase, userId: user.id }
}

function uniqueError(message: string): string {
  if (message.includes("bloques_nombre_por_division")) {
    return "Ya existe un bloque con ese nombre en esta división"
  }
  if (message.includes("jugadoras_dni_unique") || message.includes("jugadoras_dni")) {
    return "Ya existe una jugadora con ese DNI"
  }
  return message
}

function parseInput(input: JugadoraInput): { error: string } | {
  apellido: string
  nombre: string
  dni: string
  fecha_nacimiento: string
  divisionManual: boolean
} {
  const apellido = input.apellido.trim()
  const nombre = input.nombre.trim()
  const dni = normalizarDni(input.dni)
  const fecha_nacimiento = input.fecha_nacimiento.slice(0, 10)

  if (!apellido) return { error: "El apellido es obligatorio" }
  if (!nombre) return { error: "El nombre es obligatorio" }
  if (!dniEsValido(dni)) return { error: "El DNI debe tener entre 7 y 9 dígitos" }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha_nacimiento)) {
    return { error: "La fecha de nacimiento no es válida" }
  }
  return { apellido, nombre, dni, fecha_nacimiento, divisionManual: input.divisionManual }
}

async function resolverDivision(
  supabase: Awaited<ReturnType<typeof createClient>>,
  fechaNacimiento: string,
  divisionManual: boolean
): Promise<{ error: string } | { division_id: string; division_manual: boolean }> {
  const codigo = divisionManual ? PREINTERMEDIA_CODIGO : divisionCodigoPorFecha(fechaNacimiento)
  const { data, error } = await supabase
    .from("divisiones")
    .select("id")
    .eq("codigo", codigo)
    .single()

  if (error || !data) {
    return { error: "No se encontró la división. Ejecutá el script 015_jugadoras.sql." }
  }
  return { division_id: data.id, division_manual: divisionManual }
}

function revalidate() {
  revalidatePath("/dashboard/admin/jugadoras")
}

export async function createJugadora(
  input: JugadoraInput
): Promise<JugadorasActionResult<JugadoraRow>> {
  const auth = await requireManager()
  if (!auth.ok) return { ok: false, error: auth.error }

  const parsed = parseInput(input)
  if ("error" in parsed) return { ok: false, error: parsed.error }

  const division = await resolverDivision(auth.supabase, parsed.fecha_nacimiento, parsed.divisionManual)
  if ("error" in division) return { ok: false, error: division.error }

  const { data, error } = await auth.supabase
    .from("jugadoras")
    .insert({
      apellido: parsed.apellido,
      nombre: parsed.nombre,
      dni: parsed.dni,
      fecha_nacimiento: parsed.fecha_nacimiento,
      division_id: division.division_id,
      division_manual: division.division_manual,
      bloque_id: null,
      activa: true,
      user_id: auth.userId,
    })
    .select(
      "id, apellido, nombre, dni, fecha_nacimiento, division_id, division_manual, bloque_id, activa"
    )
    .single()

  if (error || !data) return { ok: false, error: uniqueError(error?.message ?? "No se pudo crear") }
  revalidate()
  return { ok: true, data: data as JugadoraRow }
}

export async function updateJugadora(
  id: string,
  input: JugadoraInput
): Promise<JugadorasActionResult<JugadoraRow>> {
  const auth = await requireManager()
  if (!auth.ok) return { ok: false, error: auth.error }

  const parsed = parseInput(input)
  if ("error" in parsed) return { ok: false, error: parsed.error }

  const division = await resolverDivision(auth.supabase, parsed.fecha_nacimiento, parsed.divisionManual)
  if ("error" in division) return { ok: false, error: division.error }

  const { data: actual } = await auth.supabase
    .from("jugadoras")
    .select("division_id, bloque_id")
    .eq("id", id)
    .single()

  const bloque_id =
    actual?.division_id === division.division_id ? actual.bloque_id : null

  const { data, error } = await auth.supabase
    .from("jugadoras")
    .update({
      apellido: parsed.apellido,
      nombre: parsed.nombre,
      dni: parsed.dni,
      fecha_nacimiento: parsed.fecha_nacimiento,
      division_id: division.division_id,
      division_manual: division.division_manual,
      bloque_id,
    })
    .eq("id", id)
    .select(
      "id, apellido, nombre, dni, fecha_nacimiento, division_id, division_manual, bloque_id, activa"
    )
    .single()

  if (error || !data) return { ok: false, error: uniqueError(error?.message ?? "No se pudo actualizar") }
  revalidate()
  return { ok: true, data: data as JugadoraRow }
}

export async function setJugadoraActiva(
  id: string,
  activa: boolean
): Promise<JugadorasActionResult<JugadoraRow>> {
  const auth = await requireManager()
  if (!auth.ok) return { ok: false, error: auth.error }

  const { data, error } = await auth.supabase
    .from("jugadoras")
    .update({ activa })
    .eq("id", id)
    .select(
      "id, apellido, nombre, dni, fecha_nacimiento, division_id, division_manual, bloque_id, activa"
    )
    .single()

  if (error || !data) return { ok: false, error: error?.message ?? "No se pudo actualizar el estado" }
  revalidate()
  return { ok: true, data: data as JugadoraRow }
}

export async function deleteJugadora(id: string): Promise<JugadorasActionResult> {
  const auth = await requireManager()
  if (!auth.ok) return { ok: false, error: auth.error }

  const { error } = await auth.supabase.from("jugadoras").delete().eq("id", id)
  if (error) return { ok: false, error: error.message }
  revalidate()
  return { ok: true, data: undefined }
}

export async function moverJugadoraBloque(
  jugadoraId: string,
  bloqueId: string | null
): Promise<JugadorasActionResult> {
  const auth = await requireManager()
  if (!auth.ok) return { ok: false, error: auth.error }

  if (bloqueId) {
    const { data: jugadora } = await auth.supabase
      .from("jugadoras")
      .select("division_id")
      .eq("id", jugadoraId)
      .single()
    const { data: bloque } = await auth.supabase
      .from("bloques")
      .select("division_id")
      .eq("id", bloqueId)
      .single()
    if (!jugadora || !bloque || jugadora.division_id !== bloque.division_id) {
      return { ok: false, error: "El bloque no pertenece a la misma división" }
    }
  }

  const { error } = await auth.supabase
    .from("jugadoras")
    .update({ bloque_id: bloqueId })
    .eq("id", jugadoraId)

  if (error) return { ok: false, error: error.message }
  revalidate()
  return { ok: true, data: undefined }
}

export async function createBloque(
  divisionId: string,
  nombre: string
): Promise<JugadorasActionResult<BloqueRow>> {
  const auth = await requireManager()
  if (!auth.ok) return { ok: false, error: auth.error }

  const trimmed = nombre.trim()
  if (!trimmed) return { ok: false, error: "El nombre del bloque es obligatorio" }

  const { data: last } = await auth.supabase
    .from("bloques")
    .select("orden")
    .eq("division_id", divisionId)
    .order("orden", { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data, error } = await auth.supabase
    .from("bloques")
    .insert({
      division_id: divisionId,
      nombre: trimmed,
      orden: (last?.orden ?? 0) + 1,
    })
    .select("id, division_id, nombre, orden")
    .single()

  if (error || !data) return { ok: false, error: uniqueError(error?.message ?? "No se pudo crear el bloque") }
  revalidate()
  return { ok: true, data: data as BloqueRow }
}

export async function renameBloque(
  id: string,
  nombre: string
): Promise<JugadorasActionResult<BloqueRow>> {
  const auth = await requireManager()
  if (!auth.ok) return { ok: false, error: auth.error }

  const trimmed = nombre.trim()
  if (!trimmed) return { ok: false, error: "El nombre del bloque es obligatorio" }

  const { data, error } = await auth.supabase
    .from("bloques")
    .update({ nombre: trimmed })
    .eq("id", id)
    .select("id, division_id, nombre, orden")
    .single()

  if (error || !data) return { ok: false, error: uniqueError(error?.message ?? "No se pudo renombrar") }
  revalidate()
  return { ok: true, data: data as BloqueRow }
}

export async function deleteBloque(id: string): Promise<JugadorasActionResult> {
  const auth = await requireManager()
  if (!auth.ok) return { ok: false, error: auth.error }

  const { error } = await auth.supabase.from("bloques").delete().eq("id", id)
  if (error) return { ok: false, error: error.message }
  revalidate()
  return { ok: true, data: undefined }
}

export async function recalcularCategorias(): Promise<
  JugadorasActionResult<{ actualizadas: number }>
> {
  const auth = await requireManager()
  if (!auth.ok) return { ok: false, error: auth.error }

  const { data: divisiones, error: divError } = await auth.supabase
    .from("divisiones")
    .select("id, codigo")

  if (divError || !divisiones) {
    return { ok: false, error: "No se pudieron cargar las divisiones" }
  }

  const byCodigo = Object.fromEntries(
    (divisiones as Pick<DivisionRow, "id" | "codigo">[]).map((d) => [d.codigo, d.id])
  )

  const { data: jugadoras, error } = await auth.supabase
    .from("jugadoras")
    .select("id, fecha_nacimiento, division_id")
    .eq("division_manual", false)

  if (error) return { ok: false, error: error.message }

  let actualizadas = 0
  for (const j of jugadoras ?? []) {
    const codigo = divisionCodigoPorFecha(j.fecha_nacimiento)
    const nuevaDivision = byCodigo[codigo]
    if (!nuevaDivision || nuevaDivision === j.division_id) continue

    const { error: updError } = await auth.supabase
      .from("jugadoras")
      .update({ division_id: nuevaDivision, bloque_id: null })
      .eq("id", j.id)

    if (updError) return { ok: false, error: updError.message }
    actualizadas += 1
  }

  revalidate()
  return { ok: true, data: { actualizadas } }
}
