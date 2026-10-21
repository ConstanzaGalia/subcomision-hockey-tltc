import { formatMoney } from "@/lib/campana-publica"
import {
  CARPETA_NOTA_FUENTES,
  CARPETA_RUBROS,
  OBRA_CIVIL_APROX_ARS,
  PRESUPUESTO_RUBROS,
  PROYECTO_APROX_USD,
} from "@/lib/presupuesto-obra"

export function ProyectoCancha() {
  return (
    <section id="proyecto" className="scroll-mt-28 bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="font-heading text-xs font-black tracking-widest text-[#7c5800] uppercase">
            El proyecto
          </span>
          <h2 className="font-heading mt-1 text-3xl font-black text-[#00163d] uppercase sm:text-4xl">
            El proyecto de la cancha
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            La nueva cancha de hockey se construye en dos etapas que se complementan: primero se
            prepara el predio y la base de juego; después se coloca la carpeta de arena. El
            proyecto completo ronda {formatMoney("USD", PROYECTO_APROX_USD)} y puede ajustarse a
            medida que avancen las cotizaciones.
          </p>
        </div>

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
                Orden de magnitud del proyecto completo (obra inicial + carpeta).
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
          actualiza desde la subcomisión y se muestra en la sección de avance.
        </p>
      </div>
    </section>
  )
}
