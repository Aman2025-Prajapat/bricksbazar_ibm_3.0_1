import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/server/auth-user"
import { listDistributorLocations, listProductsPaginated } from "@/lib/server/market-store"
import { fairAlgorithm, type Supplier as FairSupplier } from "@/lib/fair-algorithm"
import { listSupplierRatingStats } from "@/lib/server/supplier-rating-store"
import { listUsers, listVerificationRequests } from "@/lib/server/user-store"

type SupplierRole = "seller" | "distributor"

type SupplierPayload = {
  id: string
  name: string
  role: SupplierRole
  verified: boolean
  location: string
  distanceKm: number
  rating: number
  reviews: number
  categories: string[]
  specialties: string[]
  description: string
  contact: {
    phone: string
    email: string
  }
  priceRange: "budget" | "mid-range" | "premium"
  minOrder: number
  deliveryTime: string
  fairScore: number
  badges: string[]
}

function stableDistance(seed: string) {
  let hash = 0
  for (let index = 0; index < seed.length; index++) {
    hash = (hash * 33 + seed.charCodeAt(index)) >>> 0
  }
  return 8 + (hash % 120)
}

function normalizePriceRange(avgPrice: number): "budget" | "mid-range" | "premium" {
  if (avgPrice <= 0 || avgPrice < 1000) return "budget"
  if (avgPrice < 20000) return "mid-range"
  return "premium"
}

function getMinOrderByCategories(categories: string[]) {
  if (categories.includes("Bricks") || categories.includes("Blocks")) return 5000
  if (categories.includes("Sand") || categories.includes("Aggregates")) return 20
  if (categories.includes("Steel")) return 2
  if (categories.includes("Cement")) return 50
  if (categories.includes("Distribution")) return 1
  return 10
}

function getDescription(role: SupplierRole, categories: string[], verified: boolean) {
  const base = role === "distributor" ? "Delivery and dispatch partner" : "Construction material supplier"
  const focus = categories.length > 0 ? ` focused on ${categories.slice(0, 3).join(", ")}` : ""
  const trust = verified ? " with verified operations" : " with pending trust score"
  return `${base}${focus}${trust}.`
}

function parsePage(raw: string | null, defaultValue: number) {
  const value = Number.parseInt(raw || `${defaultValue}`, 10)
  return Number.isFinite(value) ? Math.max(1, value) : defaultValue
}

function parseLimit(raw: string | null, defaultValue: number) {
  const value = Number.parseInt(raw || `${defaultValue}`, 10)
  if (!Number.isFinite(value)) return defaultValue
  return Math.min(100, Math.max(1, value))
}

