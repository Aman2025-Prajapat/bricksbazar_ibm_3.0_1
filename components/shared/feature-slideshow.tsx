"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Calculator, MapPin, Shield, Truck, Users, Building2, ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const featureSlides = [
  {
    title: "Smart Cost Estimator",
    description: "Instant material estimates for your construction projects with location-aware pricing.",
    href: "/auth",
    cta: "Try Estimator",
    icon: Calculator,
  },
  {
    title: "Location-Based Pricing",
    description: "Compare local and distributor rates quickly to make better purchase decisions.",
    href: "/auth",
    cta: "Compare Prices",
    icon: MapPin,
  },
  {
    title: "Verified Supplier Network",
    description: "Buy from trusted sellers and distributors with transparent ratings and stock visibility.",
    href: "/auth",
    cta: "Explore Suppliers",
    icon: Shield,
  },
  {
    title: "Live Delivery Tracking",
    description: "Track orders from dispatch to doorstep with real-time updates and milestones.",
    href: "/auth",
    cta: "Track Orders",
    icon: Truck,
  },
  {
    title: "Fair Marketplace Engine",
    description: "Balanced visibility for local sellers and larger distributors using fairness controls.",
    href: "/auth",
    cta: "See How It Works",
    icon: Users,
  },
  {
    title: "Project Planning Tools",
    description: "Plan materials, costs, and timelines in one place before site execution starts.",
    href: "/auth",
    cta: "Start Planning",
    icon: Building2,
  },
]

const AUTOPLAY_MS = 3600

export function FeatureSlideshow() {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featureSlides.length)
    }, AUTOPLAY_MS)

    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="max-w-4xl mx-auto">
      <div className="relative min-h-[260px] overflow-hidden rounded-2xl border bg-card shadow-sm">
        {featureSlides.map((slide, index) => {
          const Icon = slide.icon
          const isActive = index === currentIndex

          return (
            <div
              key={slide.title}
              className={cn(
                "absolute inset-0 transition-all duration-500 ease-out p-4 md:p-6",
                isActive ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0 pointer-events-none",
              )}
            >
              <Card className="h-full border-0 shadow-none">
                <CardHeader>
                  <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-2xl">{slide.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-muted-foreground">{slide.description}</p>
                  <Link href={slide.href}>
                    <Button className="gap-2">
                      {slide.cta}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex items-center justify-center gap-2">
        {featureSlides.map((slide, index) => (
          <button
            key={slide.title}
            aria-label={`Show ${slide.title}`}
            className={cn(
              "h-2.5 rounded-full transition-all",
              index === currentIndex ? "w-6 bg-primary" : "w-2.5 bg-muted-foreground/30 hover:bg-muted-foreground/60",
            )}
            onClick={() => setCurrentIndex(index)}
          />
        ))}
      </div>
    </div>
  )
}
