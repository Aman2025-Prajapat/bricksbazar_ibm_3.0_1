import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Calculator, MapPin, Shield, Truck, Users } from "lucide-react"
import Link from "next/link"
import { FeatureSlideshow } from "@/components/shared/feature-slideshow"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold">BricksBazar</h1>
              <p className="text-xs text-muted-foreground">Digital Marketplace for Construction</p>
            </div>
          </div>
          <Link href="/auth">
            <Button>Get Started</Button>
          </Link>
        </div>
      </header>

      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="mb-6 text-5xl font-bold text-balance">
          Transforming Construction Supply Chains into <span className="text-primary">Smart Digital Platforms</span>
        </h1>
        <p className="mx-auto mb-8 max-w-3xl text-xl text-muted-foreground text-pretty">
          Connect buyers, sellers, and distributors in a fair, transparent marketplace that supports both local
          retailers and big distributors.
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/auth">
            <Button size="lg" className="px-8 text-lg">
              Get Started
            </Button>
          </Link>
          <Link href="#features">
            <Button size="lg" variant="outline" className="bg-transparent px-8 text-lg">
              Explore Features
            </Button>
          </Link>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-16">
        <FeatureSlideshow />
      </section>

      <section id="features" className="container mx-auto px-4 py-20">
        <h2 className="mb-12 text-center text-3xl font-bold">Smart Digital Tools</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <Calculator className="mb-2 h-10 w-10 text-primary" />
              <CardTitle>Smart Cost Estimator</CardTitle>
              <CardDescription>Get instant material cost estimates for your construction projects</CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <MapPin className="mb-2 h-10 w-10 text-primary" />
              <CardTitle>Location-based Pricing</CardTitle>
              <CardDescription>Compare prices from local and regional suppliers in real-time</CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="mb-2 h-10 w-10 text-primary" />
              <CardTitle>Verified Suppliers</CardTitle>
              <CardDescription>Work with trusted, verified sellers and distributors</CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Truck className="mb-2 h-10 w-10 text-primary" />
              <CardTitle>Real-time Tracking</CardTitle>
              <CardDescription>Track your deliveries from order to doorstep</CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Users className="mb-2 h-10 w-10 text-primary" />
              <CardTitle>Fair Marketplace</CardTitle>
              <CardDescription>Balanced platform supporting both local retailers and distributors</CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Building2 className="mb-2 h-10 w-10 text-primary" />
              <CardTitle>Construction Planning</CardTitle>
              <CardDescription>AI-powered material suggestions for your projects</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      <section className="bg-muted/50 py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="mb-6 text-3xl font-bold">Solving Real Construction Challenges</h2>
            <p className="mb-12 text-lg text-muted-foreground text-pretty">
              Our platform addresses the imbalance between big distributors and local retailers through innovative
              algorithms and fair marketplace practices.
            </p>

            <div className="grid gap-8 text-left md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-destructive">The Problem</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>- Buyers prefer big distributors for lower prices</li>
                    <li>- Local sellers struggle to compete</li>
                    <li>- Lack of transparency in pricing</li>
                    <li>- Complex supply chain management</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-primary">Our Solution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>- Fair visibility algorithm</li>
                    <li>- Local-first policy with proximity highlighting</li>
                    <li>- Dynamic commission structure</li>
                    <li>- Trust badges for verified local sellers</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t bg-background py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="font-bold">BricksBazar</span>
          </div>
          <p className="text-muted-foreground">Copyright 2026 BricksBazar. Transforming construction supply chains.</p>
        </div>
      </footer>
    </div>
  )
}
