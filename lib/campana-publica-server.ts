import { createClient } from "@/lib/supabase/server"
import { campanaFromRpc, EMPTY_CAMPANA, parseCampana, type CampanaPublica } from "@/lib/campana-publica"
import { getDolarBlue } from "@/lib/tipo-cambio"

type ProductoJoin = { moneda: string | null } | { moneda: string | null }[] | null

function sumByCurrency(
  rows: { monto?: number | string | null; moneda?: string | null }[] | null,
  currency: "USD" | "ARS"
): number {
  return (rows ?? [])
    .filter((row) => row.moneda === currency)
    .reduce((sum, row) => sum + Number(row.monto ?? 0), 0)
}

async function loadCampanaFallback(
  supabase: Awaited<ReturnType<typeof createClient>>,
  cotizacion: Awaited<ReturnType<typeof getDolarBlue>>
): Promise<CampanaPublica> {
  const [objetivo, parcelas, prestamos, cuotas, ventas, asignaciones] = await Promise.all([
    supabase.from("objetivo_cancha").select("monto_usd").eq("id", "default").maybeSingle(),
    supabase.from("parcelas_ventas").select("precio"),
    supabase.from("prestamos").select("monto"),
    supabase.from("cuota_extraordinaria").select("monto, moneda"),
    supabase.from("producto_ventas").select("total, productos(moneda)"),
    supabase.from("parcelas_asignaciones").select("parcela_numero", { count: "exact", head: true }),
  ])

  const cuotaRows = (cuotas.data ?? []) as { monto: number | string; moneda: string }[]
  const ventaRows = (ventas.data ?? []) as { total: number | string; productos: ProductoJoin }[]

  let productosUsd = 0
  let productosArs = 0
  for (const venta of ventaRows) {
    const join = venta.productos
    const moneda = Array.isArray(join) ? join[0]?.moneda : join?.moneda
    const total = Number(venta.total ?? 0)
    if (moneda === "USD") productosUsd += total
    if (moneda === "ARS") productosArs += total
  }

  return parseCampana(
    {
      objetivo_usd: objetivo.data?.monto_usd ?? 0,
      parcelas_usd: (parcelas.data ?? []).reduce((sum, row) => sum + Number(row.precio ?? 0), 0),
      prestamos_usd: (prestamos.data ?? []).reduce((sum, row) => sum + Number(row.monto ?? 0), 0),
      cuota_usd: sumByCurrency(cuotaRows, "USD"),
      cuota_ars: sumByCurrency(cuotaRows, "ARS"),
      productos_usd: productosUsd,
      productos_ars: productosArs,
      parcelas_vendidas: asignaciones.count ?? 0,
    },
    cotizacion
  )
}

export async function loadCampanaPublica(): Promise<CampanaPublica> {
  const supabase = await createClient()
  const [rpcResult, cotizacion] = await Promise.all([
    supabase.rpc("get_campana_publica"),
    getDolarBlue(),
  ])
  if (!rpcResult.error && rpcResult.data) return campanaFromRpc(rpcResult.data, cotizacion)
  return loadCampanaFallback(supabase, cotizacion)
}

export { EMPTY_CAMPANA }
