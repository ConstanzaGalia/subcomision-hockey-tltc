export type UserRole =
  | "ADMIN"
  | "SUBCOMISION"
  | "COORDINADOR_DEPORTIVO"
  | "ENTRENADOR"
  | "JUGADORA"

/** Lista ordenada de roles de staff (para selects de admin; sin JUGADORA). */
export const USER_ROLES: UserRole[] = [
  "ADMIN",
  "SUBCOMISION",
  "COORDINADOR_DEPORTIVO",
  "ENTRENADOR",
]

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrador",
  SUBCOMISION: "Sub Comision",
  COORDINADOR_DEPORTIVO: "Coordinador Deportivo",
  ENTRENADOR: "Entrenador",
  JUGADORA: "Jugadora",
}

/** Comprueba si un valor es un UserRole válido */
export function isValidRole(value: string): value is UserRole {
  return (
    USER_ROLES.includes(value as UserRole) || value === "JUGADORA"
  )
}

/** Devuelve todos los roles de staff (alias de USER_ROLES por compatibilidad) */
export function getAllRoles(): UserRole[] {
  return [...USER_ROLES]
}

export function isJugadoraRole(role: string | null | undefined): boolean {
  return role === "JUGADORA"
}

export function homePathForRole(role: string | null | undefined): string {
  return isJugadoraRole(role) ? "/portal" : "/dashboard"
}

// Define which roles can access each section
// ADMIN can always access everything (handled in hasAccess)
const SECTION_ACCESS: Record<string, UserRole[]> = {
  "/dashboard": ["ADMIN", "SUBCOMISION", "COORDINADOR_DEPORTIVO", "ENTRENADOR"],
  "/dashboard/parcelas": ["ADMIN", "SUBCOMISION"],
  "/dashboard/prestamos": ["ADMIN", "SUBCOMISION"],
  "/dashboard/cuota-extraordinaria": ["ADMIN", "SUBCOMISION"],
  "/dashboard/rifas": ["ADMIN", "SUBCOMISION"],
  "/dashboard/balance": ["ADMIN", "SUBCOMISION"],
  "/dashboard/ventas-productos": ["ADMIN", "SUBCOMISION"],
  "/dashboard/ubicaciones": ["ADMIN", "SUBCOMISION"],
  "/dashboard/admin": ["ADMIN", "SUBCOMISION", "COORDINADOR_DEPORTIVO", "ENTRENADOR"],
  "/dashboard/admin/jugadoras": ["ADMIN", "SUBCOMISION", "COORDINADOR_DEPORTIVO", "ENTRENADOR"],
  "/dashboard/admin/usuarios": ["ADMIN"],
  "/portal": ["JUGADORA"],
}

export function hasAccess(role: UserRole, path: string): boolean {
  if (role === "ADMIN") {
    // Admin no usa el portal de jugadoras
    if (path === "/portal" || path.startsWith("/portal/")) return false
    return true
  }

  if (role === "JUGADORA") {
    return path === "/portal" || path.startsWith("/portal/")
  }

  const exactMatch = SECTION_ACCESS[path]
  if (exactMatch) return exactMatch.includes(role)

  const matchingPath = Object.keys(SECTION_ACCESS)
    .filter((key) => path.startsWith(key))
    .sort((a, b) => b.length - a.length)[0]

  if (matchingPath) return SECTION_ACCESS[matchingPath].includes(role)

  return false
}

export function getRoleColor(role: UserRole): string {
  switch (role) {
    case "ADMIN":
      return "bg-red-100 text-red-800"
    case "SUBCOMISION":
      return "bg-blue-100 text-blue-800"
    case "COORDINADOR_DEPORTIVO":
      return "bg-amber-100 text-amber-800"
    case "ENTRENADOR":
      return "bg-green-100 text-green-800"
    case "JUGADORA":
      return "bg-violet-100 text-violet-800"
    default:
      return "bg-muted text-muted-foreground"
  }
}
