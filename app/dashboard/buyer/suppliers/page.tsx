"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Building2, Star, MapPin, Phone, Search, Heart, MessageCircle, ShoppingCart, Verified } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"

interface Supplier {
  id: string
  name: string
  category: string[]
  rating: number
  reviews: number
  location: string
  distance: number
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
  image: string
  isFavorite: boolean
}

export default function SuppliersPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [actionMessage, setActionMessage] = useState("")
  const [suppliers, setSuppliers] = useState<Supplier[]>([
    {
      id: "1",
      name: "Delhi Brick Works",
      category: ["Bricks", "Blocks"],
      rating: 4.8,
      reviews: 156,
      location: "Delhi, India",
      distance: 12,
      verified: true,
      description: "Premium quality bricks and blocks manufacturer with 25+ years experience",
      specialties: ["Red Bricks", "Fly Ash Bricks", "AAC Blocks"],
      contact: {
        phone: "+91 98765 43210",
        email: "info@delhibrickworks.com",
      },
      priceRange: "mid-range",
      deliveryTime: "2-3 days",
      minOrder: 1000,
      image: "/placeholder.svg?height=100&width=100",
      isFavorite: true,
    },
    {
      id: "2",
      name: "UltraTech Cement",
      category: ["Cement", "Concrete"],
      rating: 4.9,
      reviews: 324,
      location: "Mumbai, India",
      distance: 8,
      verified: true,
      description: "Leading cement manufacturer providing high-quality construction materials",
      specialties: ["Portland Cement", "Ready Mix Concrete", "White Cement"],
      contact: {
        phone: "+91 87654 32109",
        email: "sales@ultratech.com",
      },
      priceRange: "premium",
      deliveryTime: "1-2 days",
      minOrder: 50,
      image: "/placeholder.svg?height=100&width=100",
      isFavorite: false,
    },
    {
      id: "3",
      name: "Local Sand Supplier",
      category: ["Sand", "Aggregates"],
      rating: 4.2,
      reviews: 89,
      location: "Gurgaon, India",
      distance: 25,
      verified: false,
      description: "Quality sand and aggregates supplier for construction projects",
      specialties: ["River Sand", "M-Sand", "Stone Chips"],
      contact: {
        phone: "+91 76543 21098",
        email: "orders@localsand.com",
      },
      priceRange: "budget",
      deliveryTime: "3-5 days",
      minOrder: 100,
      image: "/placeholder.svg?height=100&width=100",
      isFavorite: true,
    },
    {
      id: "4",
      name: "Steel Works Ltd",
      category: ["Steel", "Metal"],
      rating: 4.6,
      reviews: 203,
      location: "Noida, India",
      distance: 18,
      verified: true,
      description: "Comprehensive steel and metal products for construction industry",
      specialties: ["TMT Bars", "Structural Steel", "Roofing Sheets"],
      contact: {
        phone: "+91 65432 10987",
        email: "info@steelworks.com",
      },
      priceRange: "mid-range",
      deliveryTime: "2-4 days",
      minOrder: 500,
      image: "/placeholder.svg?height=100&width=100",
      isFavorite: false,
    },
  ])

  const categories = ["all", "Bricks", "Cement", "Sand", "Steel", "Aggregates"]

  const toggleFavorite = (id: string) => {
    setSuppliers(
      suppliers.map((supplier) => (supplier.id === id ? { ...supplier, isFavorite: !supplier.isFavorite } : supplier)),
    )
  }

  const filteredSuppliers = suppliers.filter((supplier) => {
    const matchesSearch =
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.specialties.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCategory = selectedCategory === "all" || supplier.category.includes(selectedCategory)
    return matchesSearch && matchesCategory
  })

  const favoriteSuppliers = suppliers.filter((supplier) => supplier.isFavorite)

  const getPriceRangeColor = (range: Supplier["priceRange"]) => {
    switch (range) {
      case "budget":
        return "bg-green-100 text-green-800"
      case "mid-range":
        return "bg-yellow-100 text-yellow-800"
      case "premium":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const handleViewProducts = (supplier: Supplier) => {
    const supplierQuery = encodeURIComponent(supplier.name)
    router.push(`/dashboard/buyer/products?supplier=${supplierQuery}`)
    setActionMessage(`Opening products for ${supplier.name}.`)
  }

  const handleContactSupplier = (supplier: Supplier) => {
    const subject = encodeURIComponent(`Quote request from BricksBazar buyer`)
    const body = encodeURIComponent(`Hello ${supplier.name},\n\nI would like to request pricing and availability details.\n\nThanks.`)
    window.location.href = `mailto:${supplier.contact.email}?subject=${subject}&body=${body}`
    setActionMessage(`Opening email composer for ${supplier.name}.`)
  }

  const handleCallSupplier = (supplier: Supplier) => {
    const normalizedPhone = supplier.contact.phone.replace(/[^\d+]/g, "")
    window.location.href = `tel:${normalizedPhone}`
    setActionMessage(`Starting call to ${supplier.name}.`)
  }

  const SupplierCard = ({ supplier }: { supplier: Supplier }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex gap-4">
          <Image
            src={supplier.image || "/placeholder.svg"}
            alt={supplier.name}
            width={64}
            height={64}
            className="w-16 h-16 rounded-lg object-cover"
          />
          <div className="flex-1">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg">{supplier.name}</h3>
                  {supplier.verified && <Verified className="h-4 w-4 text-blue-500" />}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {supplier.location} • {supplier.distance}km away
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleFavorite(supplier.id)}
                className={supplier.isFavorite ? "text-red-500" : "text-muted-foreground"}
              >
                <Heart className={`h-4 w-4 ${supplier.isFavorite ? "fill-current" : ""}`} />
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
              {supplier.specialties.map((specialty, index) => (
                <Badge key={index} variant="outline" className="text-xs">
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
                <span className="font-medium">₹{supplier.minOrder.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex gap-2">
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
          <p className="text-muted-foreground">Find and connect with trusted construction material suppliers</p>
        </div>
      </div>

      {actionMessage ? <p className="text-sm text-muted-foreground">{actionMessage}</p> : null}

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search suppliers or materials..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
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

      {/* Suppliers Tabs */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All Suppliers ({filteredSuppliers.length})</TabsTrigger>
          <TabsTrigger value="favorites">Favorites ({favoriteSuppliers.length})</TabsTrigger>
          <TabsTrigger value="verified">Verified ({suppliers.filter((s) => s.verified).length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {filteredSuppliers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No suppliers found</h3>
                <p className="text-muted-foreground text-center">
                  Try adjusting your search criteria or browse all categories
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
                <p className="text-muted-foreground text-center">Add suppliers to your favorites for quick access</p>
              </CardContent>
            </Card>
          ) : (
            favoriteSuppliers.map((supplier) => <SupplierCard key={supplier.id} supplier={supplier} />)
          )}
        </TabsContent>

        <TabsContent value="verified" className="space-y-4">
          {suppliers
            .filter((s) => s.verified)
            .map((supplier) => (
              <SupplierCard key={supplier.id} supplier={supplier} />
            ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}
