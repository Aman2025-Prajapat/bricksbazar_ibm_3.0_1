import { prisma } from "@/lib/server/prisma"

export type ProductStatus = "active" | "out_of_stock"
export type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled"
export type PaymentStatus = "pending" | "paid" | "failed"
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

export type Payment = {
  id: string
  orderId: string
  userId: string
  amount: number
  method: string
  status: PaymentStatus
  createdAt: string
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

type PaymentRow = {
  id: string
  order_id: string
  user_id: string
  amount: number
  method: string
  status: PaymentStatus
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

function mapPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    orderId: row.order_id,
    userId: row.user_id,
    amount: Number(row.amount),
    method: row.method,
    status: row.status,
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

function buildDefaultDeliveryFromOrder(order: Order, nowIso: string): Delivery {
  return {
    id: crypto.randomUUID(),
    orderId: order.id,
    buyerId: order.buyerId,
    buyerName: order.buyerName,
    sellerId: order.sellerId,
    sellerName: order.sellerName,
    distributorId: "system-distributor",
    distributorName: "Auto Dispatch",
    pickupAddress: `${order.sellerName} Warehouse Hub`,
    deliveryAddress: `${order.buyerName} Delivery Location`,
    vehicleNumber: "Not Assigned",
    vehicleType: "Truck",
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
      id: "prod-001",
      name: "Premium Red Bricks",
      category: "Bricks",
      price: 8.5,
      unit: "per piece",
      stock: 25000,
      minStock: 5000,
      status: "active" as const,
      rating: 4.9,
      image: "/placeholder.svg?key=brick1",
      sellerId: "seed-seller-1",
      sellerName: "Delhi Brick Works",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "prod-002",
      name: "OPC Cement 50kg",
      category: "Cement",
      price: 420,
      unit: "per bag",
      stock: 320,
      minStock: 40,
      status: "active" as const,
      rating: 4.7,
      image: "/placeholder.svg?key=cement1",
      sellerId: "seed-seller-2",
      sellerName: "UltraTech",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "prod-003",
      name: "River Sand",
      category: "Sand",
      price: 1200,
      unit: "per ton",
      stock: 90,
      minStock: 15,
      status: "active" as const,
      rating: 4.6,
      image: "/placeholder.svg?key=sand1",
      sellerId: "seed-seller-3",
      sellerName: "Local Sand Supplier",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "prod-004",
      name: "TMT Steel Fe500",
      category: "Steel",
      price: 62000,
      unit: "per ton",
      stock: 45,
      minStock: 8,
      status: "active" as const,
      rating: 4.8,
      image: "/placeholder.svg?key=steel1",
      sellerId: "seed-seller-4",
      sellerName: "National Steel Mart",
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
    CREATE TABLE IF NOT EXISTS market_payments (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      amount REAL NOT NULL,
      method TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
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

  const rows = await prisma.$queryRawUnsafe<Array<{ count: number | bigint }>>(
    "SELECT COUNT(*) AS count FROM market_products",
  )
  const count = rows.length ? Number(rows[0].count) : 0

  if (count === 0) {
    const now = new Date().toISOString()
    for (const product of getSeedProducts(now)) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO market_products
         (id, name, category, price, unit, stock, min_stock, status, rating, image, seller_id, seller_name, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

  marketTablesReady = true
}

export async function listProducts() {
  await ensureMarketTables()
  const rows = await prisma.$queryRawUnsafe<ProductRow[]>(
    "SELECT id, name, category, price, unit, stock, min_stock, status, rating, image, seller_id, seller_name, created_at, updated_at FROM market_products ORDER BY datetime(updated_at) DESC",
  )
  return rows.map(mapProduct)
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

export async function listOrders() {
  await ensureMarketTables()
  const rows = await prisma.$queryRawUnsafe<OrderRow[]>(
    "SELECT id, order_number, buyer_id, buyer_name, seller_id, seller_name, date, status, total, items_json, estimated_delivery, tracking_number FROM market_orders ORDER BY datetime(date) DESC",
  )
  return rows.map(mapOrder)
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

export async function listPayments() {
  await ensureMarketTables()
  const rows = await prisma.$queryRawUnsafe<PaymentRow[]>(
    "SELECT id, order_id, user_id, amount, method, status, created_at FROM market_payments ORDER BY datetime(created_at) DESC",
  )
  return rows.map(mapPayment)
}

export async function listDeliveries() {
  await ensureMarketTables()
  const rows = await prisma.$queryRawUnsafe<DeliveryRow[]>(
    `SELECT id, order_id, buyer_id, buyer_name, seller_id, seller_name, distributor_id, distributor_name, pickup_address, delivery_address, vehicle_number, vehicle_type, driver_name, driver_phone, status, eta_minutes, current_lat, current_lng, current_address, last_location_at, created_at, updated_at
     FROM market_deliveries
     ORDER BY datetime(updated_at) DESC`,
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
     ORDER BY datetime(created_at) DESC
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
     SET status = ?, distributor_id = ?, distributor_name = ?, vehicle_number = ?, vehicle_type = ?, driver_name = ?, driver_phone = ?, eta_minutes = ?, current_lat = ?, current_lng = ?, current_address = ?, last_location_at = ?, updated_at = ?
     WHERE id = ?`,
    next.status,
    next.distributorId,
    next.distributorName,
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
  paymentMethod: string
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
    const primarySeller = orderItems[0]
    const now = new Date()

    const order: Order = {
      id: crypto.randomUUID(),
      orderNumber: `ORD-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      buyerId: input.buyerId,
      buyerName: input.buyerName,
      sellerId: primarySeller?.sellerId || "",
      sellerName: primarySeller?.sellerName || "",
      date: now.toISOString(),
      status: "confirmed",
      total,
      items: orderItems,
      estimatedDelivery: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString(),
      trackingNumber: `TRK${Math.floor(100000000 + Math.random() * 900000000)}`,
    }

    const payment: Payment = {
      id: crypto.randomUUID(),
      orderId: order.id,
      userId: input.buyerId,
      amount: total,
      method: input.paymentMethod,
      status: "paid",
      createdAt: now.toISOString(),
    }

    const delivery = buildDefaultDeliveryFromOrder(order, now.toISOString())

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
       (id, order_id, user_id, amount, method, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      payment.id,
      payment.orderId,
      payment.userId,
      payment.amount,
      payment.method,
      payment.status,
      payment.createdAt,
    )

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
    brickPerPiece: avg(brickProducts, 8.5),
    cementPerBag: avg(cementProducts, 420),
    sandPerTon: avg(sandProducts, 1200),
    steelPerTon: avg(steelProducts, 62000),
    sourceCount: {
      bricks: brickProducts.length,
      cement: cementProducts.length,
      sand: sandProducts.length,
      steel: steelProducts.length,
    },
  }
}
