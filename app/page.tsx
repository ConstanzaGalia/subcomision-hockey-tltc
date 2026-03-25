import { createClient } from "@/lib/supabase/server"
import { ParcelasMap, type ParcelaPublica } from "@/components/parcelas-map"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { WhatsAppParcelaFab, WHATSAPP_PARCELA_URL } from "@/components/whatsapp-parcela-fab"
import { MessageCircle } from "lucide-react"

export default async function Home() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isLoggedIn = Boolean(user)

  const { data } = await supabase.rpc("get_parcelas_publicas")
  const parcelas = (data ?? []) as ParcelaPublica[]

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/images/logo-ltc.png"
              alt="Tucumán Lawn Tennis Club"
              width={36}
              height={36}
              className="rounded"
              priority
            />
            <div className="leading-tight">
              <div className="text-sm font-semibold text-foreground">Tucumán Lawn Tennis Club</div>
              <div className="text-xs text-muted-foreground">Hockey</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-5 text-sm text-muted-foreground md:flex">
            <a href="#mapa" className="transition-colors hover:text-foreground">
              Mapa
            </a>
            <a href="#sumate" className="transition-colors hover:text-foreground">
              Sumate
            </a>
          </nav>

          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <Button asChild>
                <Link href="/dashboard">Ir al dashboard</Link>
              </Button>
            ) : (
              <Button asChild>
                <Link href="/auth/login">Iniciar sesión</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -top-24 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute -bottom-24 left-1/3 h-[22rem] w-[22rem] -translate-x-1/2 rounded-full bg-secondary/25 blur-3xl" />
          </div>

          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:py-16 lg:items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-secondary" />
                Campaña “Parcela a Parcela”
              </div>

              <h1 className="text-4xl font-bold tracking-tight text-foreground text-balance md:text-5xl">
                🏑💙 Más que una cancha, un sueño…
              </h1>

              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  Hoy tenemos la oportunidad de construir juntos algo grande: una nueva cancha de hockey sintética para el
                  Tucumán Lawn Tennis Club.
                </p>
                <p>
                  Cada parcela simboliza más que un espacio en el campo: representa compromiso, comunidad y futuro.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3" id="sumate">
                <div className="rounded-lg border bg-card px-4 py-3">
                  <div className="text-xs text-muted-foreground">Valor de cada parcela</div>
                  <div className="text-lg font-semibold text-foreground">200 USD</div>
                </div>
                <Button variant="secondary" asChild>
                  <a href="#mapa">Ver mapa</a>
                </Button>
              </div>

              <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-secondary/15 p-6 shadow-md ring-1 ring-primary/10">
                <p className="text-base leading-relaxed text-muted-foreground md:text-lg">
                  ¿Nos ayudás a hacerlo realidad?
                  <br />
                  <span className="font-semibold text-foreground">
                    Sumate a este sueño que se vive, se siente y se comparte.
                  </span>
                </p>
                <Button
                  asChild
                  size="lg"
                  className="mt-5 h-12 gap-2 bg-red-600 px-8 text-base font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:bg-red-700 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
                >
                  <a
                    href={WHATSAPP_PARCELA_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Quiero mi parcela: abrir WhatsApp para contactar"
                  >
                    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-8 w-8"
        aria-hidden
      >
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
                    Quiero mi parcela
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section id="mapa" className="border-t bg-background">
          <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
            <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Mapa de parcelas</h2>
                <p className="text-sm text-muted-foreground">
                  Las parcelas vendidas se muestran destacadas. Desktop: hover. Mobile: tap.
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Para elegir el número de parcela, hacé <span className="font-medium text-foreground">click/tap</span>{" "}
                  sobre una parcela.
                </p>
              </div>
              <div className="text-xs text-muted-foreground">
                Consejo: acercá/alejá con zoom del navegador para ver mejor los números.
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-4 shadow-sm md:p-6">
              <ParcelasMap items={parcelas} />
            </div>
          </div>
        </section>

        <section className="border-t bg-muted/20">
          <div className="mx-auto max-w-6xl px-4 py-10">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-xl border bg-card p-5">
                <div className="text-sm font-semibold text-foreground">Transparencia</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Cada parcela queda registrada y numerada, para que el avance sea claro y ordenado.
                </p>
              </div>
              <div className="rounded-xl border bg-card p-5">
                <div className="text-sm font-semibold text-foreground">Comunidad</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Esto se construye entre todos: familias, jugadores, entrenadores y amigos del club.
                </p>
              </div>
              <div className="rounded-xl border bg-card p-5">
                <div className="text-sm font-semibold text-foreground">Futuro</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Una cancha sintética abre puertas: más entrenamientos, torneos y crecimiento para el hockey.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <div>© {new Date().getFullYear()} Tucumán Lawn Tennis Club</div>
          <div className="flex items-center gap-3">
            <a className="transition-colors hover:text-foreground" href="#mapa">
              Mapa
            </a>
            <a className="transition-colors hover:text-foreground" href="#sumate">
              Sumate
            </a>
          </div>
        </div>
      </footer>

      <WhatsAppParcelaFab />
    </div>
  )
}
