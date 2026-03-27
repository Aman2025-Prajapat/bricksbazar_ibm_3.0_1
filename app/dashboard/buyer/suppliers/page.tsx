"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Building2, Star, MapPin, Phone, Search, Heart, MessageCircle, ShoppingCart, Verified, Loader2 } from "lucide-react"

type ApiProduct = {
  id: string
  name: string
  category: string
  price: number
  unit: string
  stock: number
  status: "active" | "out_of_stock"
  rating: number
  sellerName: string
}

type Supplier = {
  id: string
  name: string
  category: string[]
  rating: number
  reviews: number
  location: string
  distanceKm: number
  verified: boolean
  description: string
  specialties: string[]
  contact: {
    phone: string
    email: string
  }
  priceRange: "budget" | "mid-range" | "premium"
  deliveryTime: string
  minOrder: number
}

const mpSellerDirectory: Record<
  string,
  {
    location: string
    distanceKm: number
    phone: string
    verified: boolean
    description: string
  }
> = {
  "Indore Brick Udyog": {
    location: "Indore, Madhya Pradesh",
    distanceKm: 36,
    phone: "+91 731 410 2233",
    verified: true,
    description: "High-volume kiln-fired bricks and site-ready block supplies for urban and township projects.",
  },
  "Bhopal Brick and Blocks": {
    location: "Bhopal, Madhya Pradesh",
    distanceKm: 14,
    phone: "+91 755 402 1108",
    verified: true,
    description: "Fly-ash and clay block manufacturer with fast dispatch in central MP zones.",
  },
  "Satpura Cement Depot": {
    location: "Jabalpur, Madhya Pradesh",
    distanceKm: 95,
    phone: "+91 761 298 4430",
    verified: true,
    description: "Bulk OPC/PPC cement dealer serving infra and residential contractors across MP.",
  },
  "Narmada Cement Traders": {
    location: "Narmadapuram, Madhya Pradesh",
    distanceKm: 68,
    phone: "+91 757 430 9821",
    verified: true,
    description: "Regional cement stockist with scheduled dispatch for multi-site projects.",
  },
  "Malwa Steel Hub": {
    location: "Indore-Pithampur, Madhya Pradesh",
    distanceKm: 42,
    phone: "+91 731 267 5514",
    verified: true,
    description: "TMT and structural steel supply specialist with high reliability for staged deliveries.",
  },
  "Bhopal Steel Syndicate": {
    location: "Bhopal, Madhya Pradesh",
    distanceKm: 17,
    phone: "+91 755 299 2084",
    verified: true,
    description: "Steel bars and fabrication materials distributor for contractors and builders.",
  },
  "Narmada Sand and Aggregates": {
    location: "Harda, Madhya Pradesh",
    distanceKm: 108,
    phone: "+91 7577 224 981",
    verified: false,
    description: "Sand and aggregate yard with mine-linked dispatch and bulk truck loading.",
  },
  "Rewa Aggregates and Stone": {
    location: "Rewa, Madhya Pradesh",
    distanceKm: 170,
    phone: "+91 7662 271 340",
    verified: false,
    description: "Stone aggregate supplier for highway, RCC, and commercial construction works.",
  },
  "Bhopal ReadyMix Concrete": {
    location: "Bhopal, Madhya Pradesh",
    distanceKm: 19,
    phone: "+91 755 491 1700",
    verified: true,
    description: "RMC batching and pump-ready concrete scheduling for real-time site demand.",
  },
  "Ujjain Blocks and Pavers": {
    location: "Ujjain, Madhya Pradesh",
    distanceKm: 82,
    phone: "+91 734 255 6612",
    verified: false,
    description: "Interlocking blocks and paver products for boundary, roads, and external works.",
  },
}

function normalizePriceRange(avgPrice: number): "budget" | "mid-range" | "premium" {
  if (avgPrice < 1000) return "budget"
  if (avgPrice < 20000) return "mid-range"
  return "premium"
}

function getMinOrderByCategory(categories: string[]) {
  if (categories.includes("Bricks") || categories.includes("Blocks")) return 5000
  if (categories.includes("Sand") || categories.includes("Aggregates")) return 20
  if (categories.includes("Steel")) return 2
  if (categories.includes("Cement")) return 50
  return 10
}

function getPriceRangeColor(range: Supplier["priceRange"]) {
  if (range === "budget") return "bg-green-100 text-green-800"
  if (range === "mid-range") return "bg-yellow-100 text-yellow-800"
  return "bg-slate-200 text-slate-800"
}

