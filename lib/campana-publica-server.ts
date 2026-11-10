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
  const [objetivo, parcelas, prestamos, cuotas, ventas, balance, rifas, asignaciones] =
    await Promise.all([
      supabase.from("objetivo_cancha").select("monto_usd").eq("id", "default").maybeSingle(),
      supabase.from("parcelas_ventas").select("precio"),
      supabase.from("prestamos").select("monto").eq("cuenta_para_cancha", true),
      supabase.from("cuota_extraordinaria").select("monto, moneda").eq("cuenta_para_cancha", true),
      supabase
        .from("producto_ventas")
        .select("total, productos(moneda)")
        .eq("cuenta_para_cancha", true),
      supabase
        .from("balance_movimientos")
        .select("monto, moneda")
        .eq("tipo", "INGRESO")
        .eq("cuenta_para_cancha", true),
      supabase
        .from("rifas")
        .select("moneda, rifas_pagos(monto), rifas_campanas!inner(cuenta_para_cancha)")
        .eq("rifas_campanas.cuenta_para_cancha", true),
      supabase.from("parcelas_asignaciones").select("parcela_numero", { count: "exact", head: true }),
    ])

  const cuotaRows = (cuotas.data ?? []) as { monto: number | string; moneda: string }[]
  const ventaRows = (ventas.data ?? []) as { total: number | string; productos: ProductoJoin }[]
  const balanceRows = (balance.data ?? []) as { monto: number | string; moneda: string }[]
  const rifaRows = (rifas.data ?? []) as {
    moneda: string
    rifas_pagos: { monto: number | string }[] | { monto: number | string } | null
  }[]

  let productosUsd = 0
  let productosArs = 0
  for (const venta of ventaRows) {
    const join = venta.productos
    const moneda = Array.isArray(join) ? join[0]?.moneda : join?.moneda
    const total = Number(venta.total ?? 0)
    if (moneda === "USD") productosUsd += total
    if (moneda === "ARS") productosArs += total
  }

  let rifasUsd = 0
  let rifasArs = 0
  for (const rifa of rifaRows) {
    const pagos = Array.isArray(rifa.rifas_pagos)
      ? rifa.rifas_pagos
      : rifa.rifas_pagos
        ? [rifa.rifas_pagos]
        : []
    const sum = pagos.reduce((acc, p) => acc + Number(p.monto ?? 0), 0)
    if (rifa.moneda === "USD") rifasUsd += sum
    if (rifa.moneda === "ARS") rifasArs += sum
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
      balance_usd: sumByCurrency(balanceRows, "USD"),
      balance_ars: sumByCurrency(balanceRows, "ARS"),
      rifas_usd: rifasUsd,
      rifas_ars: rifasArs,
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
