"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export default function SignUpPage() {
  const [nombre, setNombre] = useState("")
  const [apellido, setApellido] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast.error("Las contrasenas no coinciden")
      return
    }

    if (password.length < 6) {
      toast.error("La contrasena debe tener al menos 6 caracteres")
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre: nombre.trim(), apellido: apellido.trim() },
        emailRedirectTo:
          process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
          `${window.location.origin}/dashboard`,
      },
    })

    if (error) {
      toast.error("Error al registrarse", {
        description: error.message,
      })
      setLoading(false)
      return
    }

    toast.success("Registro exitoso", {
      description: "Revisa tu email para confirmar tu cuenta.",
    })
    router.push("/auth/sign-up-success")
  }

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
            <CardTitle className="text-2xl font-bold text-foreground">Crear Cuenta</CardTitle>
            <CardDescription className="text-muted-foreground">Sub Comision de Hockey - Lawn Tenis Club</CardDescription>
          </div>
        </CardHeader>
        <form onSubmit={handleSignUp}>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  type="text"
                  placeholder="Tu nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="apellido">Apellido</Label>
                <Input
                  id="apellido"
                  type="text"
                  placeholder="Tu apellido"
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Contrasena</Label>
              <PasswordInput
                id="password"
                placeholder="Minimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirmPassword">Confirmar Contrasena</Label>
              <PasswordInput
                id="confirmPassword"
                placeholder="Repeti tu contrasena"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full mt-5" disabled={loading}>
              {loading ? "Registrando..." : "Registrarse"}
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              {"Ya tenes cuenta? "}
              <Link href="/auth/login" className="text-primary underline underline-offset-4 hover:text-primary/80">
                Inicia Sesion
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </main>
  )
}
