"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { LoginForm } from "@/components/auth/login-form"
import { RegisterForm } from "@/components/auth/register-form"
import { useAuth } from "@/lib/auth"
import { Building2 } from "lucide-react"
import { cn } from "@/lib/utils"

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (user) {
      const returnTo = searchParams.get("returnTo")
      if (returnTo && returnTo.startsWith("/dashboard")) {
        router.push(returnTo)
      } else {
        router.push(`/dashboard/${user.role}`)
      }
    }
  }, [user, router, searchParams])

  if (user) {
    return null
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-primary/80 p-12 text-primary-foreground">
        <div className="flex flex-col justify-center max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <Building2 className="h-10 w-10" />
            <div>
              <h1 className="text-2xl font-bold">BricksBazar</h1>
              <p className="text-primary-foreground/80 text-sm">Digital Marketplace for Construction</p>
            </div>
          </div>
          <h2 className="text-4xl font-bold mb-6 text-balance">Transforming Construction Supply Chains</h2>
          <p className="text-lg text-primary-foreground/90 mb-8 text-pretty">
            Connect with verified suppliers, get instant cost estimates, and manage your construction projects with
            smart digital tools.
          </p>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-secondary rounded-full"></div>
              <span>Smart Cost Estimation</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-secondary rounded-full"></div>
              <span>Verified Supplier Network</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-secondary rounded-full"></div>
              <span>Real-time Delivery Tracking</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-muted/30">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Building2 className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">BricksBazar</span>
            </div>
            <p className="text-muted-foreground">Digital Marketplace for Construction</p>
          </div>

          <div className="mb-4 grid grid-cols-2 rounded-lg border bg-background p-1">
            <button
              type="button"
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isLogin ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setIsLogin(true)}
            >
              Sign In
            </button>
            <button
              type="button"
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                !isLogin ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setIsLogin(false)}
            >
              Sign Up
            </button>
          </div>

          <div className="overflow-hidden">
            <div
              className={cn(
                "flex w-[200%] transition-transform duration-300 ease-out",
                isLogin ? "translate-x-0" : "-translate-x-1/2",
              )}
            >
              <div className="w-1/2 pr-1">
                <LoginForm onToggleMode={() => setIsLogin(false)} />
              </div>
              <div className="w-1/2 pl-1">
                <RegisterForm onToggleMode={() => setIsLogin(true)} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
