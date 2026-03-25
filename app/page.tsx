import { createClient } from "@/lib/supabase/server"
import { ParcelasMap, type ParcelaPublica } from "@/components/parcelas-map"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"

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

              <p className="text-muted-foreground leading-relaxed">
                ¿Nos ayudás a hacerlo realidad?
                <br />
                <span className="font-medium text-foreground">Sumate a este sueño que se vive, se siente y se comparte.</span>
              </p>
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
    </div>
  )
}
