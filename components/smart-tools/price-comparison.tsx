"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from "lucide-react"

const priceData = [
  {
    product: "Premium Red Bricks",
    suppliers: [
      { name: "Local Brick Co.", price: 8.5, rating: 4.8, verified: true, distance: "2.3 km" },
      { name: "BuildMart", price: 9.2, rating: 4.6, verified: true, distance: "5.1 km" },
      { name: "QuickBuild Materials", price: 7.8, rating: 3.9, verified: false, distance: "8.7 km" },
      { name: "Premium Suppliers", price: 10.1, rating: 4.9, verified: true, distance: "12.4 km" },
    ],
  },
  {
    product: "OPC Cement 50kg",
    suppliers: [
      { name: "UltraCem", price: 420, rating: 4.7, verified: true, distance: "4.0 km" },
      { name: "BuildMart", price: 435, rating: 4.6, verified: true, distance: "5.1 km" },
      { name: "City Cement Hub", price: 410, rating: 4.2, verified: true, distance: "7.6 km" },
      { name: "QuickBuild Materials", price: 405, rating: 3.9, verified: false, distance: "8.7 km" },
    ],
  },
  {
    product: "River Sand",
    suppliers: [
      { name: "Local Sand Supplier", price: 1200, rating: 4.2, verified: false, distance: "10.0 km" },
      { name: "BuildMart", price: 1280, rating: 4.6, verified: true, distance: "5.1 km" },
      { name: "Prime Aggregates", price: 1185, rating: 4.5, verified: true, distance: "9.3 km" },
      { name: "Metro Materials", price: 1250, rating: 4.4, verified: true, distance: "6.4 km" },
    ],
  },
]

export default function PriceComparison() {
  const [selectedProduct, setSelectedProduct] = useState("Premium Red Bricks")
  const [quantity, setQuantity] = useState("1000")
  const [quoteMessage, setQuoteMessage] = useState("")

  const currentData = priceData.find((record) => record.product === selectedProduct)
  const suppliers = currentData?.suppliers || []
  const bestPrice = suppliers.length ? Math.min(...suppliers.map((supplier) => supplier.price)) : 0
  const avgPrice = suppliers.length ? suppliers.reduce((sum, supplier) => sum + supplier.price, 0) / suppliers.length : 0
  const parsedQuantity = Number.parseInt(quantity, 10) || 0

  const savings = useMemo(() => {
    if (parsedQuantity <= 0) return 0
    return Math.max(0, (avgPrice - bestPrice) * parsedQuantity)
  }, [avgPrice, bestPrice, parsedQuantity])

  const getDetailedQuotes = () => {
    if (parsedQuantity <= 0) {
      setQuoteMessage("Please enter a valid quantity to generate supplier quotes.")
      return
    }

    const quoteRows = suppliers.map((supplier) => {
      const baseTotal = supplier.price * parsedQuantity
      const freightPct = supplier.distance.startsWith("2") ? 0.02 : supplier.distance.startsWith("12") ? 0.06 : 0.04
      const freight = baseTotal * freightPct
      const discount = supplier.price === bestPrice ? baseTotal * 0.03 : 0
      const finalTotal = baseTotal + freight - discount

      return {
        supplier: supplier.name,
        unitPrice: supplier.price,
        quantity: parsedQuantity,
        baseTotal,
        freight,
        discount,
        finalTotal,
        distance: supplier.distance,
        rating: supplier.rating,
      }
    })

    const header = [
      "Supplier",
      "Unit Price",
      "Quantity",
      "Base Total",
      "Freight",
      "Discount",
      "Final Total",
      "Distance",
      "Rating",
    ]

    const csv = [
      header,
      ...quoteRows.map((row) => [
        row.supplier,
        row.unitPrice.toFixed(2),
        row.quantity,
        row.baseTotal.toFixed(2),
        row.freight.toFixed(2),
        row.discount.toFixed(2),
        row.finalTotal.toFixed(2),
        row.distance,
        row.rating.toFixed(1),
      ]),
    ]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `supplier-quotes-${selectedProduct.replace(/\s+/g, "-").toLowerCase()}.csv`
    link.click()
    URL.revokeObjectURL(url)

    try {
      const requestRecord = {
        id: `QREQ-${Date.now()}`,
        product: selectedProduct,
        quantity: parsedQuantity,
        suppliers: suppliers.map((supplier) => supplier.name),
        requestedAt: new Date().toISOString(),
      }
      const raw = window.localStorage.getItem("bb_quote_requests_v1")
      const history = raw ? (JSON.parse(raw) as Array<Record<string, unknown>>) : []
      window.localStorage.setItem("bb_quote_requests_v1", JSON.stringify([requestRecord, ...history]))
    } catch {
      // Ignore localStorage failures.
    }

    setQuoteMessage(`Detailed quotes generated from ${suppliers.length} suppliers.`)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Smart Price Comparison
        </CardTitle>
        <CardDescription>Compare prices across verified suppliers and find the best deals</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Product</label>
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priceData.map((record) => (
                  <SelectItem key={record.product} value={record.product}>
                    {record.product}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Quantity</label>
            <Input type="number" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="Enter quantity" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-green-600">
                <TrendingDown className="h-4 w-4" />
                <span className="text-sm font-medium">Best Price</span>
              </div>
              <p className="text-2xl font-bold">Rs. {bestPrice.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">per unit</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-blue-600">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm font-medium">Market Average</span>
              </div>
              <p className="text-2xl font-bold">Rs. {avgPrice.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">per unit</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-orange-600">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">Potential Savings</span>
              </div>
              <p className="text-2xl font-bold">Rs. {savings.toFixed(0)}</p>
              <p className="text-sm text-muted-foreground">total savings</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold">Supplier Comparison</h3>
          {suppliers.map((supplier) => (
            <div key={supplier.name} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <h4 className="font-medium">{supplier.name}</h4>
                  {supplier.verified ? (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Verified
                    </Badge>
                  ) : null}
                  {supplier.price === bestPrice ? <Badge variant="secondary">Best Price</Badge> : null}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">Rs. {supplier.price.toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">per unit</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground flex-wrap gap-2">
                <span>Rating: {supplier.rating}/5.0</span>
                <span>Distance: {supplier.distance}</span>
                <span>Total: Rs. {(supplier.price * parsedQuantity).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>

        <Button className="w-full" onClick={getDetailedQuotes}>
          Get Detailed Quotes from All Suppliers
        </Button>

        {quoteMessage ? <div className="rounded-md border p-3 text-sm text-muted-foreground">{quoteMessage}</div> : null}
      </CardContent>
    </Card>
  )
}
