import {
  formatMoney,
  TOTAL_PARCELAS,
  type CampanaPublica,
} from "@/lib/campana-publica"
import { Banknote, Handshake, LandPlot, Package } from "lucide-react"

function SourceCard({
  title,
  usd,
  ars,
  hint,
  icon: Icon,
}: {
  title: string
  usd: number
  ars?: number
  hint?: string
  icon: typeof LandPlot
}) {
  return (
    <div className="flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <span className="font-heading rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 uppercase">
          {title}
        </span>
        <Icon className="h-4 w-4 text-[#00163d]" />
      </div>
      <div>
        <div className="font-heading text-xl font-black text-[#00163d]">{formatMoney("USD", usd)}</div>
        {ars != null && ars > 0 && (
          <div className="mt-1 text-sm font-semibold text-slate-500">{formatMoney("ARS", ars)}</div>
        )}
        {hint ? <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{hint}</p> : null}
      </div>
    </div>
  )
}

export function AvanceCampana({ campana }: { campana: CampanaPublica }) {
  return (
    <section id="avance" className="scroll-mt-28 bg-[#eff4ff] py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <div className="font-heading mb-1 inline-flex items-center gap-2 text-xs font-black tracking-widest text-[#7c5800] uppercase">
              Transparencia
            </div>
            <h2 className="font-heading text-3xl font-black text-[#00163d] uppercase sm:text-4xl">
              Avance de la campaña
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Recaudado frente al objetivo estimado del proyecto.
            </p>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
            <div>
              <span className="font-heading text-[10px] font-bold text-slate-400 uppercase">
                Recaudado
              </span>
              <div className="font-heading text-lg font-black text-emerald-600">
                {formatMoney("USD", campana.totalUsd)}
              </div>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <span className="font-heading text-[10px] font-bold text-slate-400 uppercase">
                Objetivo
              </span>
              <div className="font-heading text-lg font-black text-[#00163d]">
                {formatMoney("USD", campana.objetivoUsd)}
              </div>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl bg-[#00163d] p-6 text-white shadow-md">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              {campana.porcentaje != null && (
                <span className="font-heading rounded-full bg-[#fcb812] px-3 py-1 text-xs font-black text-[#271900] uppercase">
                  {campana.porcentaje}% del objetivo
                </span>
              )}
              <div className="font-heading mt-4 text-3xl font-black text-[#fcb812] sm:text-4xl">
                {formatMoney("USD", campana.totalUsd)}
              </div>
              <p className="mt-2 max-w-xl text-sm text-white/80">
                Objetivo {formatMoney("USD", campana.objetivoUsd)}
              </p>
            </div>
            {campana.totalArs > 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-[11px] font-bold tracking-wider text-white/60 uppercase">
                  También recaudado en pesos
                </div>
                <div className="font-heading text-lg font-black text-white">
                  {formatMoney("ARS", campana.totalArs)}
                </div>
              </div>
            )}
          </div>
          <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-[#fcb812]"
              style={{ width: `${campana.porcentaje ?? 0}%` }}
            />
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SourceCard
            title="Parcelas"
            usd={campana.parcelasUsd}
            hint={`${campana.parcelasVendidas.toLocaleString("es-AR")} / ${TOTAL_PARCELAS} vendidas`}
            icon={LandPlot}
          />
          <SourceCard
            title="Cuota extraordinaria"
            usd={campana.cuotaUsd}
            ars={campana.cuotaArs}
            icon={Banknote}
          />
          <SourceCard
            title="Ventas"
            usd={campana.productosUsd}
            ars={campana.productosArs}
            icon={Package}
          />
          <SourceCard
            title="Aportes reintegrables"
            usd={campana.prestamosUsd}
            hint="Préstamos de socios"
            icon={Handshake}
          />
        </div>

        <p className="mt-6 text-xs leading-relaxed text-slate-500">
          Montos aproximados. La cotización del proyecto puede variar hacia arriba o hacia abajo.
          No se mezclan dólares y pesos: cada moneda se informa por separado.
        </p>
      </div>
    </section>
  )
}
