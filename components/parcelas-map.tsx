"use client"

import Image from "next/image"
import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useIsMobile } from "@/hooks/use-mobile"

export type ParcelaPublica = {
  parcela_numero: number
  nombre_apellido: string
}

type Props = {
  items: ParcelaPublica[]
  totalParcelas?: number
  columns?: number
  imageSrc?: string
}

function clampParcelNumber(n: number, max: number) {
  return Number.isFinite(n) && n >= 1 && n <= max
}

export function ParcelasMap({
  items,
  totalParcelas = 500,
  columns = 25,
  imageSrc = "/images/cancha-hockey-limpia.png",
}: Props) {
  const isMobile = useIsMobile()
  const rows = Math.ceil(totalParcelas / columns)

  const soldMap = useMemo(() => {
    const map = new Map<number, string>()
    for (const it of items) {
      if (clampParcelNumber(it.parcela_numero, totalParcelas)) {
        map.set(it.parcela_numero, it.nombre_apellido)
      }
    }
    return map
  }, [items, totalParcelas])

  const numbers = useMemo(() => Array.from({ length: totalParcelas }, (_, i) => i + 1), [totalParcelas])

  return (
    <div className="w-full">
      <div className="relative w-full overflow-hidden rounded-lg border bg-card">
        <Image
          src={imageSrc}
          alt="Mapa de la cancha de hockey"
          width={1600}
          height={900}
          priority
          className="h-auto w-full"
        />

        <div
          className="absolute inset-0 grid"
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
          }}
        >
          {numbers.map((n) => {
            const owner = soldMap.get(n)
            const sold = Boolean(owner)
            const Cell = (
              <button
                type="button"
                className={cn(
                  "group relative flex items-center justify-center border border-white/10 bg-transparent text-[10px] leading-none text-white/60 transition-colors",
                  "hover:bg-white/10 hover:text-white hover:border-white/25",
                  sold && "bg-emerald-500/30 text-white hover:bg-emerald-500/40 hover:border-emerald-200/45"
                )}
                aria-label={sold ? `Parcela ${n}. Vendida a ${owner}` : `Parcela ${n}. Disponible`}
              >
                <span className="select-none opacity-0 transition-opacity group-hover:opacity-100">
                  <span className="rounded bg-black/35 px-1 py-0.5 text-[10px] font-semibold text-white">
                    {n}
                  </span>
                </span>
                {sold && (
                  <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-emerald-300 shadow" />
                )}
              </button>
            )

            // Mobile: siempre Popover al tap (vendida o disponible)
            if (isMobile) {
              return (
                <Popover key={n}>
                  <PopoverTrigger asChild>{Cell}</PopoverTrigger>
                  <PopoverContent className="w-64" sideOffset={8}>
                    <div className="text-sm font-semibold">Parcela #{n}</div>
                    {sold ? (
                      <div className="mt-1 text-sm text-muted-foreground">{owner}</div>
                    ) : (
                      <div className="mt-1 text-sm text-muted-foreground">Disponible</div>
                    )}
                  </PopoverContent>
                </Popover>
              )
            }

            // Desktop: vendidas -> Tooltip al hover (dueño). Disponibles -> Popover al click (número).
            if (sold) {
              return (
                <Tooltip key={n}>
                  <TooltipTrigger asChild>{Cell}</TooltipTrigger>
                  <TooltipContent sideOffset={6}>
                    <span className="font-medium">Parcela #{n}:</span> {owner}
                  </TooltipContent>
                </Tooltip>
              )
            }

            return (
              <Popover key={n}>
                <PopoverTrigger asChild>{Cell}</PopoverTrigger>
                <PopoverContent className="w-56" sideOffset={8}>
                  <div className="text-sm font-semibold">Parcela #{n}</div>
                  <div className="mt-1 text-sm text-muted-foreground">Disponible</div>
                </PopoverContent>
              </Popover>
            )
          })}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <div>
          <span className="font-medium text-foreground">{soldMap.size}</span> vendidas /{" "}
          <span className="font-medium text-foreground">{totalParcelas}</span> parcelas
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400" /> Vendida
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-white/30" /> Disponible
          </span>
        </div>
      </div>
    </div>
  )
}

