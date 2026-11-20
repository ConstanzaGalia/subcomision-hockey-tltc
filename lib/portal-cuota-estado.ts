export type PortalCuotaEstadoRow = {
  jugadora_id: string
  apellido: string
  nombre: string
  dni: string
  division_id: string
  division_nombre: string
  bloque_id: string | null
  bloque_nombre: string | null
  pago: boolean
  pagos_count: number
  ultima_fecha: string | null
}

export type PortalCuotaEstadoFiltro = "todas" | "pago" | "debe"

export function labelEstadoCuota(pago: boolean): "Pagó" | "Debe" {
  return pago ? "Pagó" : "Debe"
}
