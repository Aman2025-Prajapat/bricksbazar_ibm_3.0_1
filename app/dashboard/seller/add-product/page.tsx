"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Package, DollarSign } from "lucide-react"

export default function AddProductPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [productData, setProductData] = useState({
    name: "",
    category: "",
    price: "",
    unit: "per piece",
    stock: "",
    minStock: "",
    image: "/placeholder.svg",
    description: "",
    specifications: "",
  })

  const categories = ["Cement", "Bricks", "Blocks", "Steel", "Sand", "Aggregates", "Concrete", "Tiles", "Tools", "Hardware", "Other"]

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)

    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: productData.name,
          category: productData.category,
          price: Number.parseFloat(productData.price),
          unit: productData.unit,
          stock: Number.parseInt(productData.stock, 10),
          minStock: Number.parseInt(productData.minStock || "0", 10),
          image: productData.image || "/placeholder.svg",
        }),
      })

      const payload = (await response.json()) as { product?: { id: string }; error?: string }

      if (!response.ok || !payload.product) {
        throw new Error(payload.error || "Could not create product")
      }

      setSuccess("Product published successfully.")
      setTimeout(() => router.push("/dashboard/seller/products"), 800)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not create product")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add New Product</h1>
        <p className="text-muted-foreground">Publish a product to your live seller inventory</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Basic Information
              </CardTitle>
              <CardDescription>Core product details used in catalog and ordering.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name</Label>
                <Input
                  id="name"
                  required
                  placeholder="e.g., Premium Red Bricks"
                  value={productData.name}
                  onChange={(event) => setProductData((prev) => ({ ...prev, name: event.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={productData.category}
                  onValueChange={(value) => setProductData((prev) => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price per Unit</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="price"
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      className="pl-10"
                      value={productData.price}
                      onChange={(event) => setProductData((prev) => ({ ...prev, price: event.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Input
                    id="unit"
                    required
                    placeholder="e.g., per bag"
                    value={productData.unit}
                    onChange={(event) => setProductData((prev) => ({ ...prev, unit: event.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stock">Stock Quantity</Label>
                  <Input
                    id="stock"
                    type="number"
                    min="0"
                    required
                    value={productData.stock}
                    onChange={(event) => setProductData((prev) => ({ ...prev, stock: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minStock">Minimum Stock Alert</Label>
                  <Input
                    id="minStock"
                    type="number"
                    min="0"
                    value={productData.minStock}
                    onChange={(event) => setProductData((prev) => ({ ...prev, minStock: event.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Additional Details</CardTitle>
              <CardDescription>Optional details for richer listing context.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="image">Image URL</Label>
                <Input
                  id="image"
                  placeholder="/placeholder.svg"
                  value={productData.image}
                  onChange={(event) => setProductData((prev) => ({ ...prev, image: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  rows={4}
                  placeholder="Product description"
                  value={productData.description}
                  onChange={(event) => setProductData((prev) => ({ ...prev, description: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="specifications">Specifications</Label>
                <Textarea
                  id="specifications"
                  rows={4}
                  placeholder="Technical specs"
                  value={productData.specifications}
                  onChange={(event) => setProductData((prev) => ({ ...prev, specifications: event.target.value }))}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.push("/dashboard/seller/products")}>Cancel</Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Publishing...
              </>
            ) : (
              "Publish Product"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
