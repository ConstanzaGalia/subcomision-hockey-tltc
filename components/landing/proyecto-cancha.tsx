import { formatMoney } from "@/lib/campana-publica"
import {
  CARPETA_NOTA_FUENTES,
  CARPETA_RUBROS,
  OBRA_CIVIL_APROX_ARS,
  PRESUPUESTO_RUBROS,
  PROYECTO_APROX_USD,
  PROYECTO_HITOS,
} from "@/lib/presupuesto-obra"
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
            años, la idea es dar el salto a cancha de agua, sobre el mismo predio. Los montos pueden
            ajustarse a medida que avancen las cotizaciones.
          </p>
        </div>

        <ol className="mx-auto mb-12 max-w-3xl">
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
                  {hito.pie ? (
                    <p className="mt-2 text-xs leading-relaxed text-slate-500">{hito.pie}</p>
                  ) : null}
                </article>
              </li>
            )
          })}
        </ol>

        <div className="grid gap-4 md:grid-cols-2">
          <article className="flex flex-col justify-between rounded-2xl border-2 border-[#fcb812] bg-amber-50/60 p-6">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="font-heading text-xs font-bold text-[#7c5800] uppercase">
                  Etapa 1
                </span>
                <span className="font-heading rounded-full bg-[#fcb812] px-2 py-0.5 text-[10px] font-black text-[#271900] uppercase">
                  Obra civil
                </span>
              </div>
              <h3 className="font-heading text-lg font-bold text-[#00163d] uppercase">
                Obra civil inicial
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Es el trabajo de suelo, cerramiento y servicios. Deja el campo listo para recibir la
                superficie de juego: se libera el terreno, se arma la base, se cierra el perímetro y
                se resuelven desagües, bancos y accesos.
              </p>
              <div className="mt-4 font-heading text-2xl font-black text-[#00163d]">
                ~ {formatMoney("ARS", OBRA_CIVIL_APROX_ARS)}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Cotización aproximada de esta etapa, redondeada. No incluye el detalle por rubro.
              </p>
            </div>
          </article>

          <article className="flex flex-col justify-between rounded-2xl bg-[#00163d] p-6 text-white shadow-md">
            <div>
              <div className="mb-3 flex items-center justify-between">
                <span className="font-heading text-xs font-bold text-[#fcb812] uppercase">
                  Etapa 2
                </span>
                <span className="font-heading rounded-full bg-[#fcb812] px-2 py-0.5 text-[10px] font-black text-[#271900] uppercase">
                  Superficie
                </span>
              </div>
              <h3 className="font-heading text-lg font-bold uppercase">
                Carpeta de arena / piso sintético
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-white/80">
                Superficie de césped sintético con relleno de arena. Se cotiza junto con la obra
                inicial: sin esta etapa no hay campo de juego, y sin la obra civil no hay dónde
                colocarla.
              </p>
              <div className="mt-4 font-heading text-2xl font-black text-[#fcb812]">
                ~ {formatMoney("USD", PROYECTO_APROX_USD)}
              </div>
              <p className="mt-1 text-xs text-white/60">
                Orden de magnitud de esta etapa (obra inicial + carpeta de arena).
              </p>
            </div>
          </article>
        </div>

        <div className="mt-8">
          <h3 className="font-heading text-lg font-black text-[#00163d] uppercase">
            Qué incluye la obra civil
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Qué trabajos incluye la primera etapa. Los montos son solo una referencia aproximada
            por etapa, no un desglose. Lo recaudado está en Avance.
          </p>

          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PRESUPUESTO_RUBROS.map((rubro) => (
              <li
                key={rubro.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <div className="font-heading text-sm font-bold text-[#00163d] uppercase">
                  {rubro.numero}. {rubro.nombre}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">{rubro.descripcion}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-12">
          <h3 className="font-heading text-lg font-black text-[#00163d] uppercase">
            Qué incluye la carpeta de arena
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Desglose aproximado de la superficie de hockey con relleno de arena. No es un
            presupuesto cerrado del club.
          </p>

          <ol className="mt-6 grid gap-4 sm:grid-cols-2">
            {CARPETA_RUBROS.map((rubro) => (
              <li
                key={rubro.id}
                className="rounded-2xl border border-[#00163d]/10 bg-[#eff4ff] p-5"
              >
                <div className="font-heading text-sm font-bold text-[#00163d] uppercase">
                  {rubro.numero}. {rubro.nombre}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">{rubro.descripcion}</p>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs leading-relaxed text-slate-500">{CARPETA_NOTA_FUENTES}</p>
        </div>

        <p className="mt-6 text-xs leading-relaxed text-slate-500">
          Las cotizaciones pueden variar hacia arriba o hacia abajo. El objetivo en dólares se
          actualiza desde la subcomisión y se muestra en la sección de avance. La cancha de agua no
          tiene cifra publicada.
        </p>
      </div>
    </section>
  )
}
