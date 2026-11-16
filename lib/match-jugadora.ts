import type { JugadoraOption } from "@/lib/jugadoras"
import { normalizarDni } from "@/lib/categorias"

/** Quita acentos, puntuación y unifica espacios para comparar nombres. */
export function normalizePersonName(raw: string): string {
  return String(raw ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[´'`]/g, "")
    .replace(/\bd\s*\.\s*/g, "d")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function nameTokens(raw: string): string[] {
  return normalizePersonName(raw).split(" ").filter(Boolean)
}

function sortedKey(tokens: string[]): string {
  return [...tokens].sort().join(" ")
}

function nombreCompletoTokens(j: JugadoraOption): string[] {
  return [...nameTokens(j.nombre), ...nameTokens(j.apellido)]
}

/**
 * Busca una única jugadora que coincida con el texto libre.
 * Devuelve null si no hay match o si hay ambigüedad.
 */
export function matchJugadoraByNombre(
  nombreLibre: string,
  jugadoras: JugadoraOption[],
): JugadoraOption | null {
  const raw = String(nombreLibre ?? "").trim()
  if (!raw) return null

  const digits = normalizarDni(raw)
  if (/^\d{7,9}$/.test(digits) && digits === normalizePersonName(raw).replace(/\s/g, "")) {
    const byDni = jugadoras.filter((j) => normalizarDni(j.dni) === digits)
    return byDni.length === 1 ? byDni[0] : null
  }

  let freeTokens = nameTokens(raw)
  if (raw.includes(",")) {
    const [left, ...rest] = raw.split(",")
    const swapped = `${rest.join(",")} ${left}`
    const swappedTokens = nameTokens(swapped)
    if (swappedTokens.length >= 2) freeTokens = swappedTokens
  }

  if (freeTokens.length < 2) return null

  const freeKey = sortedKey(freeTokens)
  const exact: JugadoraOption[] = []
  const contained: JugadoraOption[] = []

  for (const j of jugadoras) {
    const jTokens = nombreCompletoTokens(j)
    if (jTokens.length < 2) continue
    const jKey = sortedKey(jTokens)

    if (jKey === freeKey) {
      exact.push(j)
      continue
    }

    // Todos los tokens del texto aparecen en la jugadora y viceversa (mismo conjunto)
    // o el texto tiene todos los tokens de la jugadora (y no agrega ajenos de más de 0).
    const freeSet = new Set(freeTokens)
    const jSet = new Set(jTokens)
    const freeInJ = freeTokens.every((t) => jSet.has(t))
    const jInFree = jTokens.every((t) => freeSet.has(t))
    if (freeInJ && jInFree) {
      exact.push(j)
      continue
    }

    // "Nombre Apellido" parcial: todos los tokens libres están en la jugadora,
    // y al menos apellido + un nombre coinciden (evita match por un solo apellido común).
    if (freeTokens.length >= 2 && freeInJ) {
      contained.push(j)
    }
  }

  if (exact.length === 1) return exact[0]
  if (exact.length > 1) return null
  if (contained.length === 1) return contained[0]
  return null
}

/**
 * Filtra jugadoras para el combobox: cada palabra del query debe aparecer
 * en apellido, nombre o DNI (sin acentos, orden libre).
 */
export function filterJugadorasByQuery(
  jugadoras: JugadoraOption[],
  query: string,
): JugadoraOption[] {
  const q = query.trim()
  if (!q) return jugadoras

  const digits = normalizarDni(q)
  const tokens = nameTokens(q)
  if (tokens.length === 0 && !digits) return jugadoras

  return jugadoras.filter((j) => {
    const dni = normalizarDni(j.dni)
    if (digits && dni.includes(digits)) return true

    const haystack = normalizePersonName(`${j.apellido} ${j.nombre} ${j.dni}`)
    return tokens.every((t) => haystack.includes(t))
  })
}

export function displayNombreDesdeJugadora(j: Pick<JugadoraOption, "nombre" | "apellido">): string {
  return `${j.nombre} ${j.apellido}`.trim()
}
