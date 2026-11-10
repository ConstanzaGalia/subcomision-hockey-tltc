export const PREINTERMEDIA_CODIGO = "preintermedia" as const

export type DivisionCodigoAuto =
  | "10ma"
  | "9na"
  | "8va"
  | "sub14"
  | "sub16"
  | "sub19"
  | "mayores"

export type DivisionCodigo = DivisionCodigoAuto | typeof PREINTERMEDIA_CODIGO

export function anioTemporada(now = new Date()): number {
  return now.getFullYear()
}

function parseFecha(fechaNacimiento: string): { y: number; m: number; d: number } {
  const [y, m, d] = fechaNacimiento.slice(0, 10).split("-").map(Number)
  return { y, m, d }
}

/** Año que cumple en la temporada (no la edad del día). */
export function edadCategoria(
  fechaNacimiento: string,
  temporada = anioTemporada()
): number {
  return temporada - parseFecha(fechaNacimiento).y
}

/** Años cumplidos a hoy. Columna Edad de la planilla. */
export function edadReal(fechaNacimiento: string, hoy = new Date()): number {
  const { y, m, d } = parseFecha(fechaNacimiento)
  let age = hoy.getFullYear() - y
  const month = hoy.getMonth() + 1
  const day = hoy.getDate()
  if (month < m || (month === m && day < d)) age -= 1
  return Math.max(0, age)
}

export function divisionCodigoPorEdad(edadCat: number): DivisionCodigoAuto {
  if (edadCat <= 8) return "10ma"
  if (edadCat <= 10) return "9na"
  if (edadCat <= 12) return "8va"
  if (edadCat <= 14) return "sub14"
  if (edadCat <= 16) return "sub16"
  if (edadCat <= 19) return "sub19"
  return "mayores"
}

export function divisionCodigoPorFecha(
  fechaNacimiento: string,
  temporada = anioTemporada()
): DivisionCodigoAuto {
  return divisionCodigoPorEdad(edadCategoria(fechaNacimiento, temporada))
}

export function normalizarDni(raw: string): string {
  return raw.replace(/\D/g, "")
}

export function formatDni(dni: string): string {
  const digits = normalizarDni(dni)
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

export function formatFechaAr(isoDate: string): string {
  const [y, m, d] = isoDate.slice(0, 10).split("-")
  if (!y || !m || !d) return isoDate
  return `${d}/${m}/${y}`
}

export function dniEsValido(dni: string): boolean {
  return /^[0-9]{7,9}$/.test(normalizarDni(dni))
}
