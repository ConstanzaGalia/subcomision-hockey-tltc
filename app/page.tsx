import { createClient } from "@/lib/supabase/server"
import { ParcelasMap, type ParcelaPublica } from "@/components/parcelas-map"
import { AvanceCampana } from "@/components/landing/avance-campana"
import { ProyectoCancha } from "@/components/landing/proyecto-cancha"
import Image from "next/image"
import Link from "next/link"
import { WhatsAppParcelaFab, WhatsAppIcon, WHATSAPP_PARCELA_URL } from "@/components/whatsapp-parcela-fab"
import { loadCampanaPublica } from "@/lib/campana-publica-server"
import { TOTAL_PARCELAS } from "@/lib/campana-publica"
import { Grid2x2, LayoutGrid, Shield } from "lucide-react"

export default async function Home() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isLoggedIn = Boolean(user)

  const [{ data }, campana] = await Promise.all([
    supabase.rpc("get_parcelas_publicas"),
    loadCampanaPublica(),
  ])
  const parcelas = (data ?? []) as ParcelaPublica[]
  const parcelasVendidas = Math.max(campana.parcelasVendidas, parcelas.length)
  const parcelasDisponibles = Math.max(0, TOTAL_PARCELAS - parcelasVendidas)
  const progresoParcelas =
    TOTAL_PARCELAS > 0 ? Math.min(100, (parcelasVendidas / TOTAL_PARCELAS) * 100) : 0

  return (
    <div className="landing min-h-screen overflow-x-hidden antialiased selection:bg-[#fcb812] selection:text-[#00163d]">
      <div className="flex items-center justify-center gap-2 border-b border-[#0f2b5c] bg-[#00163d] px-4 py-2 text-center text-xs font-semibold text-white sm:text-sm">
        <span className="inline-block h-2 w-2 animate-ping rounded-full bg-[#fcb812]" />
        <span>
          Campaña “Parcela a Parcela” · Quedan {parcelasDisponibles.toLocaleString("es-AR")} parcelas
        </span>
      </div>

      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:h-20 sm:px-6 lg:px-8">
          <Link href="/" className="group flex items-center gap-3">
            <Image
              src="/images/logo-ltc.png"
              alt="Tucumán Lawn Tennis Club"
              width={44}
              height={44}
              className="rounded-xl shadow-sm transition-transform duration-200 group-hover:scale-105"
              priority
            />
            <div className="flex flex-col">
              <span className="font-heading text-base leading-none font-black tracking-tight text-[#00163d] uppercase">
                TLTC Hockey
              </span>
              <span className="mt-1 text-[11px] font-bold tracking-widest text-[#7c5800] uppercase">
                Tucumán Lawn Tennis
              </span>
            </div>
          </Link>

          <nav className="font-heading hidden items-center gap-1 text-xs font-semibold tracking-wider text-slate-600 uppercase md:flex">
            <a className="rounded-lg px-3 py-2 transition-all hover:bg-[#e5eeff] hover:text-[#00163d]" href="#sumate">
              El sueño
            </a>
            <a className="rounded-lg px-3 py-2 transition-all hover:bg-[#e5eeff] hover:text-[#00163d]" href="#mapa">
              Mapa de parcelas
            </a>
            <a className="rounded-lg px-3 py-2 transition-all hover:bg-[#e5eeff] hover:text-[#00163d]" href="#avance">
              Avance
            </a>
            <a className="rounded-lg px-3 py-2 transition-all hover:bg-[#e5eeff] hover:text-[#00163d]" href="#proyecto">
              Proyecto
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <a
              className="font-heading hidden items-center gap-2 rounded-xl bg-[#00163d] px-4 py-2.5 text-xs font-bold text-white uppercase shadow-sm transition-all hover:bg-[#0f2b5c] sm:inline-flex"
              href="#mapa"
            >
              <LayoutGrid className="h-4 w-4" />
              Ver mapa
            </a>
            <a
              className="font-heading inline-flex items-center gap-2 rounded-xl bg-[#fcb812] px-4 py-2.5 text-xs font-black text-[#271900] uppercase shadow-[0_4px_14px_rgba(252,184,18,0.39)] transition-all hover:-translate-y-0.5 hover:bg-[#ffbb1e] hover:shadow-lg sm:px-5"
              href={WHATSAPP_PARCELA_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <WhatsAppIcon className="h-4 w-4" />
              <span className="hidden min-[380px]:inline">Adquirir parcela</span>
              <span className="min-[380px]:hidden">Sumate</span>
            </a>
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="hidden text-xs font-semibold text-slate-500 transition-colors hover:text-[#00163d] lg:inline"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/auth/login"
                className="hidden text-xs font-semibold text-slate-500 transition-colors hover:text-[#00163d] lg:inline"
              >
                Iniciar sesión
              </Link>
            )}
          </div>
        </div>
        <nav className="flex items-center gap-1 overflow-x-auto border-t border-slate-100 px-4 py-2 md:hidden">
          {[
            ["#sumate", "El sueño"],
            ["#mapa", "Mapa"],
            ["#avance", "Avance"],
            ["#proyecto", "Proyecto"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="font-heading whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold tracking-wider text-slate-600 uppercase"
            >
              {label}
            </a>
          ))}
        </nav>
      </header>

      <main className="w-full">
        <section
          id="sumate"
          className="relative scroll-mt-28 overflow-hidden bg-gradient-to-b from-white via-[#eff4ff] to-[#f8f9ff] pt-10 pb-16 lg:pt-16 lg:pb-24"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-6 flex flex-wrap items-center justify-center gap-2.5">
              <span className="font-heading inline-flex items-center gap-1.5 rounded-full border border-[#00163d]/10 bg-[#00163d]/5 px-3 py-1 text-xs font-bold tracking-wider text-[#00163d] uppercase">
                <span className="h-2 w-2 rounded-full bg-[#fcb812]" />
                Campaña “Parcela a Parcela”
              </span>
            </div>

            <div className="mx-auto mb-8 max-w-4xl text-center">
              <h1 className="font-heading text-4xl leading-none font-black tracking-tight text-[#00163d] uppercase sm:text-6xl lg:text-7xl">
                Más que una cancha,{" "}
                <span className="bg-gradient-to-r from-[#fcb812] via-amber-500 to-[#7c5800] bg-clip-text text-transparent">
                  un sueño
                </span>
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed font-medium text-slate-600 sm:text-xl">
                Hoy tenemos la oportunidad de construir juntos algo grande: una nueva cancha de
                hockey sintética para el{" "}
                <strong className="font-bold text-[#00163d]">Tucumán Lawn Tennis Club</strong>.
              </p>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-500 sm:text-base">
                Cada parcela simboliza más que un espacio en el campo: representa compromiso,
                comunidad y futuro.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                <a
                  className="font-heading inline-flex items-center gap-2.5 rounded-xl bg-[#00163d] px-7 py-3.5 text-sm font-bold tracking-wider text-white uppercase shadow-lg transition-all hover:-translate-y-0.5 hover:bg-[#0f2b5c] hover:shadow-[#00163d]/20"
                  href="#mapa"
                >
                  <LayoutGrid className="h-5 w-5" />
                  Ver mapa
                </a>
                <a
                  className="font-heading inline-flex items-center gap-2.5 rounded-xl bg-[#fcb812] px-7 py-3.5 text-sm font-black tracking-wider text-[#271900] uppercase shadow-md transition-all hover:-translate-y-0.5 hover:bg-[#ffbb1e]"
                  href={WHATSAPP_PARCELA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Quiero mi parcela: abrir WhatsApp para contactar"
                >
                  <WhatsAppIcon className="h-5 w-5" />
                  Quiero mi parcela
                </a>
              </div>
            </div>

            <div className="mx-auto mt-12 grid max-w-5xl grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
              <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-2 flex items-center justify-between text-slate-400">
                  <span className="font-heading text-xs font-bold tracking-wider uppercase">Total</span>
                  <Grid2x2 className="h-5 w-5 text-[#00163d]" />
                </div>
                <div className="font-heading text-3xl font-black text-[#00163d] sm:text-4xl">
                  {TOTAL_PARCELAS}
                </div>
                <div className="mt-1 text-xs font-semibold text-slate-500">Parcelas</div>
              </div>
              <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-2 flex items-center justify-between text-slate-400">
                  <span className="font-heading text-xs font-bold tracking-wider uppercase">
                    Cada parcela
                  </span>
                </div>
                <div className="font-heading text-3xl font-black text-[#00163d] sm:text-4xl">
                  USD 200
                </div>
                <div className="mt-1 text-xs font-semibold text-slate-500">Valor de cada parcela</div>
              </div>
              <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-2 flex items-center justify-between text-slate-400">
                  <span className="font-heading text-xs font-bold tracking-wider uppercase">
                    Escudo
                  </span>
                  <Shield className="h-5 w-5 text-[#fcb812]" />
                </div>
                <div className="font-heading text-3xl font-black text-[#7c5800] sm:text-4xl">
                  USD 500
                </div>
                <div className="mt-1 text-xs font-semibold text-slate-500">
                  Valor parcelas del escudo
                </div>
              </div>
              <div className="flex flex-col justify-between rounded-2xl bg-[#00163d] p-5 text-white shadow-md">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-heading text-xs font-bold tracking-wider text-[#fcb812] uppercase">
                    Progreso
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-heading text-3xl font-black text-[#fcb812] sm:text-4xl">
                    {parcelasVendidas.toLocaleString("es-AR")}
                  </span>
                  <span className="text-xs font-semibold text-white/70">
                    / {TOTAL_PARCELAS} vendidas
                  </span>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full bg-[#fcb812]"
                    style={{ width: `${progresoParcelas}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-center">
              <div className="max-w-xs">
                <div className="font-heading text-xs font-bold tracking-wider text-[#00163d] uppercase">
                  Comunidad
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Esto se construye entre todos: familias, jugadores, entrenadores y amigos del
                  club.
                </p>
              </div>
              <div className="max-w-xs">
                <div className="font-heading text-xs font-bold tracking-wider text-[#00163d] uppercase">
                  Futuro
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Una cancha sintética abre puertas: más entrenamientos, torneos y crecimiento para
                  el hockey.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="mapa" className="scroll-mt-28 border-y border-slate-100 bg-white py-14 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <div className="font-heading mb-1 inline-flex items-center gap-2 text-xs font-extrabold tracking-widest text-[#7c5800] uppercase">
                  <LayoutGrid className="h-4 w-4" />
                  Mapa de la cancha
                </div>
                <h2 className="font-heading text-3xl font-black text-[#00163d] uppercase sm:text-4xl">
                  Mapa de parcelas
                </h2>
                <p className="mt-1 max-w-xl text-sm text-slate-500">
                  Las parcelas vendidas se muestran destacadas. Desktop: hover. Mobile: tap. Para
                  elegir el número de parcela, hacé click/tap sobre una parcela.
                </p>
              </div>
              <div className="font-heading flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-bold">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 px-2.5 py-1 text-emerald-800">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Vendida
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-200/70 px-2.5 py-1 text-slate-700">
                  <span className="h-2.5 w-2.5 rounded-full border border-slate-400 bg-white" />{" "}
                  Disponible
                </span>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-3 shadow-xl sm:p-5">
              <ParcelasMap items={parcelas} totalParcelas={TOTAL_PARCELAS} showFooter={false} />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 pt-1 text-xs text-slate-300">
                <span className="font-heading font-bold text-white">
                  <span className="text-[#fcb812]">{parcelasVendidas.toLocaleString("es-AR")}</span>{" "}
                  parcelas vendidas /{" "}
                  <span className="text-slate-400">
                    {parcelasDisponibles.toLocaleString("es-AR")} disponibles
                  </span>
                </span>
                <span className="hidden text-[11px] font-semibold text-slate-400 sm:inline">
                  Consejo: acercá o alejá con el zoom del navegador para ver mejor los números.
                </span>
              </div>
            </div>
          </div>
        </section>

        <AvanceCampana campana={campana} />

        <ProyectoCancha />
      </main>

      <footer className="border-t border-slate-800 bg-slate-900 py-10 text-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-center sm:flex-row sm:px-6 sm:text-left lg:px-8">
          <div className="flex items-center gap-3">
            <Image
              src="/images/logo-ltc.png"
              alt=""
              width={32}
              height={32}
              className="rounded-lg"
            />
            <div className="flex flex-col">
              <span className="font-heading text-xs font-bold tracking-wider uppercase">
                Tucumán Lawn Tennis Club
              </span>
              <span className="text-[10px] text-slate-400">Subcomisión de Hockey</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
            <a className="transition-colors hover:text-white" href="#mapa">
              Mapa
            </a>
            <a className="transition-colors hover:text-white" href="#avance">
              Avance
            </a>
            <a className="transition-colors hover:text-white" href="#proyecto">
              Proyecto
            </a>
            {isLoggedIn ? (
              <Link className="transition-colors hover:text-white" href="/dashboard">
                Dashboard
              </Link>
            ) : (
              <Link className="transition-colors hover:text-white" href="/auth/login">
                Iniciar sesión
              </Link>
            )}
          </div>
          <div className="text-xs text-slate-400">
            © {new Date().getFullYear()} TLTC Hockey. Más que una cancha, un sueño.
          </div>
        </div>
      </footer>

      <WhatsAppParcelaFab />
    </div>
  )
}
