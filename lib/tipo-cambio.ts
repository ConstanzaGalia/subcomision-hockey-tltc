export const DOLAR_BLUE_FALLBACK = 1550

export type DolarBlue = {
  venta: number
  fecha: string | null
  fuente: "api" | "fallback"
}

export function fallbackDolarBlue(): DolarBlue {
  return { venta: DOLAR_BLUE_FALLBACK, fecha: null, fuente: "fallback" }
}

export async function getDolarBlue(): Promise<DolarBlue> {
  try {
    const res = await fetch("https://dolarapi.com/v1/dolares/blue", {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return fallbackDolarBlue()
    const data = (await res.json()) as { venta?: number; fechaActualizacion?: string }
    const venta = Number(data.venta)
    if (!Number.isFinite(venta) || venta <= 0) return fallbackDolarBlue()
    return {
      venta,
      fecha: typeof data.fechaActualizacion === "string" ? data.fechaActualizacion : null,
      fuente: "api",
    }
  } catch {
    return fallbackDolarBlue()
  }
}
