"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Plus, Package, AlertTriangle, CheckCircle, TrendingUp, Loader2 } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

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
  status: "active" | "out_of_stock"
  rating: number
  image: string
  sellerName: string
}

export default function DistributorProductsPage() {
  const [products, setProducts] = useState<ApiProduct[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

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

    void loadProducts()

    return () => {
      cancelled = true
    }
  }, [])

  const categories = useMemo(() => ["all", ...new Set(products.map((product) => product.category))], [products])

  const getStockStatus = (product: ApiProduct) => {
    if (product.stock === 0 || product.status === "out_of_stock") return "out_of_stock"
    if (product.stock <= product.minStock) return "low_stock"
    return "in_stock"
  }

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sellerName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory
    const stockStatus = getStockStatus(product)
    const matchesStatus =
      selectedStatus === "all" ||
      (selectedStatus === "active" && stockStatus === "in_stock") ||
      (selectedStatus === "out_of_stock" && stockStatus === "out_of_stock") ||
      (selectedStatus === "low_stock" && stockStatus === "low_stock")

    return matchesSearch && matchesCategory && matchesStatus
  })

  const totalInventoryValue = products.reduce((sum, product) => sum + product.price * product.stock, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bulk Product Inventory</h1>
          <p className="text-muted-foreground">Manage distributor-grade products with higher minimum order limits</p>
        </div>
        <Link href="/dashboard/distributor/add-product">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Bulk Product
          </Button>
        </Link>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Products</p>
                <p className="text-2xl font-bold">{products.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{products.filter((product) => getStockStatus(product) === "in_stock").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Low Stock</p>
                <p className="text-2xl font-bold">{products.filter((product) => getStockStatus(product) === "low_stock").length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Inventory Value</p>
                <p className="text-2xl font-bold">Rs. {totalInventoryValue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-48">
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
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="low_stock">Low Stock</SelectItem>
            <SelectItem value="out_of_stock">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Distributor Catalog</CardTitle>
          <CardDescription>Showing {filteredProducts.length} of {products.length} products</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading products...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">No products found for current filters.</div>
          ) : (
            <div className="space-y-4">
              {filteredProducts.map((product) => {
                const stockStatus = getStockStatus(product)
                return (
                  <div key={product.id} className="flex items-center gap-4 p-4 border rounded-lg">
                    <Image
                      src={product.image || "/placeholder.svg"}
                      alt={product.name}
                      width={64}
                      height={64}
                      className="w-16 h-16 object-cover rounded"
                    />

                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{product.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">{product.category}</Badge>
                            <Badge variant={product.bulkOnly ? "default" : "secondary"}>{product.bulkOnly ? "Bulk Only" : "Mixed Orders"}</Badge>
                            <Badge
                              variant={
                                stockStatus === "out_of_stock"
                                  ? "destructive"
                                  : stockStatus === "low_stock"
                                    ? "secondary"
                                    : "default"
                              }
                            >
                              {stockStatus === "out_of_stock"
                                ? "Out of Stock"
                                : stockStatus === "low_stock"
                                  ? "Low Stock"
                                  : "In Stock"}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">Rs. {product.price.toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">{product.unit}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Stock</p>
                          <p className="font-medium">{product.stock.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Min Order</p>
                          <p className="font-medium">{product.minOrderQty.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Max Order</p>
                          <p className="font-medium">{product.maxOrderQty.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Rating</p>
                          <p className="font-medium">{product.rating.toFixed(1)} / 5</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Value</p>
                          <p className="font-medium">Rs. {(product.price * product.stock).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