export default function SuppliersPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [actionMessage, setActionMessage] = useState("")
  const [favoriteSupplierIds, setFavoriteSupplierIds] = useState<string[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  useEffect(() => {
    let cancelled = false

    const loadSuppliersAndFavorites = async () => {
      try {
        const [productsResponse, favoritesResponse] = await Promise.all([
          fetch("/api/products?scope=all&limit=300", { credentials: "include", cache: "no-store" }),
          fetch("/api/buyer/suppliers/favorites", { credentials: "include", cache: "no-store" }),
        ])

        const [productsPayload, favoritesPayload] = await Promise.all([
          productsResponse.json() as Promise<{ products?: ApiProduct[]; error?: string }>,
          favoritesResponse.json() as Promise<{ supplierNames?: string[]; error?: string }>,
        ])

        if (!productsResponse.ok || !productsPayload.products) {
          throw new Error(productsPayload.error || "Could not load suppliers")
        }

        const grouped = new Map<string, ApiProduct[]>()
        for (const product of productsPayload.products.filter((item) => item.status === "active")) {
          const rows = grouped.get(product.sellerName) || []
          rows.push(product)
          grouped.set(product.sellerName, rows)
        }

        const nextSuppliers: Supplier[] = Array.from(grouped.entries()).map(([sellerName, products]) => {
          const categories = Array.from(new Set(products.map((item) => item.category)))
          const avgPrice = products.reduce((sum, item) => sum + item.price, 0) / Math.max(products.length, 1)
          const avgRating = products.reduce((sum, item) => sum + item.rating, 0) / Math.max(products.length, 1)
          const profile = mpSellerDirectory[sellerName]
          const topProducts = [...products]
            .sort((a, b) => b.stock - a.stock)
            .slice(0, 3)
            .map((item) => item.name)

          return {
            id: sellerName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            name: sellerName,
            category: categories,
            rating: Number(avgRating.toFixed(1)),
            reviews: 35 + products.length * 13,
            location: profile?.location || "Madhya Pradesh",
            distanceKm: profile?.distanceKm ?? 60,
            verified: profile?.verified ?? false,
            description:
              profile?.description || "Construction material supplier serving projects across Madhya Pradesh.",
            specialties: topProducts,
            contact: {
              phone: profile?.phone || "+91 70000 00000",
              email: `sales@${sellerName.toLowerCase().replace(/[^a-z0-9]+/g, "")}.in`,
            },
            priceRange: normalizePriceRange(avgPrice),
            deliveryTime: profile?.distanceKm && profile.distanceKm <= 25 ? "Same day / Next day" : "1-3 days",
            minOrder: getMinOrderByCategory(categories),
          }
        })

        nextSuppliers.sort((a, b) => b.rating - a.rating)

        if (!cancelled) {
          setSuppliers(nextSuppliers)
          if (favoritesResponse.ok && Array.isArray(favoritesPayload.supplierNames)) {
            setFavoriteSupplierIds(favoritesPayload.supplierNames)
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Could not load suppliers")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadSuppliersAndFavorites()

    return () => {
      cancelled = true
    }
  }, [])

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(suppliers.flatMap((supplier) => supplier.category))).sort()],
    [suppliers],
  )

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((supplier) => {
      const matchesSearch =
        supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.specialties.some((item) => item.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchesCategory = selectedCategory === "all" || supplier.category.includes(selectedCategory)
      return matchesSearch && matchesCategory
    })
  }, [suppliers, searchTerm, selectedCategory])

  const favoriteSuppliers = useMemo(
    () => filteredSuppliers.filter((supplier) => favoriteSupplierIds.includes(supplier.name)),
    [filteredSuppliers, favoriteSupplierIds],
  )

  const verifiedSuppliers = useMemo(
    () => filteredSuppliers.filter((supplier) => supplier.verified),
    [filteredSuppliers],
  )

  const toggleFavorite = (supplierName: string) => {
    const isFavorite = favoriteSupplierIds.includes(supplierName)
    const next = isFavorite
      ? favoriteSupplierIds.filter((item) => item !== supplierName)
      : [...favoriteSupplierIds, supplierName]
    setFavoriteSupplierIds(next)

    void fetch("/api/buyer/suppliers/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ supplierName, favorite: !isFavorite }),
    }).then(async (response) => {
      if (!response.ok) {
        setFavoriteSupplierIds((current) =>
          !isFavorite ? current.filter((item) => item !== supplierName) : [...current, supplierName],
        )
      } else {
        const payload = (await response.json()) as { supplierNames?: string[] }
        if (Array.isArray(payload.supplierNames)) {
          setFavoriteSupplierIds(payload.supplierNames)
        }
      }
    }).catch(() => {
      setFavoriteSupplierIds((current) =>
        !isFavorite ? current.filter((item) => item !== supplierName) : [...current, supplierName],
      )
    })
  }

  const handleViewProducts = (supplier: Supplier) => {
    const supplierQuery = encodeURIComponent(supplier.name)
    router.push(`/dashboard/buyer/products?supplier=${supplierQuery}`)
    setActionMessage(`Opening products for ${supplier.name}`)
  }

  const handleContactSupplier = (supplier: Supplier) => {
    const subject = encodeURIComponent(`Quote request from BricksBazar buyer`)
    const body = encodeURIComponent(
      `Hello ${supplier.name},\n\nPlease share your latest rates and availability for our MP project requirements.\n\nThanks.`,
    )
    window.location.href = `mailto:${supplier.contact.email}?subject=${subject}&body=${body}`
    setActionMessage(`Opening email composer for ${supplier.name}`)
  }

  const handleCallSupplier = (supplier: Supplier) => {
    const normalizedPhone = supplier.contact.phone.replace(/[^0-9+]/g, "")
    window.location.href = `tel:${normalizedPhone}`
    setActionMessage(`Starting call to ${supplier.name}`)
  }

  const SupplierCard = ({ supplier }: { supplier: Supplier }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex gap-4">
          <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">{supplier.name}</h3>
                  {supplier.verified ? <Verified className="h-4 w-4 text-blue-500" /> : null}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {supplier.location} | {supplier.distanceKm} km service radius
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleFavorite(supplier.name)}
                className={favoriteSupplierIds.includes(supplier.name) ? "text-red-500" : "text-muted-foreground"}
              >
                <Heart className={`h-4 w-4 ${favoriteSupplierIds.includes(supplier.name) ? "fill-current" : ""}`} />
              </Button>
            </div>

            <p className="text-sm text-muted-foreground mb-3">{supplier.description}</p>

            <div className="flex items-center gap-4 mb-3">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold">{supplier.rating}</span>
                <span className="text-sm text-muted-foreground">({supplier.reviews} reviews)</span>
              </div>
              <Badge className={getPriceRangeColor(supplier.priceRange)}>{supplier.priceRange}</Badge>
            </div>

            <div className="flex flex-wrap gap-1 mb-3">
              {supplier.specialties.map((specialty) => (
                <Badge key={specialty} variant="outline" className="text-xs">
                  {specialty}
                </Badge>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div>
                <span className="text-muted-foreground">Delivery: </span>
                <span className="font-medium">{supplier.deliveryTime}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Min Order: </span>
                <span className="font-medium">{supplier.minOrder.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button size="sm" onClick={() => handleViewProducts(supplier)}>
                <ShoppingCart className="h-4 w-4 mr-2" />
                View Products
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleContactSupplier(supplier)}>
                <MessageCircle className="h-4 w-4 mr-2" />
                Contact
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleCallSupplier(supplier)}>
                <Phone className="h-4 w-4 mr-2" />
                Call
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Suppliers Directory</h1>
          <p className="text-muted-foreground">Live suppliers based on current Madhya Pradesh catalog data</p>
        </div>
      </div>

      {actionMessage ? <p className="text-sm text-muted-foreground">{actionMessage}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search suppliers or materials..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
            >
              {category === "all" ? "All Categories" : category}
            </Button>
          ))}
        </div>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All Suppliers ({filteredSuppliers.length})</TabsTrigger>
          <TabsTrigger value="favorites">Favorites ({favoriteSuppliers.length})</TabsTrigger>
          <TabsTrigger value="verified">Verified ({verifiedSuppliers.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading supplier directory...
              </CardContent>
            </Card>
          ) : filteredSuppliers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No suppliers found</h3>
                <p className="text-muted-foreground text-center">
                  Try another keyword or publish products from seller dashboard.
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredSuppliers.map((supplier) => <SupplierCard key={supplier.id} supplier={supplier} />)
          )}
        </TabsContent>

        <TabsContent value="favorites" className="space-y-4">
          {favoriteSuppliers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Heart className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No favorite suppliers</h3>
                <p className="text-muted-foreground text-center">Mark preferred suppliers for quick shortlist access.</p>
              </CardContent>
            </Card>
          ) : (
            favoriteSuppliers.map((supplier) => <SupplierCard key={supplier.id} supplier={supplier} />)
          )}
        </TabsContent>

        <TabsContent value="verified" className="space-y-4">
          {verifiedSuppliers.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                No verified suppliers available for current filters.
              </CardContent>
            </Card>
          ) : (
            verifiedSuppliers.map((supplier) => <SupplierCard key={supplier.id} supplier={supplier} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
