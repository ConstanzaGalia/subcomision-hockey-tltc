import { formatMoney } from "@/lib/campana-publica"
import { PROYECTO_APROX_USD, PROYECTO_HITOS } from "@/lib/presupuesto-obra"
import { cn } from "@/lib/utils"

export function ProyectoCancha() {
  return (
    <section id="proyecto" className="scroll-mt-28 bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <span className="font-heading text-xs font-black tracking-widest text-[#7c5800] uppercase">
            El proyecto
          </span>
          <h2 className="font-heading mt-1 text-3xl font-black text-[#00163d] uppercase sm:text-4xl">
            El proyecto de la cancha
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            Primero se construye en arena: la obra civil y esa carpeta son lo que se recauda ahora
            (~ {formatMoney("USD", PROYECTO_APROX_USD)}). Más adelante, en un horizonte de unos tres
            años, la idea es dar el salto a cancha de agua, sobre el mismo predio.
          </p>
        </div>

        <ol className="mx-auto max-w-3xl">
          {PROYECTO_HITOS.map((hito, index) => {
            const isLast = index === PROYECTO_HITOS.length - 1
            return (
              <li key={hito.id} className="relative flex gap-3 sm:gap-4">
                <div className="flex w-5 shrink-0 flex-col items-center sm:w-6" aria-hidden>
                  <span
                    className={cn(
                      "z-10 mt-1.5 h-3.5 w-3.5 rounded-full border-2",
                      hito.destacado
                        ? "border-[#00163d] bg-[#fcb812]"
                        : "border-slate-300 bg-white",
                    )}
                  />
                  {!isLast ? (
                    <span
                      className={cn(
                        "mt-1 w-px flex-1",
                        hito.destacado ? "bg-[#00163d]/20" : "bg-slate-200",
                      )}
                    />
                  ) : null}
                </div>
                <article
                  className={cn(
                    "mb-4 flex-1 rounded-2xl p-4 sm:p-5",
                    isLast && "mb-0",
                    hito.destacado
                      ? "border border-[#00163d]/10 bg-[#eff4ff]"
                      : "border border-dashed border-slate-300 bg-white",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-heading text-xs font-bold text-[#7c5800] uppercase">
                      {hito.momento}
                    </span>
                    <span
                      className={cn(
                        "font-heading rounded-full px-2 py-0.5 text-[10px] font-black uppercase",
                        hito.destacado
                          ? "bg-[#fcb812] text-[#271900]"
                          : "bg-slate-100 text-slate-600",
                      )}
                    >
                      {hito.etiqueta}
                    </span>
                  </div>
                  <h3 className="font-heading mt-2 text-base font-bold text-[#00163d] uppercase sm:text-lg">
                    {hito.titulo}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{hito.descripcion}</p>
                  {hito.incluye && hito.incluye.length > 0 ? (
                    <ul className="mt-3 flex flex-wrap gap-1.5">
                      {hito.incluye.map((item) => (
                        <li
                          key={item}
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[11px] font-medium",
                            hito.destacado
                              ? "bg-white text-[#00163d] ring-1 ring-[#00163d]/10"
                              : "bg-slate-50 text-slate-600 ring-1 ring-slate-200",
                          )}
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {hito.pie ? (
                    <p className="mt-3 text-xs leading-relaxed text-slate-500">{hito.pie}</p>
                  ) : null}
                </article>
              </li>
            )
          })}
        </ol>

        <p className="mx-auto mt-8 max-w-3xl text-xs leading-relaxed text-slate-500">
          Las cotizaciones pueden variar. El objetivo en dólares se actualiza desde la subcomisión y
          se muestra en Avance. La cancha de agua no tiene cifra publicada.
        </p>
      </div>
    </section>
  )
}
