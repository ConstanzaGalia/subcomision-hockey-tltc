"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { type UserRole, ROLE_LABELS, getRoleColor, USER_ROLES } from "@/lib/roles"
import { cn } from "@/lib/utils"
import { Users, Save, Search } from "lucide-react"
import { updateUserRole } from "@/app/dashboard/admin/actions"

interface Profile {
  id: string
  email: string
  nombre?: string | null
  apellido?: string | null
  role: UserRole
  created_at: string
}

function getDisplayName(p: Profile): string {
  const name = [p.nombre, p.apellido].filter(Boolean).join(" ").trim()
  return name || p.email
}

export function AdminClient({
  initialProfiles,
  currentUserId,
}: {
  initialProfiles: Profile[]
  currentUserId: string
}) {
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles)
  const [editingRoles, setEditingRoles] = useState<Record<string, UserRole>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [searchName, setSearchName] = useState("")
  const [filterRole, setFilterRole] = useState<string>("all")

  const filteredProfiles = profiles.filter((p) => {
    const displayName = getDisplayName(p).toLowerCase()
    const matchName = !searchName || displayName.includes(searchName.toLowerCase()) || p.email.toLowerCase().includes(searchName.toLowerCase())
    const matchRole = filterRole === "all" || p.role === filterRole
    return matchName && matchRole
  })

  async function handleRoleChange(profileId: string, newRole: UserRole) {
    setSaving(profileId)
    const result = await updateUserRole(profileId, newRole)

    if (result.ok) {
      setProfiles((prev) =>
        prev.map((p) => (p.id === profileId ? { ...p, role: newRole } : p))
      )
      setEditingRoles((prev) => {
        const updated = { ...prev }
        delete updated[profileId]
        return updated
      })
      toast.success("Rol actualizado correctamente")
    } else {
      toast.error("Error al actualizar rol", { description: result.error })
    }
    setSaving(null)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        {USER_ROLES.map((role) => (
          <Card key={role}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {ROLE_LABELS[role]}
              </CardTitle>
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-foreground">
                {profiles.filter((p) => p.role === role).length}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Usuarios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre..."
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Todos los roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los roles</SelectItem>
                {USER_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mobile list */}
          <div className="flex flex-col gap-3 md:hidden">
            {filteredProfiles.map((profile) => {
              const displayRole = editingRoles[profile.id] ?? profile.role
              const hasChanges = displayRole !== profile.role
              const isCurrentUser = profile.id === currentUserId

              return (
                <div
                  key={profile.id}
                  className="flex flex-col gap-3 rounded-lg border border-border p-4"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground truncate">
                      {getDisplayName(profile)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(profile.created_at).toLocaleDateString("es-AR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={displayRole}
                      onValueChange={(value: UserRole) =>
                        setEditingRoles((prev) => ({
                          ...prev,
                          [profile.id]: value,
                        }))
                      }
                      disabled={isCurrentUser}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {USER_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {hasChanges && !isCurrentUser && (
                      <Button
                        size="icon"
                        onClick={() => handleRoleChange(profile.id, displayRole)}
                        disabled={saving === profile.id}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {isCurrentUser && (
                    <p className="text-xs text-muted-foreground">
                      No podes cambiar tu propio rol
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Rol Actual</TableHead>
                  <TableHead>Cambiar Rol</TableHead>
                  <TableHead>Registrado</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfiles.map((profile) => {
                  const displayRole = editingRoles[profile.id] ?? profile.role
                  const hasChanges = displayRole !== profile.role
                  const isCurrentUser = profile.id === currentUserId

                  return (
                    <TableRow key={profile.id}>
                      <TableCell className="font-medium text-foreground">
                        {getDisplayName(profile)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium",
                            getRoleColor(profile.role)
                          )}
                        >
                          {ROLE_LABELS[profile.role]}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={displayRole}
                          onValueChange={(value: UserRole) =>
                            setEditingRoles((prev) => ({
                              ...prev,
                              [profile.id]: value,
                            }))
                          }
                          disabled={isCurrentUser}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {USER_ROLES.map((role) => (
                              <SelectItem key={role} value={role}>
                                {ROLE_LABELS[role]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(profile.created_at).toLocaleDateString("es-AR")}
                      </TableCell>
                      <TableCell>
                        {hasChanges && !isCurrentUser && (
                          <Button
                            size="sm"
                            onClick={() => handleRoleChange(profile.id, displayRole)}
                            disabled={saving === profile.id}
                          >
                            {saving === profile.id ? "..." : "Guardar"}
                          </Button>
                        )}
                        {isCurrentUser && !hasChanges && (
                          <span className="text-xs text-muted-foreground">Tu cuenta</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
