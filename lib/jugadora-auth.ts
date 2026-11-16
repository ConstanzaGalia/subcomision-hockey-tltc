import { normalizarDni, dniEsValido } from "@/lib/categorias"

export const JUGADORA_EMAIL_DOMAIN = "jugadoras.tltc.local"

export function emailFromDni(dni: string): string {
  const clean = normalizarDni(dni)
  return `${clean}@${JUGADORA_EMAIL_DOMAIN}`
}

/** Si el input parece DNI (7–9 dígitos), devuelve el email sintético; si no, el string trimmeado (email staff). */
export function loginIdentifierToEmail(identifier: string): string {
  const trimmed = identifier.trim()
  const digits = normalizarDni(trimmed)
  if (dniEsValido(digits) && /^\d{7,9}$/.test(digits) && !trimmed.includes("@")) {
    return emailFromDni(digits)
  }
  return trimmed
}

export function isDniLoginInput(identifier: string): boolean {
  const trimmed = identifier.trim()
  if (trimmed.includes("@")) return false
  const digits = normalizarDni(trimmed)
  return dniEsValido(digits)
}
