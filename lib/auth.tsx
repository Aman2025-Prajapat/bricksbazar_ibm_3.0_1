"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"

export type UserRole = "buyer" | "seller" | "distributor" | "admin"
export type RegistrationRole = Exclude<UserRole, "admin">

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  avatar?: string | null
  verified: boolean
  createdAt: Date
}

type ApiUser = Omit<User, "createdAt"> & { createdAt: string }
type MeResponse = { user: ApiUser | null; authenticated?: boolean }

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string, role: RegistrationRole) => Promise<void>
  logout: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function mapApiUser(user: ApiUser): User {
  return {
    ...user,
    createdAt: new Date(user.createdAt),
  }
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const loadSession = async () => {
      try {
        const response = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" })
        if (!response.ok) {
          if (!cancelled) {
            setUser(null)
          }
          return
        }

        const data = (await response.json()) as MeResponse
        if (!cancelled) {
          setUser(data.user ? mapApiUser(data.user) : null)
        }
      } catch {
        if (!cancelled) {
          setUser(null)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadSession()

    return () => {
      cancelled = true
    }
  }, [])

  const login = async (email: string, password: string) => {
    setLoading(true)
    try {
      const normalizedEmail = email.trim().toLowerCase()
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: normalizedEmail, password }),
      })

      const data = (await response.json()) as { user?: ApiUser; error?: string }

      if (!response.ok || !data.user) {
        throw new Error(data.error || "Login failed")
      }

      setUser(mapApiUser(data.user))
    } finally {
      setLoading(false)
    }
  }

  const register = async (email: string, password: string, name: string, role: RegistrationRole) => {
    setLoading(true)
    try {
      const normalizedEmail = email.trim().toLowerCase()
      const normalizedName = name.trim()
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: normalizedEmail, password, name: normalizedName, role }),
      })

      const data = (await response.json()) as { user?: ApiUser; error?: string }

      if (!response.ok || !data.user) {
        throw new Error(data.error || "Registration failed")
      }

      setUser(mapApiUser(data.user))
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      })
    } finally {
      setUser(null)
      if (typeof window !== "undefined") {
        window.location.assign("/auth")
      }
    }
  }

  return <AuthContext.Provider value={{ user, login, register, logout, loading }}>{children}</AuthContext.Provider>
}