export async function GET(request: Request) {
  const sessionUser = await getSessionUser()
  if (!sessionUser || sessionUser.role !== "buyer") {
    return NextResponse.json({ error: "Only buyers can view supplier recommendations" }, { status: 403 })
  }

  const url = new URL(request.url)
  const page = parsePage(url.searchParams.get("page"), 1)
  const limit = parseLimit(url.searchParams.get("limit"), 24)
  const roleFilter = (url.searchParams.get("role") || "all").trim().toLowerCase()
  const verifiedFilter = (url.searchParams.get("verified") || "all").trim().toLowerCase()
  const categoryFilter = (url.searchParams.get("category") || "all").trim()
  const q = (url.searchParams.get("q") || "").trim().toLowerCase()

  const [users, verificationRequests, products, distributorLocations, ratingStats] = await Promise.all([
    listUsers(),
    listVerificationRequests(),
    listProductsPaginated({ page: 1, limit: 2000 }).then((result) => result.items),
    listDistributorLocations(undefined, { activeOnly: true }),
    listSupplierRatingStats(),
  ])

  const verificationByUserId = new Map(verificationRequests.map((row) => [row.userId, row]))
  const ratingBySupplierId = new Map(ratingStats.map((row) => [row.supplierId, row]))

  const productsBySellerId = new Map<string, typeof products>()
  for (const product of products.filter((item) => item.status === "active")) {
    const rows = productsBySellerId.get(product.sellerId) || []
    rows.push(product)
    productsBySellerId.set(product.sellerId, rows)
  }

  const supplierRows: SupplierPayload[] = []
  const seenSupplierIds = new Set<string>()

  for (const user of users) {
    if ((user.role !== "seller" && user.role !== "distributor") || !user.verified) continue

    const role = user.role as SupplierRole
    const request = verificationByUserId.get(user.id)
    const sellerProducts = productsBySellerId.get(user.id) || []
    const location =
      request?.city && request.state ? `${request.city}, ${request.state}` : role === "distributor" ? "Madhya Pradesh Dispatch Zone" : "Madhya Pradesh"
    const distanceKm = stableDistance(`${user.id}-${location}`)
    const avgPrice =
      sellerProducts.length > 0 ? sellerProducts.reduce((sum, item) => sum + item.price, 0) / sellerProducts.length : 0
    const categories =
      role === "distributor"
        ? ["Distribution"]
        : Array.from(new Set(sellerProducts.map((item) => item.category))).filter(Boolean)
    const specialties =
      sellerProducts.length > 0
        ? [...sellerProducts].sort((a, b) => b.stock - a.stock).slice(0, 3).map((item) => item.name)
        : role === "distributor"
          ? distributorLocations.filter((loc) => loc.distributorId === user.id).slice(0, 2).map((loc) => loc.name)
          : ["General Supplies"]

    const productDerivedRating =
      sellerProducts.length > 0 ? sellerProducts.reduce((sum, item) => sum + item.rating, 0) / sellerProducts.length : 4
    const ratingStatsForSupplier = ratingBySupplierId.get(user.id)
    const rating = Number((ratingStatsForSupplier?.avgRating ?? productDerivedRating ?? 4).toFixed(1))
    const reviews = ratingStatsForSupplier?.reviewCount ?? Math.max(0, sellerProducts.length * 12)
    const deliveryTime =
      role === "distributor"
        ? distributorLocations.find((loc) => loc.distributorId === user.id)?.deliveryTime || "Same day / Next day"
        : distanceKm <= 30
          ? "Same day / Next day"
          : "1-3 days"

    supplierRows.push({
      id: user.id,
      name: user.name,
      role,
      verified: user.verified,
      location,
      distanceKm,
      rating,
      reviews,
      categories: categories.length > 0 ? categories : ["General"],
      specialties,
      description: getDescription(role, categories, user.verified),
      contact: {
        phone: request?.contactPhone || "",
        email: user.email,
      },
      priceRange: normalizePriceRange(avgPrice),
      minOrder: getMinOrderByCategories(categories),
      deliveryTime,
      fairScore: 0,
      badges: [],
    })
    seenSupplierIds.add(user.id)
  }

  // Keep legacy catalog suppliers visible so buyers can still compare all available suppliers.
  for (const [sellerId, sellerProducts] of productsBySellerId.entries()) {
    if (seenSupplierIds.has(sellerId)) continue
    const first = sellerProducts[0]
    const categories = Array.from(new Set(sellerProducts.map((item) => item.category))).filter(Boolean)
    const avgPrice = sellerProducts.reduce((sum, item) => sum + item.price, 0) / Math.max(1, sellerProducts.length)
    const rating = Number(
      (
        ratingBySupplierId.get(sellerId)?.avgRating ??
        sellerProducts.reduce((sum, item) => sum + item.rating, 0) / Math.max(1, sellerProducts.length)
      ).toFixed(1),
    )

    supplierRows.push({
      id: sellerId,
      name: first.sellerName,
      role: "seller",
      verified: false,
      location: "Madhya Pradesh",
      distanceKm: stableDistance(sellerId),
      rating,
      reviews: ratingBySupplierId.get(sellerId)?.reviewCount ?? sellerProducts.length * 8,
      categories: categories.length > 0 ? categories : ["General"],
      specialties: sellerProducts.slice(0, 3).map((item) => item.name),
      description: getDescription("seller", categories, false),
      contact: {
        phone: "",
        email: `sales@${first.sellerName.toLowerCase().replace(/[^a-z0-9]+/g, "")}.in`,
      },
      priceRange: normalizePriceRange(avgPrice),
      minOrder: getMinOrderByCategories(categories),
      deliveryTime: "1-3 days",
      fairScore: 0,
      badges: [],
    })
  }

  const availableCategories = Array.from(new Set(supplierRows.flatMap((supplier) => supplier.categories))).sort((a, b) =>
    a.localeCompare(b),
  )

  const filteredRows = supplierRows.filter((supplier) => {
    if (roleFilter === "seller" && supplier.role !== "seller") return false
    if (roleFilter === "distributor" && supplier.role !== "distributor") return false
    if (verifiedFilter === "verified" && !supplier.verified) return false
    if (verifiedFilter === "unverified" && supplier.verified) return false
    if (categoryFilter.toLowerCase() !== "all" && !supplier.categories.includes(categoryFilter)) return false
    if (!q) return true

    const haystack = [
      supplier.name,
      supplier.location,
      supplier.description,
      ...supplier.categories,
      ...supplier.specialties,
    ]
      .join(" ")
      .toLowerCase()
    return haystack.includes(q)
  })

  const comparablePrices = filteredRows
    .map((supplier) =>
      supplier.priceRange === "budget" ? 1 : supplier.priceRange === "mid-range" ? 0.65 : 0.35,
    )
    .filter((value) => Number.isFinite(value))
  const avgCompetitiveness =
    comparablePrices.length > 0
      ? comparablePrices.reduce((sum, value) => sum + value, 0) / comparablePrices.length
      : 0.65

  const rankedSuppliers = filteredRows
    .map((supplier) => {
      const competitiveness =
        supplier.priceRange === "budget" ? 1 : supplier.priceRange === "mid-range" ? 0.65 : 0.35
      const fairSupplier: FairSupplier = {
        id: supplier.id,
        name: supplier.name,
        type: supplier.role === "distributor" ? "distributor" : supplier.distanceKm <= 35 ? "local" : "premium",
        rating: supplier.rating,
        distance: supplier.distanceKm,
        verified: supplier.verified,
        localBadge: supplier.distanceKm <= 35,
        reviewCount: supplier.reviews,
        responseTime: supplier.role === "distributor" ? 2 : 4,
        deliveryReliability: supplier.verified ? 96 : 88,
        priceCompetitiveness: Math.max(0, Math.min(1, competitiveness / Math.max(avgCompetitiveness, 0.1))),
      }
      const fairScore = fairAlgorithm.calculateFairScore(fairSupplier, 150)
      const badges = fairAlgorithm.getTrustBadges(fairSupplier)
      return {
        ...supplier,
        fairScore: Number(fairScore.toFixed(4)),
        badges,
      }
    })
    .sort((a, b) => b.fairScore - a.fairScore || Number(b.verified) - Number(a.verified) || b.rating - a.rating)

  const total = rankedSuppliers.length
  const offset = (page - 1) * limit
  const suppliers = rankedSuppliers.slice(offset, offset + limit)
  const recommended = rankedSuppliers.slice(0, 5)

  return NextResponse.json({
    suppliers,
    recommended,
    pagination: {
      page,
      limit,
      total,
      hasNextPage: offset + limit < total,
    },
    filters: {
      q,
      role: roleFilter,
      verified: verifiedFilter,
      category: categoryFilter,
      availableCategories,
    },
    algorithm: {
      localBoost: 0.3,
      verificationWeight: 0.2,
      ratingWeight: 0.25,
      proximityWeight: 0.15,
      priceWeight: 0.1,
    },
  })
}
