import { prisma } from "@/lib/server/prisma"

export type ProductStatus = "active" | "out_of_stock"
export type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled"
export type PaymentStatus = "pending" | "paid" | "failed"
export type PaymentProvider = "razorpay" | "phonepe" | "manual"
export type DeliveryStatus = "pickup_ready" | "in_transit" | "nearby" | "delivered" | "cancelled"

export type Product = {
  id: string
  name: string
  category: string
  price: number
  unit: string
  stock: number
  minStock: number
  status: ProductStatus
  rating: number
  image: string
  sellerId: string
  sellerName: string
  createdAt: string
  updatedAt: string
}

export type OrderItem = {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  lineTotal: number
  sellerId: string
  sellerName: string
}

export type Order = {
  id: string
  orderNumber: string
  buyerId: string
  buyerName: string
  sellerId: string
  sellerName: string
  date: string
  status: OrderStatus
  total: number
  items: OrderItem[]
  estimatedDelivery: string
  trackingNumber?: string
}

export type OrderShipmentStatus = "pending" | "confirmed" | "in_transit" | "delivered" | "cancelled"

export type OrderShipment = {
  id: string
  orderId: string
  sellerId: string
  sellerName: string
  amount: number
  status: OrderShipmentStatus
  trackingNumber?: string
  estimatedDelivery: string
  createdAt: string
  updatedAt: string
}

export type Payment = {
  id: string
  orderId: string
  userId: string
  amount: number
  method: string
  status: PaymentStatus
  provider?: PaymentProvider
  paymentIntentId?: string
  gatewayOrderId?: string
  gatewayTransactionId?: string
  gatewaySignature?: string
  gatewayPayload?: string
  verifiedAt?: string
  createdAt: string
}

export type PaymentIntentStatus = "pending" | "verified" | "failed" | "used"

export type PaymentIntent = {
  id: string
  buyerId: string
  provider: PaymentProvider
  amount: number
  currency: string
  status: PaymentIntentStatus
  gatewayOrderId?: string
  gatewayTransactionId?: string
  gatewaySignature?: string
  gatewayPayload?: string
  verifiedAt?: string
  consumedAt?: string
  createdAt: string
  updatedAt: string
}

export type DistributorLocationStatus = "active" | "maintenance" | "inactive"

export type DistributorLocation = {
  id: string
  distributorId: string
  name: string
  address: string
  radiusKm: number
  status: DistributorLocationStatus
  deliveryTime: string
  createdAt: string
  updatedAt: string
}

export type SupplierFavorite = {
  userId: string
  supplierName: string
  createdAt: string
}

export type PaginatedResult<T> = {
  items: T[]
  total: number
  page: number
  limit: number
  hasNextPage: boolean
}

export type Delivery = {
  id: string
  orderId: string
  buyerId: string
  buyerName: string
  sellerId: string
  sellerName: string
  distributorId: string
  distributorName: string
  pickupAddress: string
  deliveryAddress: string
  vehicleNumber: string
  vehicleType: string
  driverName: string
  driverPhone: string
  status: DeliveryStatus
  etaMinutes: number
  currentLat?: number
  currentLng?: number
  currentAddress?: string
  lastLocationAt?: string
  createdAt: string
  updatedAt: string
}

export type DeliveryLocation = {
  id: string
  deliveryId: string
  orderId: string
  lat: number
  lng: number
  address: string
  speedKph: number
  heading: number
  status: DeliveryStatus
  createdAt: string
}

export type DeliveryOtp = {
  deliveryId: string
  otpCode: string
  isVerified: boolean
  expiresAt: string
  createdAt: string
  updatedAt: string
}

export type DeliveryProof = {
  id: string
  deliveryId: string
  otpVerified: boolean
  podImageUrl?: string
  podNote?: string
  receivedBy?: string
  deliveredAt: string
  createdAt: string
}

export type DeliveryAlertSeverity = "info" | "warning" | "critical"

export type DeliveryAlert = {
  code: "assignment_missing" | "delay_risk" | "stale_location" | "route_deviation"
  severity: DeliveryAlertSeverity
  title: string
  message: string
}

export type MarketRates = {
  brickPerPiece: number
  cementPerBag: number
  sandPerTon: number
  steelPerTon: number
  sourceCount: {
    bricks: number
    cement: number
    sand: number
    steel: number
  }
}

type ProductRow = {
  id: string
  name: string
  category: string
  price: number
  unit: string
  stock: number
  min_stock: number
  status: ProductStatus
  rating: number
  image: string
  seller_id: string
  seller_name: string
  created_at: string
  updated_at: string
}

type OrderRow = {
  id: string
  order_number: string
  buyer_id: string
  buyer_name: string
  seller_id: string
  seller_name: string
  date: string
  status: OrderStatus
  total: number
  items_json: string
  estimated_delivery: string
  tracking_number: string | null
}

type OrderShipmentRow = {
  id: string
  order_id: string
  seller_id: string
  seller_name: string
  amount: number
  status: OrderShipmentStatus
  tracking_number: string | null
  estimated_delivery: string
  created_at: string
  updated_at: string
}

type PaymentRow = {
  id: string
  order_id: string
  user_id: string
  amount: number
  method: string
  status: PaymentStatus
  provider: PaymentProvider | null
  payment_intent_id: string | null
  gateway_order_id: string | null
  gateway_transaction_id: string | null
  gateway_signature: string | null
  gateway_payload: string | null
  verified_at: string | null
  created_at: string
}

type PaymentIntentRow = {
  id: string
  buyer_id: string
  provider: PaymentProvider
  amount: number
  currency: string
  status: PaymentIntentStatus
  gateway_order_id: string | null
  gateway_transaction_id: string | null
  gateway_signature: string | null
  gateway_payload: string | null
  verified_at: string | null
  consumed_at: string | null
  created_at: string
  updated_at: string
}

type DistributorLocationRow = {
  id: string
  distributor_id: string
  name: string
  address: string
  radius_km: number
  status: DistributorLocationStatus
  delivery_time: string
  created_at: string
  updated_at: string
}

type SupplierFavoriteRow = {
  user_id: string
  supplier_name: string
  created_at: string
}

type DeliveryRow = {
  id: string
  order_id: string
  buyer_id: string
  buyer_name: string
  seller_id: string
  seller_name: string
  distributor_id: string
  distributor_name: string
  pickup_address: string
  delivery_address: string
  vehicle_number: string
  vehicle_type: string
  driver_name: string
  driver_phone: string
  status: DeliveryStatus
  eta_minutes: number
  current_lat: number | null
  current_lng: number | null
  current_address: string | null
  last_location_at: string | null
  created_at: string
  updated_at: string
}

type DeliveryLocationRow = {
  id: string
  delivery_id: string
  order_id: string
  lat: number
  lng: number
  address: string
  speed_kph: number
  heading: number
  status: DeliveryStatus
  created_at: string
}

type DeliveryOtpRow = {
  delivery_id: string
  otp_code: string
  is_verified: number
  expires_at: string
  created_at: string
  updated_at: string
}

type DeliveryProofRow = {
  id: string
  delivery_id: string
  otp_verified: number
  pod_image_url: string | null
  pod_note: string | null
  received_by: string | null
  delivered_at: string
  created_at: string
}

let marketTablesReady = false

function isPostgresRuntime() {
  const url = process.env.DATABASE_URL ?? ""
  return /^(postgres|postgresql|prisma\+postgres):\/\//i.test(url.trim())
}

