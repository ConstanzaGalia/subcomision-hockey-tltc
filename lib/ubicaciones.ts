/** Nombre de la ubicación usada como default en migración SQL y en formularios nuevos. */
export const DEFAULT_UBICACION_NOMBRE = "Cuenta Hockey"

export type UbicacionOption = {
  id: string
  nombre: string
  orden: number | null
}

export function defaultUbicacionId(ubicaciones: UbicacionOption[]): string {
  const match = ubicaciones.find((u) => u.nombre === DEFAULT_UBICACION_NOMBRE)
  return match?.id ?? ubicaciones[0]?.id ?? ""
}

export function fuenteMovimientoLabel(fuente: string): string {
  switch (fuente) {
    case "PARCELA":
      return "Parcela"
    case "CUOTA_EXTRAORDINARIA":
      return "Cuota extraordinaria"
    case "PRESTAMO":
      return "Préstamo"
    case "VENTA_PRODUCTO":
      return "Venta producto"
    case "BALANCE":
      return "Balance"
    default:
      return fuente
  }
}
