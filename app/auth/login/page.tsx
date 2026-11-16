"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { homePathForRole } from "@/lib/roles"
import { isDniLoginInput, loginIdentifierToEmail } from "@/lib/jugadora-auth"

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const email = loginIdentifierToEmail(identifier)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      toast.error("Error al iniciar sesion", {
        description: error.message,
      })
      setLoading(false)
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    let role: string | null = null
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle()
      role = profile?.role ?? null
    }

    toast.success("Sesion iniciada correctamente")
    router.push(homePathForRole(role))
    router.refresh()
    setLoading(false)
  }

  const dniMode = isDniLoginInput(identifier)

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col items-center gap-4">
          <Image
            src="/images/logo-ltc.png"
            alt="Lawn Tenis Club Logo"
            width={80}
            height={80}
            className="rounded-md"
          />
          <div className="text-center">
            <CardTitle className="text-2xl font-bold text-foreground">Lawn Tenis Club</CardTitle>
            <CardDescription className="text-muted-foreground">Sub Comision de Hockey</CardDescription>
          </div>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="identifier">DNI o email</Label>
              <Input
                id="identifier"
                type="text"
                inputMode="email"
                autoComplete="username"
                placeholder={dniMode ? "Tu DNI" : "tu@email.com o DNI"}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
              {dniMode ? (
                <p className="text-xs text-muted-foreground">
                  Jugadoras: usuario y contraseña son el DNI.
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Contrasena</Label>
              <PasswordInput
                id="password"
                placeholder={dniMode ? "Tu DNI" : "Tu contrasena"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full mt-5" disabled={loading}>
              {loading ? "Ingresando..." : "Iniciar Sesion"}
            </Button>
            {!dniMode ? (
              <p className="text-sm text-muted-foreground text-center">
                {"No tenes cuenta de staff? "}
                <Link
                  href="/auth/sign-up"
                  className="text-primary underline underline-offset-4 hover:text-primary/80"
                >
                  Registrate
                </Link>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground text-center">
                Si no podés entrar, pedile a la subcomisión que active tu cuenta.
              </p>
            )}
          </CardFooter>
        </form>
      </Card>
    </main>
  )
}
