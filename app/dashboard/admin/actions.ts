"use server"

import { createClient } from "@/lib/supabase/server"
import { isValidRole, type UserRole } from "@/lib/roles"

export type UpdateRoleResult = { ok: true } | { ok: false; error: string }

/**
 * Actualiza el rol de un usuario. Solo los ADMIN pueden ejecutar esta acción.
 * Un admin no puede cambiar su propio rol.
 */
export async function updateUserRole(
  profileId: string,
  newRole: string
): Promise<UpdateRoleResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, error: "No autorizado" }
  }

  if (!isValidRole(newRole)) {
    return { ok: false, error: "Rol no válido" }
  }

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const myRole = (myProfile?.role as UserRole) ?? "ENTRENADOR"
  if (myRole !== "ADMIN") {
    return { ok: false, error: "Solo un administrador puede cambiar roles" }
  }

  if (profileId === user.id) {
    return { ok: false, error: "No podés cambiar tu propio rol" }
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role: newRole as UserRole })
    .eq("id", profileId)

  if (error) {
    return { ok: false, error: error.message }
  }

  return { ok: true }
}
