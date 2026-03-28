"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Search, ShoppingCart, Star } from "lucide-react"
import Link from "next/link"
import { addToCart } from "@/lib/cart-storage"
import { useSearchParams } from "next/navigation"

type ApiProduct = {
  id: string
  name: string
  category: string
  price: number
  unit: string
  stock: number
  minStock: number
  minOrderQty: number
  maxOrderQty: number
  bulkOnly: boolean
  operatorRole: "seller" | "distributor"
  status: "active" | "out_of_stock"
  rating: number
  image: string
  sellerId: string
  sellerName: string
  sellerVerified?: boolean
}

export default function BuyerProductsPage() {
  const searchParams = useSearchParams()
  const supplierPrefillDone = useRef(false)
  const [products, setProducts] = useState<ApiProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [cartMessage, setCartMessage] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const supplierFilter = searchParams.get("supplier")?.trim() || ""

  useEffect(() => {
    let cancelled = false

    const loadProducts = async () => {
      try {
        const response = await fetch("/api/products", { credentials: "include" })
        const payload = (await response.json()) as { products?: ApiProduct[]; error?: string }

        if (!response.ok || !payload.products) {
          throw new Error(payload.error || "Could not load products")
        }

        if (!cancelled) {
          setProducts(payload.products)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Could not load products")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadProducts()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!supplierFilter || supplierPrefillDone.current) return
    setSearchTerm(supplierFilter)
    setCartMessage(`Showing products for supplier: ${supplierFilter}`)
    supplierPrefillDone.current = true
  }, [supplierFilter])

  const categories = useMemo(() => ["all", ...new Set(products.map((product) => product.category))], [products])

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sellerName.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = selectedCategory === "all" || product.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [products, searchTerm, selectedCategory])

  const handleAddToCart = (product: ApiProduct) => {
    if (product.stock <= 0) return

    const minOrderQty = Math.max(1, product.minOrderQty || 1)

    addToCart({
      productId: product.id,
      name: product.name,
      category: product.category,
      price: product.price,
      unit: product.unit,
      supplier: product.sellerName,
      supplierId: product.sellerId,
      supplierVerified: product.sellerVerified === true,
      supplierRole: product.operatorRole,
      minOrderQty: minOrderQty,
      maxOrderQty: Math.max(minOrderQty, product.maxOrderQty || product.stock),
      bulkOnly: product.bulkOnly === true,
      image: product.image || "/placeholder.svg",
      inStock: product.stock > 0,
    }, minOrderQty)
    setCartMessage(
      `${product.name} added to cart${minOrderQty > 1 ? ` with minimum ${minOrderQty} quantity` : ""}.`,
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Browse Products</h1>
          <p className="text-muted-foreground">Explore Madhya Pradesh market-ready construction materials from verified suppliers</p>
        </div>
        <Link href="/dashboard/buyer/cart">
          <Button className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            Go to Cart
          </Button>
        </Link>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {cartMessage && <p className="text-sm text-green-600">{cartMessage}</p>}

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by product or supplier..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category === "all" ? "All Categories" : category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available Materials</CardTitle>
          <CardDescription>
            Showing {filteredProducts.length} of {products.length} products
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading products...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">No products found for current filters.</div>
          ) : (
            <div className="space-y-4">
              {filteredProducts.map((product) => (
                <div key={product.id} className="flex items-center gap-4 border rounded-lg p-4">
                  <Image
                    src={product.image || "/placeholder.svg"}
                    alt={product.name}
                    width={72}
                    height={72}
                    className="w-[72px] h-[72px] rounded object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold">{product.name}</h3>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-muted-foreground">{product.sellerName}</p>
                          {product.sellerVerified ? (
                            <Badge className="h-5 bg-emerald-100 px-2 text-[10px] font-semibold text-emerald-800 hover:bg-emerald-100">
                              Verified Seller
                            </Badge>
                          ) : null}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge variant="outline">{product.category}</Badge>
                          <Badge variant={product.bulkOnly ? "default" : "secondary"}>
                            {product.bulkOnly ? "Bulk Order" : "Retail + Bulk"}
                          </Badge>
                          <Badge variant={product.stock > 0 ? "default" : "destructive"}>
                            {product.stock > 0 ? "In Stock" : "Out of Stock"}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                            {product.rating.toFixed(1)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right space-y-2">
                        <p className="text-lg font-bold">Rs. {product.price.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">per {product.unit}</p>
                        <p className="text-xs text-muted-foreground">
                          Min: {Math.max(1, product.minOrderQty || 1)} | Max: {Math.max(1, product.maxOrderQty || product.stock)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Stock: {product.stock.toLocaleString()}</p>
                        <Button
                          size="sm"
                          onClick={() => handleAddToCart(product)}
                          disabled={product.stock <= 0}
                        >
                          Add to Cart
                        </Button>
                      </div>
                    </div>
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