async function safeAddColumn(table: string, definition: string) {
  const columnName = definition.trim().split(/\s+/)[0]
  if (isPostgresRuntime()) {
    const columns = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = ?
         AND column_name = ?`,
      table,
      columnName,
    )
    if (columns.length > 0) {
      return
    }
  } else {
    const columns = await prisma.$queryRawUnsafe<Array<{ name: string }>>(`PRAGMA table_info(${table})`)
    if (columns.some((column) => column.name === columnName)) {
      return
    }
  }

  await prisma.$executeRawUnsafe(`ALTER TABLE ${table} ADD COLUMN ${definition}`)
}

function normalizePagination(input?: { page?: number; limit?: number }) {
  const page = Math.max(1, Math.floor(input?.page ?? 1))
  const limit = Math.min(100, Math.max(1, Math.floor(input?.limit ?? 50)))
  const offset = (page - 1) * limit
  return { page, limit, offset }
}

function escapeLikeQuery(value: string) {
  return value.replace(/[%_]/g, "\\$&")
}

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: Number(row.price),
    unit: row.unit,
    stock: Number(row.stock),
    minStock: Number(row.min_stock),
    status: row.status,
    rating: Number(row.rating),
    image: row.image,
    sellerId: row.seller_id,
    sellerName: row.seller_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapOrder(row: OrderRow): Order {
  return {
    id: row.id,
    orderNumber: row.order_number,
    buyerId: row.buyer_id,
    buyerName: row.buyer_name,
    sellerId: row.seller_id,
    sellerName: row.seller_name,
    date: row.date,
    status: row.status,
    total: Number(row.total),
    items: JSON.parse(row.items_json) as OrderItem[],
    estimatedDelivery: row.estimated_delivery,
    trackingNumber: row.tracking_number ?? undefined,
  }
}

function mapOrderShipment(row: OrderShipmentRow): OrderShipment {
  return {
    id: row.id,
    orderId: row.order_id,
    sellerId: row.seller_id,
    sellerName: row.seller_name,
    amount: Number(row.amount),
    status: row.status,
    trackingNumber: row.tracking_number ?? undefined,
    estimatedDelivery: row.estimated_delivery,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    orderId: row.order_id,
    userId: row.user_id,
    amount: Number(row.amount),
    method: row.method,
    status: row.status,
    provider: row.provider ?? undefined,
    paymentIntentId: row.payment_intent_id ?? undefined,
    gatewayOrderId: row.gateway_order_id ?? undefined,
    gatewayTransactionId: row.gateway_transaction_id ?? undefined,
    gatewaySignature: row.gateway_signature ?? undefined,
    gatewayPayload: row.gateway_payload ?? undefined,
    verifiedAt: row.verified_at ?? undefined,
    createdAt: row.created_at,
  }
}

function mapPaymentIntent(row: PaymentIntentRow): PaymentIntent {
  return {
    id: row.id,
    buyerId: row.buyer_id,
    provider: row.provider,
    amount: Number(row.amount),
    currency: row.currency,
    status: row.status,
    gatewayOrderId: row.gateway_order_id ?? undefined,
    gatewayTransactionId: row.gateway_transaction_id ?? undefined,
    gatewaySignature: row.gateway_signature ?? undefined,
    gatewayPayload: row.gateway_payload ?? undefined,
    verifiedAt: row.verified_at ?? undefined,
    consumedAt: row.consumed_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapDistributorLocation(row: DistributorLocationRow): DistributorLocation {
  return {
    id: row.id,
    distributorId: row.distributor_id,
    name: row.name,
    address: row.address,
    radiusKm: Number(row.radius_km),
    status: row.status,
    deliveryTime: row.delivery_time,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapSupplierFavorite(row: SupplierFavoriteRow): SupplierFavorite {
  return {
    userId: row.user_id,
    supplierName: row.supplier_name,
    createdAt: row.created_at,
  }
}

function mapDelivery(row: DeliveryRow): Delivery {
  return {
    id: row.id,
    orderId: row.order_id,
    buyerId: row.buyer_id,
    buyerName: row.buyer_name,
    sellerId: row.seller_id,
    sellerName: row.seller_name,
    distributorId: row.distributor_id,
    distributorName: row.distributor_name,
    pickupAddress: row.pickup_address,
    deliveryAddress: row.delivery_address,
    vehicleNumber: row.vehicle_number,
    vehicleType: row.vehicle_type,
    driverName: row.driver_name,
    driverPhone: row.driver_phone,
    status: row.status,
    etaMinutes: Number(row.eta_minutes),
    currentLat: row.current_lat === null ? undefined : Number(row.current_lat),
    currentLng: row.current_lng === null ? undefined : Number(row.current_lng),
    currentAddress: row.current_address ?? undefined,
    lastLocationAt: row.last_location_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapDeliveryLocation(row: DeliveryLocationRow): DeliveryLocation {
  return {
    id: row.id,
    deliveryId: row.delivery_id,
    orderId: row.order_id,
    lat: Number(row.lat),
    lng: Number(row.lng),
    address: row.address,
    speedKph: Number(row.speed_kph),
    heading: Number(row.heading),
    status: row.status,
    createdAt: row.created_at,
  }
}

function mapDeliveryOtp(row: DeliveryOtpRow): DeliveryOtp {
  return {
    deliveryId: row.delivery_id,
    otpCode: row.otp_code,
    isVerified: row.is_verified === 1,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapDeliveryProof(row: DeliveryProofRow): DeliveryProof {
  return {
    id: row.id,
    deliveryId: row.delivery_id,
    otpVerified: row.otp_verified === 1,
    podImageUrl: row.pod_image_url ?? undefined,
    podNote: row.pod_note ?? undefined,
    receivedBy: row.received_by ?? undefined,
    deliveredAt: row.delivered_at,
    createdAt: row.created_at,
  }
}

function headingDiff(a: number, b: number) {
  const diff = Math.abs(a - b) % 360
  return diff > 180 ? 360 - diff : diff
}

function toDeliveryStatus(orderStatus: OrderStatus): DeliveryStatus {
  if (orderStatus === "shipped") return "in_transit"
  if (orderStatus === "delivered") return "delivered"
  if (orderStatus === "cancelled") return "cancelled"
  return "pickup_ready"
}

function toOrderStatus(deliveryStatus: DeliveryStatus): OrderStatus {
  if (deliveryStatus === "delivered") return "delivered"
  if (deliveryStatus === "cancelled") return "cancelled"
  if (deliveryStatus === "in_transit" || deliveryStatus === "nearby") return "shipped"
  return "confirmed"
}

function toShipmentStatus(orderStatus: OrderStatus): OrderShipmentStatus {
  if (orderStatus === "pending") return "pending"
  if (orderStatus === "confirmed") return "confirmed"
  if (orderStatus === "shipped") return "in_transit"
  if (orderStatus === "delivered") return "delivered"
  return "cancelled"
}

const mpSellerPickupAddressByName: Record<string, string> = {
  "Indore Brick Udyog": "Sanwer Road Industrial Area, Indore, Madhya Pradesh",
  "Bhopal Brick and Blocks": "Govindpura Industrial Area, Bhopal, Madhya Pradesh",
  "Satpura Cement Depot": "Khamaria Industrial Belt, Jabalpur, Madhya Pradesh",
  "Narmada Cement Traders": "Sethani Ghat Road, Narmadapuram, Madhya Pradesh",
  "Malwa Steel Hub": "Pithampur Logistics Zone, Dhar, Madhya Pradesh",
  "Bhopal Steel Syndicate": "Mandideep Industrial Area, Raisen, Madhya Pradesh",
  "Narmada Sand and Aggregates": "Handia Yard, Harda, Madhya Pradesh",
  "Rewa Aggregates and Stone": "Industrial Area, Rewa, Madhya Pradesh",
  "Bhopal ReadyMix Concrete": "Bypass Concrete Hub, Bhopal, Madhya Pradesh",
  "Ujjain Blocks and Pavers": "Dewas Road Industrial Cluster, Ujjain, Madhya Pradesh",
}

const mpBuyerDeliveryZones = [
  "Vijay Nagar, Indore, Madhya Pradesh",
  "Arera Colony, Bhopal, Madhya Pradesh",
  "Napier Town, Jabalpur, Madhya Pradesh",
  "Civil Lines, Gwalior, Madhya Pradesh",
  "Shakti Nagar, Rewa, Madhya Pradesh",
  "Shivpuri Link Road, Ujjain, Madhya Pradesh",
]

function stableIndex(seed: string, size: number) {
  if (size <= 0) return 0
  let hash = 0
  for (let index = 0; index < seed.length; index++) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0
  }
  return hash % size
}

function buildDefaultDeliveryFromOrder(
  order: Order,
  nowIso: string,
  options?: {
    deliveryAddress?: string
    distributorId?: string
    distributorName?: string
    vehicleType?: string
  },
): Delivery {
  const pickupAddress =
    mpSellerPickupAddressByName[order.sellerName] || `${order.sellerName}, Industrial Hub, Madhya Pradesh`
  const deliveryZone = mpBuyerDeliveryZones[stableIndex(`${order.id}-${order.buyerName}`, mpBuyerDeliveryZones.length)]
  const finalDeliveryAddress = options?.deliveryAddress?.trim() || `${order.buyerName}, ${deliveryZone}`
  const finalDistributorId = options?.distributorId?.trim() || "mp-distributor-ops"
  const finalDistributorName = options?.distributorName?.trim() || "MP Logistics Dispatch"
  const finalVehicleType = options?.vehicleType?.trim() || "Truck"

  return {
    id: crypto.randomUUID(),
    orderId: order.id,
    buyerId: order.buyerId,
    buyerName: order.buyerName,
    sellerId: order.sellerId,
    sellerName: order.sellerName,
    distributorId: finalDistributorId,
    distributorName: finalDistributorName,
    pickupAddress,
    deliveryAddress: finalDeliveryAddress,
    vehicleNumber: "Not Assigned",
    vehicleType: finalVehicleType,
    driverName: "Not Assigned",
    driverPhone: "",
    status: toDeliveryStatus(order.status),
    etaMinutes: 180,
    currentLat: undefined,
    currentLng: undefined,
    currentAddress: undefined,
    lastLocationAt: undefined,
    createdAt: nowIso,
    updatedAt: nowIso,
  }
}

function getSeedProducts(now: string) {
  return [
    {
      id: "mp-prod-001",
      name: "Fly Ash Bricks 9x4x3",
      category: "Bricks",
      price: 6.8,
      unit: "per piece",
      stock: 45000,
      minStock: 7000,
      status: "active" as const,
      rating: 4.8,
      image: "/placeholder.svg?key=mp-brick-1",
      sellerId: "seed-mp-seller-1",
      sellerName: "Bhopal Brick and Blocks",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "mp-prod-002",
      name: "Clay Red Bricks Grade A",
      category: "Bricks",
      price: 7.9,
      unit: "per piece",
      stock: 36000,
      minStock: 6000,
      status: "active" as const,
      rating: 4.7,
      image: "/placeholder.svg?key=mp-brick-2",
      sellerId: "seed-mp-seller-2",
      sellerName: "Indore Brick Udyog",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "mp-prod-003",
      name: "OPC Cement 53 Grade (50kg)",
      category: "Cement",
      price: 395,
      unit: "per bag",
      stock: 980,
      minStock: 120,
      status: "active" as const,
      rating: 4.9,
      image: "/placeholder.svg?key=mp-cement-1",
      sellerId: "seed-mp-seller-3",
      sellerName: "Satpura Cement Depot",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "mp-prod-004",
      name: "PPC Cement (50kg)",
      category: "Cement",
      price: 365,
      unit: "per bag",
      stock: 760,
      minStock: 100,
      status: "active" as const,
      rating: 4.6,
      image: "/placeholder.svg?key=mp-cement-2",
      sellerId: "seed-mp-seller-4",
      sellerName: "Narmada Cement Traders",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "mp-prod-005",
      name: "TMT Steel Fe500D 12mm",
      category: "Steel",
      price: 59800,
      unit: "per ton",
      stock: 110,
      minStock: 18,
      status: "active" as const,
      rating: 4.8,
      image: "/placeholder.svg?key=mp-steel-1",
      sellerId: "seed-mp-seller-5",
      sellerName: "Malwa Steel Hub",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "mp-prod-006",
      name: "TMT Steel Fe550 16mm",
      category: "Steel",
      price: 62400,
      unit: "per ton",
      stock: 95,
      minStock: 15,
      status: "active" as const,
      rating: 4.7,
      image: "/placeholder.svg?key=mp-steel-2",
      sellerId: "seed-mp-seller-6",
      sellerName: "Bhopal Steel Syndicate",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "mp-prod-007",
      name: "Narmada River Sand",
      category: "Sand",
      price: 1380,
      unit: "per ton",
      stock: 420,
      minStock: 60,
      status: "active" as const,
      rating: 4.5,
      image: "/placeholder.svg?key=mp-sand-1",
      sellerId: "seed-mp-seller-7",
      sellerName: "Narmada Sand and Aggregates",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "mp-prod-008",
      name: "20mm Stone Aggregate",
      category: "Aggregates",
      price: 980,
      unit: "per ton",
      stock: 500,
      minStock: 80,
      status: "active" as const,
      rating: 4.4,
      image: "/placeholder.svg?key=mp-aggregate-1",
      sellerId: "seed-mp-seller-8",
      sellerName: "Rewa Aggregates and Stone",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "mp-prod-009",
      name: "Ready Mix Concrete M20",
      category: "Concrete",
      price: 5400,
      unit: "per cubic meter",
      stock: 220,
      minStock: 30,
      status: "active" as const,
      rating: 4.6,
      image: "/placeholder.svg?key=mp-rmc-1",
      sellerId: "seed-mp-seller-9",
      sellerName: "Bhopal ReadyMix Concrete",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "mp-prod-010",
      name: "Interlocking Paver Blocks 60mm",
      category: "Blocks",
      price: 42,
      unit: "per piece",
      stock: 18000,
      minStock: 2500,
      status: "active" as const,
      rating: 4.5,
      image: "/placeholder.svg?key=mp-paver-1",
      sellerId: "seed-mp-seller-10",
      sellerName: "Ujjain Blocks and Pavers",
      createdAt: now,
      updatedAt: now,
    },
  ]
}

async function ensureMarketTables() {
  if (marketTablesReady) return

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS market_products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      unit TEXT NOT NULL,
      stock INTEGER NOT NULL,
      min_stock INTEGER NOT NULL,
      status TEXT NOT NULL,
      rating REAL NOT NULL,
      image TEXT NOT NULL,
      seller_id TEXT NOT NULL,
      seller_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS market_orders (
      id TEXT PRIMARY KEY,
      order_number TEXT NOT NULL,
      buyer_id TEXT NOT NULL,
      buyer_name TEXT NOT NULL,
      seller_id TEXT NOT NULL,
      seller_name TEXT NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL,
      total REAL NOT NULL,
      items_json TEXT NOT NULL,
      estimated_delivery TEXT NOT NULL,
      tracking_number TEXT
    )
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS market_order_shipments (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      seller_id TEXT NOT NULL,
      seller_name TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL,
      tracking_number TEXT,
      estimated_delivery TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS market_payments (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      amount REAL NOT NULL,
      method TEXT NOT NULL,
      status TEXT NOT NULL,
      provider TEXT,
      payment_intent_id TEXT,
      gateway_order_id TEXT,
      gateway_transaction_id TEXT,
      gateway_signature TEXT,
      gateway_payload TEXT,
      verified_at TEXT,
      created_at TEXT NOT NULL
    )
  `)

  await safeAddColumn("market_payments", "provider TEXT")
  await safeAddColumn("market_payments", "payment_intent_id TEXT")
  await safeAddColumn("market_payments", "gateway_order_id TEXT")
  await safeAddColumn("market_payments", "gateway_transaction_id TEXT")
  await safeAddColumn("market_payments", "gateway_signature TEXT")
  await safeAddColumn("market_payments", "gateway_payload TEXT")
  await safeAddColumn("market_payments", "verified_at TEXT")

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS market_payment_intents (
      id TEXT PRIMARY KEY,
      buyer_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL,
      status TEXT NOT NULL,
      gateway_order_id TEXT,
      gateway_transaction_id TEXT,
      gateway_signature TEXT,
      gateway_payload TEXT,
      verified_at TEXT,
      consumed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS market_deliveries (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL UNIQUE,
      buyer_id TEXT NOT NULL,
      buyer_name TEXT NOT NULL,
      seller_id TEXT NOT NULL,
      seller_name TEXT NOT NULL,
      distributor_id TEXT NOT NULL,
      distributor_name TEXT NOT NULL,
      pickup_address TEXT NOT NULL,
      delivery_address TEXT NOT NULL,
      vehicle_number TEXT NOT NULL,
      vehicle_type TEXT NOT NULL,
      driver_name TEXT NOT NULL,
      driver_phone TEXT NOT NULL,
      status TEXT NOT NULL,
      eta_minutes INTEGER NOT NULL,
      current_lat REAL,
      current_lng REAL,
      current_address TEXT,
      last_location_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS market_delivery_locations (
      id TEXT PRIMARY KEY,
      delivery_id TEXT NOT NULL,
      order_id TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      address TEXT NOT NULL,
      speed_kph REAL NOT NULL,
      heading REAL NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS market_delivery_otps (
      delivery_id TEXT PRIMARY KEY,
      otp_code TEXT NOT NULL,
      is_verified INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS market_delivery_proofs (
      id TEXT PRIMARY KEY,
      delivery_id TEXT NOT NULL UNIQUE,
      otp_verified INTEGER NOT NULL,
      pod_image_url TEXT,
      pod_note TEXT,
      received_by TEXT,
      delivered_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS market_distributor_locations (
      id TEXT PRIMARY KEY,
      distributor_id TEXT NOT NULL,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      radius_km REAL NOT NULL,
      status TEXT NOT NULL,
      delivery_time TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS market_supplier_favorites (
      user_id TEXT NOT NULL,
      supplier_name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, supplier_name)
    )
  `)

  await prisma.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS market_products_category_idx ON market_products(category)")
  await prisma.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS market_products_seller_idx ON market_products(seller_id)")
  await prisma.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS market_products_status_idx ON market_products(status)")

  await prisma.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS market_orders_status_date_idx ON market_orders(status, date)")
  await prisma.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS market_orders_buyer_date_idx ON market_orders(buyer_id, date)")
  await prisma.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS market_orders_seller_date_idx ON market_orders(seller_id, date)")
  await prisma.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS market_orders_tracking_idx ON market_orders(tracking_number)")

  await prisma.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS market_order_shipments_order_idx ON market_order_shipments(order_id)")
  await prisma.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS market_order_shipments_seller_idx ON market_order_shipments(seller_id)")
  await prisma.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS market_order_shipments_status_idx ON market_order_shipments(status)")

  await prisma.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS market_payments_order_idx ON market_payments(order_id)")
  await prisma.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS market_payments_user_idx ON market_payments(user_id)")
  await prisma.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS market_payments_status_idx ON market_payments(status)")
  await prisma.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS market_payments_created_idx ON market_payments(created_at)")
  await prisma.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS market_payments_intent_idx ON market_payments(payment_intent_id)")

  await prisma.$executeRawUnsafe(
    "CREATE UNIQUE INDEX IF NOT EXISTS market_payment_intents_gateway_order_uidx ON market_payment_intents(gateway_order_id)",
  )
  await prisma.$executeRawUnsafe(
    "CREATE UNIQUE INDEX IF NOT EXISTS market_payment_intents_gateway_txn_uidx ON market_payment_intents(gateway_transaction_id)",
  )
  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS market_payment_intents_buyer_status_idx ON market_payment_intents(buyer_id, status)",
  )
  await prisma.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS market_payment_intents_provider_idx ON market_payment_intents(provider)")
  await prisma.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS market_payment_intents_created_idx ON market_payment_intents(created_at)")

  await prisma.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS market_deliveries_status_idx ON market_deliveries(status)")
  await prisma.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS market_deliveries_buyer_idx ON market_deliveries(buyer_id)")
  await prisma.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS market_deliveries_seller_idx ON market_deliveries(seller_id)")
  await prisma.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS market_deliveries_distributor_idx ON market_deliveries(distributor_id)")
  await prisma.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS market_deliveries_location_ts_idx ON market_deliveries(last_location_at)")
  await prisma.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS market_deliveries_updated_idx ON market_deliveries(updated_at)")

  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS market_delivery_locations_delivery_created_idx ON market_delivery_locations(delivery_id, created_at)",
  )
  await prisma.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS market_delivery_locations_order_idx ON market_delivery_locations(order_id)")

  await prisma.$executeRawUnsafe("CREATE INDEX IF NOT EXISTS market_delivery_otps_expiry_idx ON market_delivery_otps(expires_at)")

  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS market_distributor_locations_distributor_idx ON market_distributor_locations(distributor_id)",
  )
  await prisma.$executeRawUnsafe(
    "CREATE INDEX IF NOT EXISTS market_distributor_locations_status_idx ON market_distributor_locations(status)",
  )

  // Remove legacy demo seed rows so MP-aligned catalog becomes the default baseline.
  await prisma.$executeRawUnsafe(
    "DELETE FROM market_products WHERE id IN ('prod-001', 'prod-002', 'prod-003', 'prod-004')",
  )

  const now = new Date().toISOString()
  for (const product of getSeedProducts(now)) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO market_products
       (id, name, category, price, unit, stock, min_stock, status, rating, image, seller_id, seller_name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO NOTHING`,
      product.id,
      product.name,
      product.category,
      product.price,
      product.unit,
      product.stock,
      product.minStock,
      product.status,
      product.rating,
      product.image,
      product.sellerId,
      product.sellerName,
      product.createdAt,
      product.updatedAt,
    )
  }

  const missingDeliveryOrders = await prisma.$queryRawUnsafe<OrderRow[]>(
    `SELECT o.id, o.order_number, o.buyer_id, o.buyer_name, o.seller_id, o.seller_name, o.date, o.status, o.total, o.items_json, o.estimated_delivery, o.tracking_number
     FROM market_orders o
     LEFT JOIN market_deliveries d ON d.order_id = o.id
     WHERE d.id IS NULL`,
  )

  if (missingDeliveryOrders.length > 0) {
    const now = new Date().toISOString()
    for (const row of missingDeliveryOrders) {
      const order = mapOrder(row)
      const delivery = buildDefaultDeliveryFromOrder(order, now)
      await prisma.$executeRawUnsafe(
        `INSERT INTO market_deliveries
         (id, order_id, buyer_id, buyer_name, seller_id, seller_name, distributor_id, distributor_name, pickup_address, delivery_address, vehicle_number, vehicle_type, driver_name, driver_phone, status, eta_minutes, current_lat, current_lng, current_address, last_location_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        delivery.id,
        delivery.orderId,
        delivery.buyerId,
        delivery.buyerName,
        delivery.sellerId,
        delivery.sellerName,
        delivery.distributorId,
        delivery.distributorName,
        delivery.pickupAddress,
        delivery.deliveryAddress,
        delivery.vehicleNumber,
        delivery.vehicleType,
        delivery.driverName,
        delivery.driverPhone,
        delivery.status,
        delivery.etaMinutes,
        delivery.currentLat ?? null,
        delivery.currentLng ?? null,
        delivery.currentAddress ?? null,
        delivery.lastLocationAt ?? null,
        delivery.createdAt,
        delivery.updatedAt,
      )
    }
  }

  const ordersMissingShipments = await prisma.$queryRawUnsafe<OrderRow[]>(
    `SELECT o.id, o.order_number, o.buyer_id, o.buyer_name, o.seller_id, o.seller_name, o.date, o.status, o.total, o.items_json, o.estimated_delivery, o.tracking_number
     FROM market_orders o
     WHERE NOT EXISTS (
       SELECT 1 FROM market_order_shipments s WHERE s.order_id = o.id
     )`,
  )

  if (ordersMissingShipments.length > 0) {
    for (const row of ordersMissingShipments) {
      const order = mapOrder(row)
      const grouped = new Map<string, { sellerId: string; sellerName: string; amount: number }>()
      for (const item of order.items) {
        const key = `${item.sellerId}|${item.sellerName}`
        const current = grouped.get(key)
        if (current) {
          current.amount += item.lineTotal
        } else {
          grouped.set(key, { sellerId: item.sellerId, sellerName: item.sellerName, amount: item.lineTotal })
        }
      }

      const shipmentStatus = toShipmentStatus(order.status)
      const sellerGroups = Array.from(grouped.values())
      for (let index = 0; index < sellerGroups.length; index++) {
        const seller = sellerGroups[index]
        const tracking =
          shipmentStatus === "in_transit" || shipmentStatus === "delivered"
            ? `${order.trackingNumber || `TRK${Math.floor(100000000 + Math.random() * 900000000)}`}-S${index + 1}`
            : null
        const now = new Date().toISOString()
        await prisma.$executeRawUnsafe(
          `INSERT INTO market_order_shipments
           (id, order_id, seller_id, seller_name, amount, status, tracking_number, estimated_delivery, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          crypto.randomUUID(),
          order.id,
          seller.sellerId,
          seller.sellerName,
          Number(seller.amount.toFixed(2)),
          shipmentStatus,
          tracking,
          order.estimatedDelivery,
          now,
          now,
        )
      }
    }
  }

  marketTablesReady = true
}

export async function listProductsPaginated(input?: {
  page?: number
  limit?: number
  q?: string
  category?: string
  scopeSellerId?: string
}) {
  await ensureMarketTables()
  const { page, limit, offset } = normalizePagination(input)
  const where: string[] = []
  const params: unknown[] = []

  if (input?.scopeSellerId) {
    where.push("seller_id = ?")
    params.push(input.scopeSellerId)
  }

  if (input?.q?.trim()) {
    const q = `%${escapeLikeQuery(input.q.trim().toLowerCase())}%`
    where.push("(LOWER(name) LIKE ? ESCAPE '\\' OR LOWER(category) LIKE ? ESCAPE '\\' OR LOWER(seller_name) LIKE ? ESCAPE '\\')")
    params.push(q, q, q)
  }

  if (input?.category && input.category.trim().toLowerCase() !== "all") {
    where.push("LOWER(category) = ?")
    params.push(input.category.trim().toLowerCase())
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : ""
  const rows = await prisma.$queryRawUnsafe<ProductRow[]>(
    `SELECT id, name, category, price, unit, stock, min_stock, status, rating, image, seller_id, seller_name, created_at, updated_at
     FROM market_products
     ${whereSql}
     ORDER BY updated_at DESC
     LIMIT ? OFFSET ?`,
    ...params,
    limit,
    offset,
  )

  const countRows = await prisma.$queryRawUnsafe<Array<{ total: number }>>(
    `SELECT COUNT(1) as total FROM market_products ${whereSql}`,
    ...params,
  )

  const total = Number(countRows[0]?.total ?? 0)
  const items = rows.map(mapProduct)
  return {
    items,
    total,
    page,
    limit,
    hasNextPage: page * limit < total,
  } satisfies PaginatedResult<Product>
}

export async function listProducts() {
  const page = await listProductsPaginated({ page: 1, limit: 5000 })
  return page.items
}

export async function createProduct(input: Omit<Product, "id" | "createdAt" | "updatedAt">) {
  await ensureMarketTables()
  const now = new Date().toISOString()
  const id = crypto.randomUUID()

  await prisma.$executeRawUnsafe(
    `INSERT INTO market_products
     (id, name, category, price, unit, stock, min_stock, status, rating, image, seller_id, seller_name, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.name,
    input.category,
    input.price,
    input.unit,
    input.stock,
    input.minStock,
    input.status,
    input.rating,
    input.image,
    input.sellerId,
    input.sellerName,
    now,
    now,
  )

  return {
    ...input,
    id,
    createdAt: now,
    updatedAt: now,
  }
}

export async function listOrdersPaginated(input?: {
  page?: number
  limit?: number
  status?: OrderStatus | "all"
  buyerId?: string
  sellerId?: string
  distributorId?: string
  q?: string
}) {
  await ensureMarketTables()
  const { page, limit, offset } = normalizePagination(input)
  const where: string[] = []
  const params: unknown[] = []

  if (input?.status && input.status !== "all") {
    where.push("status = ?")
    params.push(input.status)
  }
  if (input?.buyerId) {
    where.push("buyer_id = ?")
    params.push(input.buyerId)
  }
  if (input?.sellerId) {
    where.push("(seller_id = ? OR items_json LIKE ?)")
    params.push(input.sellerId, `%\"sellerId\":\"${input.sellerId}\"%`)
  }
  if (input?.distributorId) {
    where.push(
      "EXISTS (SELECT 1 FROM market_deliveries d WHERE d.order_id = market_orders.id AND d.distributor_id = ?)",
    )
    params.push(input.distributorId)
  }
  if (input?.q?.trim()) {
    const q = `%${escapeLikeQuery(input.q.trim().toLowerCase())}%`
    where.push(
      "(LOWER(order_number) LIKE ? ESCAPE '\\' OR LOWER(buyer_name) LIKE ? ESCAPE '\\' OR LOWER(seller_name) LIKE ? ESCAPE '\\')",
    )
    params.push(q, q, q)
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : ""
  const rows = await prisma.$queryRawUnsafe<OrderRow[]>(
    `SELECT id, order_number, buyer_id, buyer_name, seller_id, seller_name, date, status, total, items_json, estimated_delivery, tracking_number
     FROM market_orders
     ${whereSql}
     ORDER BY date DESC
     LIMIT ? OFFSET ?`,
    ...params,
    limit,
    offset,
  )
  const countRows = await prisma.$queryRawUnsafe<Array<{ total: number }>>(
    `SELECT COUNT(1) as total FROM market_orders ${whereSql}`,
    ...params,
  )

  const total = Number(countRows[0]?.total ?? 0)
  const items = rows.map(mapOrder)
  return {
    items,
    total,
    page,
    limit,
    hasNextPage: page * limit < total,
  } satisfies PaginatedResult<Order>
}

export async function listOrders() {
  const page = await listOrdersPaginated({ page: 1, limit: 5000 })
  return page.items
}

export async function listOrderShipments(input?: { orderId?: string; sellerId?: string }) {
  await ensureMarketTables()
  const where: string[] = []
  const params: unknown[] = []
  if (input?.orderId) {
    where.push("order_id = ?")
    params.push(input.orderId)
  }
  if (input?.sellerId) {
    where.push("seller_id = ?")
    params.push(input.sellerId)
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : ""
  const rows = await prisma.$queryRawUnsafe<OrderShipmentRow[]>(
    `SELECT id, order_id, seller_id, seller_name, amount, status, tracking_number, estimated_delivery, created_at, updated_at
     FROM market_order_shipments
     ${whereSql}
     ORDER BY created_at DESC`,
    ...params,
  )
  return rows.map(mapOrderShipment)
}

export async function listOrderShipmentsByOrderIds(orderIds: string[]) {
  await ensureMarketTables()
  if (orderIds.length === 0) return []
  const placeholders = orderIds.map(() => "?").join(", ")
  const rows = await prisma.$queryRawUnsafe<OrderShipmentRow[]>(
    `SELECT id, order_id, seller_id, seller_name, amount, status, tracking_number, estimated_delivery, created_at, updated_at
     FROM market_order_shipments
     WHERE order_id IN (${placeholders})
     ORDER BY created_at DESC`,
    ...orderIds,
  )
  return rows.map(mapOrderShipment)
}

export async function listDistributorLocations(
  distributorId?: string,
  options?: {
    activeOnly?: boolean
  },
) {
  await ensureMarketTables()
  const where: string[] = []
  const params: unknown[] = []

  if (distributorId) {
    where.push("distributor_id = ?")
    params.push(distributorId)
  }
  if (options?.activeOnly) {
    where.push("status = ?")
    params.push("active")
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : ""

  const rows = await prisma.$queryRawUnsafe<DistributorLocationRow[]>(
    `SELECT id, distributor_id, name, address, radius_km, status, delivery_time, created_at, updated_at
     FROM market_distributor_locations
     ${whereSql}
     ORDER BY updated_at DESC`,
    ...params,
  )
  return rows.map(mapDistributorLocation)
}

export async function upsertDistributorLocation(input: {
  id?: string
  distributorId: string
  name: string
  address: string
  radiusKm: number
  status: DistributorLocationStatus
  deliveryTime: string
}) {
  await ensureMarketTables()
  const now = new Date().toISOString()
  const id = input.id?.trim() || crypto.randomUUID()

  await prisma.$executeRawUnsafe(
    `INSERT INTO market_distributor_locations
     (id, distributor_id, name, address, radius_km, status, delivery_time, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       address = excluded.address,
       radius_km = excluded.radius_km,
       status = excluded.status,
       delivery_time = excluded.delivery_time,
       updated_at = excluded.updated_at`,
    id,
    input.distributorId,
    input.name,
    input.address,
    input.radiusKm,
    input.status,
    input.deliveryTime,
    now,
    now,
  )

  const rows = await prisma.$queryRawUnsafe<DistributorLocationRow[]>(
    `SELECT id, distributor_id, name, address, radius_km, status, delivery_time, created_at, updated_at
     FROM market_distributor_locations
     WHERE id = ?
     LIMIT 1`,
    id,
  )
  return rows.length ? mapDistributorLocation(rows[0]) : null
}

export async function deleteDistributorLocation(input: { id: string; distributorId: string }) {
  await ensureMarketTables()
  await prisma.$executeRawUnsafe(
    "DELETE FROM market_distributor_locations WHERE id = ? AND distributor_id = ?",
    input.id,
    input.distributorId,
  )
}

export async function listSupplierFavorites(userId: string) {
  await ensureMarketTables()
  const rows = await prisma.$queryRawUnsafe<SupplierFavoriteRow[]>(
    `SELECT user_id, supplier_name, created_at
     FROM market_supplier_favorites
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    userId,
  )
  return rows.map(mapSupplierFavorite)
}

export async function setSupplierFavorite(input: { userId: string; supplierName: string; favorite: boolean }) {
  await ensureMarketTables()
  const now = new Date().toISOString()
  if (input.favorite) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO market_supplier_favorites (user_id, supplier_name, created_at)
       VALUES (?, ?, ?)
       ON CONFLICT (user_id, supplier_name) DO NOTHING`,
      input.userId,
      input.supplierName,
      now,
    )
    return
  }

  await prisma.$executeRawUnsafe(
    "DELETE FROM market_supplier_favorites WHERE user_id = ? AND supplier_name = ?",
    input.userId,
    input.supplierName,
  )
}

export async function updateOrderStatus(input: { orderId: string; status: OrderStatus }) {
  await ensureMarketTables()

  const currentRows = await prisma.$queryRawUnsafe<OrderRow[]>(
    "SELECT id, order_number, buyer_id, buyer_name, seller_id, seller_name, date, status, total, items_json, estimated_delivery, tracking_number FROM market_orders WHERE id = ? LIMIT 1",
    input.orderId,
  )

  if (!currentRows.length) {
    return null
  }

  const current = currentRows[0]
  const trackingNumber =
    current.tracking_number || (input.status === "shipped" ? `TRK${Math.floor(100000000 + Math.random() * 900000000)}` : null)

  await prisma.$executeRawUnsafe(
    "UPDATE market_orders SET status = ?, tracking_number = ? WHERE id = ?",
    input.status,
    trackingNumber,
    input.orderId,
  )

  const shipmentStatus = toShipmentStatus(input.status)
  await prisma.$executeRawUnsafe(
    "UPDATE market_order_shipments SET status = ?, updated_at = ? WHERE order_id = ?",
    shipmentStatus,
    new Date().toISOString(),
    input.orderId,
  )

  const nextDeliveryStatus = toDeliveryStatus(input.status)
  const deliveryUpdatedAt = new Date().toISOString()

  if (input.status === "shipped") {
    await prisma.$executeRawUnsafe(
      `UPDATE market_deliveries
       SET status = CASE WHEN status = 'nearby' THEN status ELSE ? END,
           updated_at = ?
       WHERE order_id = ?`,
      nextDeliveryStatus,
      deliveryUpdatedAt,
      input.orderId,
    )
  } else {
    await prisma.$executeRawUnsafe(
      "UPDATE market_deliveries SET status = ?, updated_at = ? WHERE order_id = ?",
      nextDeliveryStatus,
      deliveryUpdatedAt,
      input.orderId,
    )
  }

  const updatedRows = await prisma.$queryRawUnsafe<OrderRow[]>(
    "SELECT id, order_number, buyer_id, buyer_name, seller_id, seller_name, date, status, total, items_json, estimated_delivery, tracking_number FROM market_orders WHERE id = ? LIMIT 1",
    input.orderId,
  )

  return updatedRows.length ? mapOrder(updatedRows[0]) : null
}

export async function updateOrderEstimatedDelivery(input: { orderId: string; estimatedDelivery: string }) {
  await ensureMarketTables()

  await prisma.$executeRawUnsafe(
    "UPDATE market_orders SET estimated_delivery = ? WHERE id = ?",
    input.estimatedDelivery,
    input.orderId,
  )

  await prisma.$executeRawUnsafe(
    "UPDATE market_order_shipments SET estimated_delivery = ?, updated_at = ? WHERE order_id = ?",
    input.estimatedDelivery,
    new Date().toISOString(),
    input.orderId,
  )

  const rows = await prisma.$queryRawUnsafe<OrderRow[]>(
    "SELECT id, order_number, buyer_id, buyer_name, seller_id, seller_name, date, status, total, items_json, estimated_delivery, tracking_number FROM market_orders WHERE id = ? LIMIT 1",
    input.orderId,
  )

  return rows.length ? mapOrder(rows[0]) : null
}

export async function listPayments() {
  await ensureMarketTables()
  const rows = await prisma.$queryRawUnsafe<PaymentRow[]>(
    `SELECT id, order_id, user_id, amount, method, status, provider, payment_intent_id, gateway_order_id, gateway_transaction_id, gateway_signature, gateway_payload, verified_at, created_at
     FROM market_payments
     ORDER BY created_at DESC`,
  )
  return rows.map(mapPayment)
}

export async function getPaymentByOrderId(orderId: string) {
  await ensureMarketTables()
  const rows = await prisma.$queryRawUnsafe<PaymentRow[]>(
    `SELECT id, order_id, user_id, amount, method, status, provider, payment_intent_id, gateway_order_id, gateway_transaction_id, gateway_signature, gateway_payload, verified_at, created_at
     FROM market_payments
     WHERE order_id = ?
     ORDER BY created_at DESC
     LIMIT 1`,
    orderId,
  )
  return rows.length > 0 ? mapPayment(rows[0]) : null
}

export async function markOrderPaymentPaid(input: {
  orderId: string
  buyerId: string
  paymentMethod: string
  paymentProvider: PaymentProvider
  paymentIntentId: string
  gatewayOrderId?: string
  gatewayTransactionId?: string
  gatewaySignature?: string
  gatewayPayload?: string
  paymentVerifiedAt?: string
}) {
  await ensureMarketTables()

  return prisma.$transaction(async (tx) => {
    const orderRows = await tx.$queryRawUnsafe<OrderRow[]>(
      "SELECT id, order_number, buyer_id, buyer_name, seller_id, seller_name, date, status, total, items_json, estimated_delivery, tracking_number FROM market_orders WHERE id = ? LIMIT 1",
      input.orderId,
    )
    if (orderRows.length === 0) {
      throw new Error("Order not found")
    }

    const order = mapOrder(orderRows[0])
    if (order.buyerId !== input.buyerId) {
      throw new Error("You can only pay your own orders")
    }
    if (order.status !== "confirmed") {
      throw new Error("Order must be accepted by seller/distributor before payment")
    }

    const now = new Date().toISOString()
    const paymentRows = await tx.$queryRawUnsafe<PaymentRow[]>(
      `SELECT id, order_id, user_id, amount, method, status, provider, payment_intent_id, gateway_order_id, gateway_transaction_id, gateway_signature, gateway_payload, verified_at, created_at
       FROM market_payments
       WHERE order_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      input.orderId,
    )

    if (paymentRows.length > 0) {
      const existing = paymentRows[0]
      await tx.$executeRawUnsafe(
        `UPDATE market_payments
         SET amount = ?, method = ?, status = ?, provider = ?, payment_intent_id = ?, gateway_order_id = ?, gateway_transaction_id = ?, gateway_signature = ?, gateway_payload = ?, verified_at = ?
         WHERE id = ?`,
        order.total,
        input.paymentMethod,
        "paid",
        input.paymentProvider,
        input.paymentIntentId,
        input.gatewayOrderId ?? null,
        input.gatewayTransactionId ?? null,
        input.gatewaySignature ?? null,
        input.gatewayPayload ?? null,
        input.paymentVerifiedAt ?? now,
        existing.id,
      )
    } else {
      await tx.$executeRawUnsafe(
        `INSERT INTO market_payments
         (id, order_id, user_id, amount, method, status, provider, payment_intent_id, gateway_order_id, gateway_transaction_id, gateway_signature, gateway_payload, verified_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        crypto.randomUUID(),
        order.id,
        input.buyerId,
        order.total,
        input.paymentMethod,
        "paid",
        input.paymentProvider,
        input.paymentIntentId,
        input.gatewayOrderId ?? null,
        input.gatewayTransactionId ?? null,
        input.gatewaySignature ?? null,
        input.gatewayPayload ?? null,
        input.paymentVerifiedAt ?? now,
        now,
      )
    }

    const updatedPaymentRows = await tx.$queryRawUnsafe<PaymentRow[]>(
      `SELECT id, order_id, user_id, amount, method, status, provider, payment_intent_id, gateway_order_id, gateway_transaction_id, gateway_signature, gateway_payload, verified_at, created_at
       FROM market_payments
       WHERE order_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      input.orderId,
    )

    return {
      order,
      payment: updatedPaymentRows.length > 0 ? mapPayment(updatedPaymentRows[0]) : null,
    }
  })
}

export async function createPaymentIntent(input: {
  buyerId: string
  provider: PaymentProvider
  amount: number
  currency?: string
  gatewayOrderId?: string
  gatewayTransactionId?: string
  gatewayPayload?: string
}) {
  await ensureMarketTables()

  const now = new Date().toISOString()
  const id = crypto.randomUUID()
  const currency = input.currency ?? "INR"

  await prisma.$executeRawUnsafe(
    `INSERT INTO market_payment_intents
     (id, buyer_id, provider, amount, currency, status, gateway_order_id, gateway_transaction_id, gateway_payload, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    input.buyerId,
    input.provider,
    input.amount,
    currency,
    "pending",
    input.gatewayOrderId ?? null,
    input.gatewayTransactionId ?? null,
    input.gatewayPayload ?? null,
    now,
    now,
  )

  return getPaymentIntentById(id)
}

export async function getPaymentIntentById(intentId: string) {
  await ensureMarketTables()
  const rows = await prisma.$queryRawUnsafe<PaymentIntentRow[]>(
    `SELECT id, buyer_id, provider, amount, currency, status, gateway_order_id, gateway_transaction_id, gateway_signature, gateway_payload, verified_at, consumed_at, created_at, updated_at
     FROM market_payment_intents
     WHERE id = ?
     LIMIT 1`,
    intentId,
  )

  return rows.length > 0 ? mapPaymentIntent(rows[0]) : null
}

export async function getPaymentIntentByGatewayOrderId(gatewayOrderId: string) {
  await ensureMarketTables()
  const rows = await prisma.$queryRawUnsafe<PaymentIntentRow[]>(
    `SELECT id, buyer_id, provider, amount, currency, status, gateway_order_id, gateway_transaction_id, gateway_signature, gateway_payload, verified_at, consumed_at, created_at, updated_at
     FROM market_payment_intents
     WHERE gateway_order_id = ?
     ORDER BY created_at DESC
     LIMIT 1`,
    gatewayOrderId,
  )
  return rows.length > 0 ? mapPaymentIntent(rows[0]) : null
}

export async function getPaymentIntentByGatewayTransactionId(gatewayTransactionId: string) {
  await ensureMarketTables()
  const rows = await prisma.$queryRawUnsafe<PaymentIntentRow[]>(
    `SELECT id, buyer_id, provider, amount, currency, status, gateway_order_id, gateway_transaction_id, gateway_signature, gateway_payload, verified_at, consumed_at, created_at, updated_at
     FROM market_payment_intents
     WHERE gateway_transaction_id = ?
     ORDER BY created_at DESC
     LIMIT 1`,
    gatewayTransactionId,
  )
  return rows.length > 0 ? mapPaymentIntent(rows[0]) : null
}

export async function markPaymentIntentVerified(input: {
  intentId: string
  gatewayTransactionId?: string
  gatewaySignature?: string
  gatewayPayload?: string
}) {
  await ensureMarketTables()

  const existing = await getPaymentIntentById(input.intentId)
  if (!existing) return null

  const now = new Date().toISOString()
  const status = existing.status === "used" ? "used" : "verified"

  await prisma.$executeRawUnsafe(
    `UPDATE market_payment_intents
     SET status = ?, gateway_transaction_id = ?, gateway_signature = ?, gateway_payload = ?, verified_at = ?, updated_at = ?
     WHERE id = ?`,
    status,
    input.gatewayTransactionId ?? existing.gatewayTransactionId ?? null,
    input.gatewaySignature ?? existing.gatewaySignature ?? null,
    input.gatewayPayload ?? existing.gatewayPayload ?? null,
    now,
    now,
    input.intentId,
  )

  return getPaymentIntentById(input.intentId)
}

export async function markPaymentIntentFailed(input: { intentId: string; gatewayPayload?: string }) {
  await ensureMarketTables()
  const existing = await getPaymentIntentById(input.intentId)
  if (!existing) return null

  const now = new Date().toISOString()
  await prisma.$executeRawUnsafe(
    "UPDATE market_payment_intents SET status = ?, gateway_payload = ?, updated_at = ? WHERE id = ?",
    "failed",
    input.gatewayPayload ?? existing.gatewayPayload ?? null,
    now,
    input.intentId,
  )
  return getPaymentIntentById(input.intentId)
}

export async function consumePaymentIntent(input: {
  intentId: string
  buyerId: string
  amount?: number
  tolerance?: number
}) {
  await ensureMarketTables()
  const intent = await getPaymentIntentById(input.intentId)
  if (!intent || intent.buyerId !== input.buyerId || intent.status !== "verified") {
    return null
  }

  const tolerance = input.tolerance ?? 1
  if (typeof input.amount === "number" && Math.abs(intent.amount - input.amount) > tolerance) {
    return null
  }

  const now = new Date().toISOString()
  await prisma.$executeRawUnsafe(
    "UPDATE market_payment_intents SET status = ?, consumed_at = ?, updated_at = ? WHERE id = ?",
    "used",
    now,
    now,
    input.intentId,
  )

  return getPaymentIntentById(input.intentId)
}

export async function listDeliveries() {
  await ensureMarketTables()
  const rows = await prisma.$queryRawUnsafe<DeliveryRow[]>(
    `SELECT id, order_id, buyer_id, buyer_name, seller_id, seller_name, distributor_id, distributor_name, pickup_address, delivery_address, vehicle_number, vehicle_type, driver_name, driver_phone, status, eta_minutes, current_lat, current_lng, current_address, last_location_at, created_at, updated_at
     FROM market_deliveries
     ORDER BY updated_at DESC`,
  )
  return rows.map(mapDelivery)
}

export async function getDeliveryById(deliveryId: string) {
  await ensureMarketTables()
  const rows = await prisma.$queryRawUnsafe<DeliveryRow[]>(
    `SELECT id, order_id, buyer_id, buyer_name, seller_id, seller_name, distributor_id, distributor_name, pickup_address, delivery_address, vehicle_number, vehicle_type, driver_name, driver_phone, status, eta_minutes, current_lat, current_lng, current_address, last_location_at, created_at, updated_at
     FROM market_deliveries
     WHERE id = ?
     LIMIT 1`,
    deliveryId,
  )

  return rows.length > 0 ? mapDelivery(rows[0]) : null
}

export async function getDeliveryByOrderId(orderId: string) {
  await ensureMarketTables()
  const rows = await prisma.$queryRawUnsafe<DeliveryRow[]>(
    `SELECT id, order_id, buyer_id, buyer_name, seller_id, seller_name, distributor_id, distributor_name, pickup_address, delivery_address, vehicle_number, vehicle_type, driver_name, driver_phone, status, eta_minutes, current_lat, current_lng, current_address, last_location_at, created_at, updated_at
     FROM market_deliveries
     WHERE order_id = ?
     LIMIT 1`,
    orderId,
  )

  return rows.length > 0 ? mapDelivery(rows[0]) : null
}

export async function listDeliveryLocations(input: { deliveryId: string; limit?: number }) {
  await ensureMarketTables()
  const safeLimit = Math.min(Math.max(input.limit ?? 25, 1), 200)
  const rows = await prisma.$queryRawUnsafe<DeliveryLocationRow[]>(
    `SELECT id, delivery_id, order_id, lat, lng, address, speed_kph, heading, status, created_at
     FROM market_delivery_locations
     WHERE delivery_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    input.deliveryId,
    safeLimit,
  )
  return rows.map(mapDeliveryLocation)
}

export async function getDeliveryOtp(deliveryId: string) {
  await ensureMarketTables()
  const rows = await prisma.$queryRawUnsafe<DeliveryOtpRow[]>(
    "SELECT delivery_id, otp_code, is_verified, expires_at, created_at, updated_at FROM market_delivery_otps WHERE delivery_id = ? LIMIT 1",
    deliveryId,
  )
  return rows.length > 0 ? mapDeliveryOtp(rows[0]) : null
}

export async function issueDeliveryOtp(input: { deliveryId: string; expiresInMinutes?: number }) {
  await ensureMarketTables()
  const delivery = await getDeliveryById(input.deliveryId)
  if (!delivery) return null

  const now = new Date()
  const createdAt = now.toISOString()
  const expiresAt = new Date(now.getTime() + (input.expiresInMinutes ?? 30) * 60 * 1000).toISOString()
  const otpCode = String(Math.floor(100000 + Math.random() * 900000))

  await prisma.$executeRawUnsafe(
    `INSERT INTO market_delivery_otps
     (delivery_id, otp_code, is_verified, expires_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(delivery_id) DO UPDATE SET
       otp_code = excluded.otp_code,
       is_verified = excluded.is_verified,
       expires_at = excluded.expires_at,
       updated_at = excluded.updated_at`,
    input.deliveryId,
    otpCode,
    0,
    expiresAt,
    createdAt,
    createdAt,
  )

  return getDeliveryOtp(input.deliveryId)
}

export async function verifyDeliveryOtp(input: { deliveryId: string; otpCode: string }) {
  await ensureMarketTables()
  const current = await getDeliveryOtp(input.deliveryId)
  if (!current) {
    return { ok: false, reason: "otp_not_issued" as const }
  }

  if (current.isVerified) {
    return { ok: true, reason: "already_verified" as const }
  }

  if (new Date(current.expiresAt).getTime() < Date.now()) {
    return { ok: false, reason: "otp_expired" as const }
  }

  if (current.otpCode !== input.otpCode.trim()) {
    return { ok: false, reason: "otp_invalid" as const }
  }

  const updatedAt = new Date().toISOString()
  await prisma.$executeRawUnsafe(
    "UPDATE market_delivery_otps SET is_verified = ?, updated_at = ? WHERE delivery_id = ?",
    1,
    updatedAt,
    input.deliveryId,
  )
  return { ok: true, reason: "verified" as const }
}

export async function getDeliveryProof(deliveryId: string) {
  await ensureMarketTables()
  const rows = await prisma.$queryRawUnsafe<DeliveryProofRow[]>(
    "SELECT id, delivery_id, otp_verified, pod_image_url, pod_note, received_by, delivered_at, created_at FROM market_delivery_proofs WHERE delivery_id = ? LIMIT 1",
    deliveryId,
  )
  return rows.length > 0 ? mapDeliveryProof(rows[0]) : null
}

export async function upsertDeliveryProof(input: {
  deliveryId: string
  otpVerified: boolean
  podImageUrl?: string
  podNote?: string
  receivedBy?: string
  deliveredAt?: string
}) {
  await ensureMarketTables()
  const delivery = await getDeliveryById(input.deliveryId)
  if (!delivery) return null

  const existing = await getDeliveryProof(input.deliveryId)
  const deliveredAt = input.deliveredAt ?? new Date().toISOString()
  const createdAt = existing?.createdAt ?? new Date().toISOString()
  const id = existing?.id ?? crypto.randomUUID()

  await prisma.$executeRawUnsafe(
    `INSERT INTO market_delivery_proofs
     (id, delivery_id, otp_verified, pod_image_url, pod_note, received_by, delivered_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(delivery_id) DO UPDATE SET
       otp_verified = excluded.otp_verified,
       pod_image_url = excluded.pod_image_url,
       pod_note = excluded.pod_note,
       received_by = excluded.received_by,
       delivered_at = excluded.delivered_at`,
    id,
    input.deliveryId,
    input.otpVerified ? 1 : 0,
    input.podImageUrl ?? null,
    input.podNote ?? null,
    input.receivedBy ?? null,
    deliveredAt,
    createdAt,
  )

  return getDeliveryProof(input.deliveryId)
}

export async function getDeliveryAlerts(deliveryId: string) {
  await ensureMarketTables()
  const delivery = await getDeliveryById(deliveryId)
  if (!delivery) return null

  const recentLocations = await listDeliveryLocations({ deliveryId, limit: 3 })
  const alerts: DeliveryAlert[] = []

  const activeDelivery = delivery.status !== "delivered" && delivery.status !== "cancelled"
  if (activeDelivery && (delivery.vehicleNumber === "Not Assigned" || delivery.driverName === "Not Assigned")) {
    alerts.push({
      code: "assignment_missing",
      severity: "critical",
      title: "Assignment Missing",
      message: "Vehicle/driver assignment is incomplete for this delivery.",
    })
  }

  if (activeDelivery && delivery.status !== "pickup_ready" && delivery.etaMinutes > 90) {
    alerts.push({
      code: "delay_risk",
      severity: "warning",
      title: "Delay Risk",
      message: `ETA is high (${delivery.etaMinutes} mins). Delivery may be delayed.`,
    })
  }

  if (activeDelivery && delivery.lastLocationAt) {
    const staleMinutes = Math.floor((Date.now() - new Date(delivery.lastLocationAt).getTime()) / (1000 * 60))
    if (staleMinutes >= 10) {
      alerts.push({
        code: "stale_location",
        severity: "warning",
        title: "Location Stale",
        message: `No live ping in the last ${staleMinutes} minutes.`,
      })
    }
  }

  if (activeDelivery && recentLocations.length >= 2) {
    const latest = recentLocations[0]
    const previous = recentLocations[1]
    const diff = headingDiff(latest.heading, previous.heading)
    if (latest.speedKph >= 10 && diff >= 120) {
      alerts.push({
        code: "route_deviation",
        severity: "info",
        title: "Route Deviation Risk",
        message: "Sharp heading change detected. Verify route with driver.",
      })
    }
  }

  return {
    deliveryId,
    alerts,
  }
}

export async function updateDelivery(input: {
  deliveryId: string
  status?: DeliveryStatus
  distributorId?: string
  distributorName?: string
  deliveryAddress?: string
  vehicleNumber?: string
  vehicleType?: string
  driverName?: string
  driverPhone?: string
  etaMinutes?: number
  currentLat?: number
  currentLng?: number
  currentAddress?: string
}) {
  await ensureMarketTables()

  const existing = await getDeliveryById(input.deliveryId)
  if (!existing) {
    return null
  }

  const next: Delivery = {
    ...existing,
    status: input.status ?? existing.status,
    distributorId: input.distributorId ?? existing.distributorId,
    distributorName: input.distributorName ?? existing.distributorName,
    deliveryAddress: input.deliveryAddress ?? existing.deliveryAddress,
    vehicleNumber: input.vehicleNumber ?? existing.vehicleNumber,
    vehicleType: input.vehicleType ?? existing.vehicleType,
    driverName: input.driverName ?? existing.driverName,
    driverPhone: input.driverPhone ?? existing.driverPhone,
    etaMinutes: input.etaMinutes ?? existing.etaMinutes,
    currentLat: input.currentLat ?? existing.currentLat,
    currentLng: input.currentLng ?? existing.currentLng,
    currentAddress: input.currentAddress ?? existing.currentAddress,
    lastLocationAt:
      input.currentLat !== undefined || input.currentLng !== undefined || input.currentAddress !== undefined
        ? new Date().toISOString()
        : existing.lastLocationAt,
    updatedAt: new Date().toISOString(),
  }

  if (next.status === "delivered") {
    next.etaMinutes = 0
  }
  if (next.status === "nearby") {
    next.etaMinutes = Math.min(next.etaMinutes, 15)
  }

  await prisma.$executeRawUnsafe(
    `UPDATE market_deliveries
     SET status = ?, distributor_id = ?, distributor_name = ?, delivery_address = ?, vehicle_number = ?, vehicle_type = ?, driver_name = ?, driver_phone = ?, eta_minutes = ?, current_lat = ?, current_lng = ?, current_address = ?, last_location_at = ?, updated_at = ?
     WHERE id = ?`,
    next.status,
    next.distributorId,
    next.distributorName,
    next.deliveryAddress,
    next.vehicleNumber,
    next.vehicleType,
    next.driverName,
    next.driverPhone,
    next.etaMinutes,
    next.currentLat ?? null,
    next.currentLng ?? null,
    next.currentAddress ?? null,
    next.lastLocationAt ?? null,
    next.updatedAt,
    input.deliveryId,
  )

  const expectedOrderStatus = toOrderStatus(next.status)
  const orderRows = await prisma.$queryRawUnsafe<OrderRow[]>(
    "SELECT id, order_number, buyer_id, buyer_name, seller_id, seller_name, date, status, total, items_json, estimated_delivery, tracking_number FROM market_orders WHERE id = ? LIMIT 1",
    next.orderId,
  )
  if (orderRows.length > 0 && orderRows[0].status !== expectedOrderStatus) {
    await updateOrderStatus({ orderId: next.orderId, status: expectedOrderStatus })
  }

  const updated = await getDeliveryById(input.deliveryId)
  return updated
}

export async function appendDeliveryLocation(input: {
  deliveryId: string
  lat: number
  lng: number
  address: string
  speedKph?: number
  heading?: number
  status?: DeliveryStatus
}) {
  await ensureMarketTables()
  const delivery = await getDeliveryById(input.deliveryId)
  if (!delivery) return null

  const now = new Date().toISOString()
  const status = input.status ?? delivery.status
  let nextEtaMinutes = delivery.etaMinutes
  if (status === "delivered") {
    nextEtaMinutes = 0
  } else if (status === "nearby") {
    nextEtaMinutes = Math.min(nextEtaMinutes, 15)
  } else if (status === "in_transit") {
    const speed = Math.max(input.speedKph ?? 0, 5)
    const reduction = Math.max(1, Math.round(speed / 12))
    nextEtaMinutes = Math.max(5, nextEtaMinutes - reduction)
  } else if (status === "pickup_ready") {
    nextEtaMinutes = Math.max(nextEtaMinutes, 120)
  }

  const location: DeliveryLocation = {
    id: crypto.randomUUID(),
    deliveryId: delivery.id,
    orderId: delivery.orderId,
    lat: input.lat,
    lng: input.lng,
    address: input.address,
    speedKph: input.speedKph ?? 0,
    heading: input.heading ?? 0,
    status,
    createdAt: now,
  }

  await prisma.$executeRawUnsafe(
    `INSERT INTO market_delivery_locations
     (id, delivery_id, order_id, lat, lng, address, speed_kph, heading, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    location.id,
    location.deliveryId,
    location.orderId,
    location.lat,
    location.lng,
    location.address,
    location.speedKph,
    location.heading,
    location.status,
    location.createdAt,
  )

  const updatedDelivery = await updateDelivery({
    deliveryId: delivery.id,
    status,
    etaMinutes: nextEtaMinutes,
    currentLat: location.lat,
    currentLng: location.lng,
    currentAddress: location.address,
  })

  return {
    location,
    delivery: updatedDelivery,
  }
}

export async function createOrder(input: {
  buyerId: string
  buyerName: string
  items: Array<{ productId: string; quantity: number }>
  deliveryAddress: string
  requestedDeliveryDate?: string
  preferredDistributorId?: string
  preferredDistributorName?: string
  preferredVehicleType?: string
  paymentMethod: string
  paymentStatus?: PaymentStatus
  paymentProvider?: PaymentProvider
  paymentIntentId?: string
  gatewayOrderId?: string
  gatewayTransactionId?: string
  gatewaySignature?: string
  gatewayPayload?: string
  paymentVerifiedAt?: string
}) {
  await ensureMarketTables()

  return prisma.$transaction(async (tx) => {
    const orderItems: OrderItem[] = []

    for (const line of input.items) {
      const productRows = await tx.$queryRawUnsafe<ProductRow[]>(
        "SELECT id, name, category, price, unit, stock, min_stock, status, rating, image, seller_id, seller_name, created_at, updated_at FROM market_products WHERE id = ? LIMIT 1",
        line.productId,
      )
      const product = productRows.length ? mapProduct(productRows[0]) : null

      if (!product) {
        throw new Error(`Product not found: ${line.productId}`)
      }
      if (line.quantity <= 0) {
        throw new Error("Quantity must be greater than zero")
      }
      if (product.stock < line.quantity) {
        throw new Error(`Insufficient stock for ${product.name}`)
      }

      const nextStock = product.stock - line.quantity
      const nextStatus: ProductStatus = nextStock > 0 ? "active" : "out_of_stock"
      const updatedAt = new Date().toISOString()

      await tx.$executeRawUnsafe(
        "UPDATE market_products SET stock = ?, status = ?, updated_at = ? WHERE id = ?",
        nextStock,
        nextStatus,
        updatedAt,
        product.id,
      )

      orderItems.push({
        productId: product.id,
        productName: product.name,
        quantity: line.quantity,
        unitPrice: product.price,
        lineTotal: product.price * line.quantity,
        sellerId: product.sellerId,
        sellerName: product.sellerName,
      })
    }

    const total = orderItems.reduce((sum, item) => sum + item.lineTotal, 0)
    const sellerGroups = new Map<string, { sellerId: string; sellerName: string; amount: number }>()
    for (const item of orderItems) {
      const key = `${item.sellerId}|${item.sellerName}`
      const current = sellerGroups.get(key)
      if (current) {
        current.amount += item.lineTotal
      } else {
        sellerGroups.set(key, {
          sellerId: item.sellerId,
          sellerName: item.sellerName,
          amount: item.lineTotal,
        })
      }
    }
    const sellerList = Array.from(sellerGroups.values())
    const primarySeller = sellerList[0]
    const hasMultiSeller = sellerList.length > 1
    const now = new Date()

    const order: Order = {
      id: crypto.randomUUID(),
      orderNumber: `ORD-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      buyerId: input.buyerId,
      buyerName: input.buyerName,
      sellerId: hasMultiSeller ? "multi-seller" : primarySeller?.sellerId || "",
      sellerName: hasMultiSeller ? "Multiple Sellers" : primarySeller?.sellerName || "",
      date: now.toISOString(),
      status: "pending",
      total,
      items: orderItems,
      estimatedDelivery: input.requestedDeliveryDate || new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString(),
      trackingNumber: undefined,
    }

    const payment: Payment = {
      id: crypto.randomUUID(),
      orderId: order.id,
      userId: input.buyerId,
      amount: total,
      method: input.paymentMethod,
      status: input.paymentStatus ?? "pending",
      provider: input.paymentProvider,
      paymentIntentId: input.paymentIntentId,
      gatewayOrderId: input.gatewayOrderId,
      gatewayTransactionId: input.gatewayTransactionId,
      gatewaySignature: input.gatewaySignature,
      gatewayPayload: input.gatewayPayload,
      verifiedAt: input.paymentVerifiedAt,
      createdAt: now.toISOString(),
    }

    const delivery = buildDefaultDeliveryFromOrder(order, now.toISOString(), {
      deliveryAddress: input.deliveryAddress,
      distributorId: input.preferredDistributorId,
      distributorName: input.preferredDistributorName,
      vehicleType: input.preferredVehicleType,
    })

    await tx.$executeRawUnsafe(
      `INSERT INTO market_orders
       (id, order_number, buyer_id, buyer_name, seller_id, seller_name, date, status, total, items_json, estimated_delivery, tracking_number)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      order.id,
      order.orderNumber,
      order.buyerId,
      order.buyerName,
      order.sellerId,
      order.sellerName,
      order.date,
      order.status,
      order.total,
      JSON.stringify(order.items),
      order.estimatedDelivery,
      order.trackingNumber ?? null,
    )

    await tx.$executeRawUnsafe(
      `INSERT INTO market_payments
       (id, order_id, user_id, amount, method, status, provider, payment_intent_id, gateway_order_id, gateway_transaction_id, gateway_signature, gateway_payload, verified_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      payment.id,
      payment.orderId,
      payment.userId,
      payment.amount,
      payment.method,
      payment.status,
      payment.provider ?? null,
      payment.paymentIntentId ?? null,
      payment.gatewayOrderId ?? null,
      payment.gatewayTransactionId ?? null,
      payment.gatewaySignature ?? null,
      payment.gatewayPayload ?? null,
      payment.verifiedAt ?? null,
      payment.createdAt,
    )

    for (let index = 0; index < sellerList.length; index++) {
      const seller = sellerList[index]
      const shipment: OrderShipment = {
        id: crypto.randomUUID(),
        orderId: order.id,
        sellerId: seller.sellerId,
        sellerName: seller.sellerName,
        amount: Number(seller.amount.toFixed(2)),
        status: toShipmentStatus(order.status),
        trackingNumber: order.trackingNumber ? `${order.trackingNumber}-S${index + 1}` : undefined,
        estimatedDelivery: order.estimatedDelivery,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }

      await tx.$executeRawUnsafe(
        `INSERT INTO market_order_shipments
         (id, order_id, seller_id, seller_name, amount, status, tracking_number, estimated_delivery, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        shipment.id,
        shipment.orderId,
        shipment.sellerId,
        shipment.sellerName,
        shipment.amount,
        shipment.status,
        shipment.trackingNumber ?? null,
        shipment.estimatedDelivery,
        shipment.createdAt,
        shipment.updatedAt,
      )
    }

    await tx.$executeRawUnsafe(
      `INSERT INTO market_deliveries
       (id, order_id, buyer_id, buyer_name, seller_id, seller_name, distributor_id, distributor_name, pickup_address, delivery_address, vehicle_number, vehicle_type, driver_name, driver_phone, status, eta_minutes, current_lat, current_lng, current_address, last_location_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      delivery.id,
      delivery.orderId,
      delivery.buyerId,
      delivery.buyerName,
      delivery.sellerId,
      delivery.sellerName,
      delivery.distributorId,
      delivery.distributorName,
      delivery.pickupAddress,
      delivery.deliveryAddress,
      delivery.vehicleNumber,
      delivery.vehicleType,
      delivery.driverName,
      delivery.driverPhone,
      delivery.status,
      delivery.etaMinutes,
      delivery.currentLat ?? null,
      delivery.currentLng ?? null,
      delivery.currentAddress ?? null,
      delivery.lastLocationAt ?? null,
      delivery.createdAt,
      delivery.updatedAt,
    )

    return { order, payment }
  })
}

export async function getMarketRates(): Promise<MarketRates> {
  const products = await listProducts()
  const active = products.filter((product) => product.status === "active")

  const byCategory = (label: string) => {
    const normalized = label.toLowerCase()
    return active.filter(
      (product) =>
        product.category.toLowerCase().includes(normalized) || product.name.toLowerCase().includes(normalized),
    )
  }

  const brickProducts = byCategory("brick")
  const cementProducts = byCategory("cement")
  const sandProducts = byCategory("sand")
  const steelProducts = byCategory("steel")

  const avg = (items: Product[], fallback: number) =>
    items.length > 0 ? Number((items.reduce((sum, item) => sum + item.price, 0) / items.length).toFixed(2)) : fallback

  return {
    brickPerPiece: avg(brickProducts, 7.4),
    cementPerBag: avg(cementProducts, 382),
    sandPerTon: avg(sandProducts, 1380),
    steelPerTon: avg(steelProducts, 61100),
    sourceCount: {
      bricks: brickProducts.length,
      cement: cementProducts.length,
      sand: sandProducts.length,
      steel: steelProducts.length,
    },
  }
}

