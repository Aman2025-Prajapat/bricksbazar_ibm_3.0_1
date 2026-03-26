"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Users, Shield, Loader2 } from "lucide-react"

type ApiUser = {
  id: string
  name: string
  email: string
  role: "buyer" | "seller" | "distributor" | "admin"
  verified: boolean
  createdAt: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<ApiUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRole, setSelectedRole] = useState("all")
  const [selectedVerification, setSelectedVerification] = useState("all")

  useEffect(() => {
    let cancelled = false

    const loadUsers = async () => {
      try {
        const response = await fetch("/api/admin/users", { credentials: "include", cache: "no-store" })
        const payload = (await response.json()) as { users?: ApiUser[]; error?: string }

        if (!response.ok || !payload.users) {
          throw new Error(payload.error || "Could not load users")
        }

        if (!cancelled) setUsers(payload.users)
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Could not load users")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadUsers()

    return () => {
      cancelled = true
    }
  }, [])

  const roles = ["all", "buyer", "seller", "distributor", "admin"]

  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        const matchesSearch =
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.id.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesRole = selectedRole === "all" || user.role === selectedRole
        const matchesVerification =
          selectedVerification === "all" ||
          (selectedVerification === "verified" && user.verified) ||
          (selectedVerification === "unverified" && !user.verified)

        return matchesSearch && matchesRole && matchesVerification
      }),
    [users, searchTerm, selectedRole, selectedVerification],
  )

  const roleCount = (role: ApiUser["role"]) => users.filter((user) => user.role === role).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground">Live user directory with role and verification status</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Verified</p>
                <p className="text-2xl font-bold">{users.filter((user) => user.verified).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Sellers</p>
                <p className="text-2xl font-bold">{roleCount("seller")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Buyers</p>
                <p className="text-2xl font-bold">{roleCount("buyer")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search users by name, email, or ID..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedRole} onValueChange={setSelectedRole}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            {roles.map((role) => (
              <SelectItem key={role} value={role}>
                {role === "all" ? "All Roles" : role.charAt(0).toUpperCase() + role.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedVerification} onValueChange={setSelectedVerification}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Verification" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="unverified">Unverified</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            Showing {filteredUsers.length} of {users.length} users
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-muted-foreground flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading users...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">No users found for current filters.</div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div key={user.id} className="flex items-start justify-between gap-4 p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{user.name}</h3>
                      <Badge variant={user.verified ? "default" : "secondary"}>
                        {user.verified ? "Verified" : "Unverified"}
                      </Badge>
                      <Badge variant="outline">{user.role}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground">ID: {user.id}</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-muted-foreground">Joined</p>
                    <p className="font-medium">{new Date(user.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
