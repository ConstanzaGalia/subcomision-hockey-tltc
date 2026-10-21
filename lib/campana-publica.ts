import { DOLAR_BLUE_FALLBACK, type DolarBlue } from "@/lib/tipo-cambio"

export type CampanaPublicaRow = {
  objetivo_usd: number | string | null
  parcelas_usd: number | string | null
  prestamos_usd: number | string | null
  cuota_usd: number | string | null
  cuota_ars: number | string | null
  productos_usd: number | string | null
  productos_ars: number | string | null
  parcelas_vendidas: number | string | null
}

export type CampanaPublica = {
  objetivoUsd: number
  parcelasUsd: number
  prestamosUsd: number
  cuotaUsd: number
  cuotaArs: number
  productosUsd: number
  productosArs: number
  parcelasVendidas: number
  totalUsd: number
  totalArs: number
  arsEnUsd: number
  totalUsdEquivalente: number
  blueVenta: number
  blueFecha: string | null
  blueFuente: DolarBlue["fuente"]
  porcentaje: number | null
}

export const TOTAL_PARCELAS = 500

const DEFAULT_BLUE: DolarBlue = {
  venta: DOLAR_BLUE_FALLBACK,
  fecha: null,
  fuente: "fallback",
}

export const EMPTY_CAMPANA: CampanaPublica = {
  objetivoUsd: 0,
  parcelasUsd: 0,
  prestamosUsd: 0,
  cuotaUsd: 0,
  cuotaArs: 0,
  productosUsd: 0,
  productosArs: 0,
  parcelasVendidas: 0,
  totalUsd: 0,
  totalArs: 0,
  arsEnUsd: 0,
  totalUsdEquivalente: 0,
  blueVenta: DOLAR_BLUE_FALLBACK,
  blueFecha: null,
  blueFuente: "fallback",
  porcentaje: null,
}

function toNumber(value: number | string | null | undefined): number {
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

export function parseCampana(
  row: CampanaPublicaRow | null | undefined,
  cotizacion: DolarBlue = DEFAULT_BLUE
): CampanaPublica {
  const objetivoUsd = toNumber(row?.objetivo_usd)
  const parcelasUsd = toNumber(row?.parcelas_usd)
  const prestamosUsd = toNumber(row?.prestamos_usd)
  const cuotaUsd = toNumber(row?.cuota_usd)
  const cuotaArs = toNumber(row?.cuota_ars)
  const productosUsd = toNumber(row?.productos_usd)
  const productosArs = toNumber(row?.productos_ars)
  const parcelasVendidas = Math.round(toNumber(row?.parcelas_vendidas))
  const totalUsd = parcelasUsd + prestamosUsd + cuotaUsd + productosUsd
  const totalArs = cuotaArs + productosArs
  const venta = cotizacion.venta > 0 ? cotizacion.venta : DOLAR_BLUE_FALLBACK
  const arsEnUsd = totalArs > 0 ? totalArs / venta : 0
  const totalUsdEquivalente = totalUsd + arsEnUsd
  const porcentaje =
    objetivoUsd > 0 ? Math.min(100, Math.round((totalUsdEquivalente / objetivoUsd) * 100)) : null

  return {
    objetivoUsd,
    parcelasUsd,
    prestamosUsd,
    cuotaUsd,
    cuotaArs,
    productosUsd,
    productosArs,
    parcelasVendidas,
    totalUsd,
    totalArs,
    arsEnUsd,
    totalUsdEquivalente,
    blueVenta: venta,
    blueFecha: cotizacion.fecha,
    blueFuente: cotizacion.fuente,
    porcentaje,
  }
}

export function campanaFromRpc(data: unknown, cotizacion?: DolarBlue): CampanaPublica {
  if (Array.isArray(data)) {
    return parseCampana((data[0] as CampanaPublicaRow | undefined) ?? null, cotizacion)
  }
  if (data && typeof data === "object") {
    return parseCampana(data as CampanaPublicaRow, cotizacion)
  }
  return parseCampana(null, cotizacion)
}

export function formatMoney(currency: "USD" | "ARS", amount: number): string {
  return `${currency} ${amount.toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`
}

export function cotizacionLabel(campana: CampanaPublica): string {
  const rate = campana.blueVenta.toLocaleString("es-AR", { maximumFractionDigits: 0 })
  if (campana.blueFuente === "fallback") {
    return `Cotización de respaldo: 1 USD = ${rate} ARS.`
  }
  return `Pesos convertidos al dólar blue venta del día (1 USD = ${rate} ARS, dolarapi.com).`
}
