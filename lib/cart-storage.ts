export type StoredCartItem = {
  productId: string
  name: string
  category: string
  price: number
  quantity: number
  unit: string
  supplier: string
  image: string
  inStock: boolean
}

const CART_STORAGE_KEY = "bricksbazaar_cart_v1"

function isBrowser() {
  return typeof window !== "undefined"
}

function isValidItem(value: unknown): value is StoredCartItem {
  if (!value || typeof value !== "object") return false
  const item = value as Partial<StoredCartItem>
  return (
    typeof item.productId === "string" &&
    typeof item.name === "string" &&
    typeof item.category === "string" &&
    typeof item.price === "number" &&
    Number.isFinite(item.price) &&
    typeof item.quantity === "number" &&
    Number.isInteger(item.quantity) &&
    item.quantity > 0 &&
    typeof item.unit === "string" &&
    typeof item.supplier === "string" &&
    typeof item.image === "string" &&
    typeof item.inStock === "boolean"
  )
}

export function loadCart(): StoredCartItem[] {
  if (!isBrowser()) return []

  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isValidItem)
  } catch {
    return []
  }
}

export function saveCart(items: StoredCartItem[]) {
  if (!isBrowser()) return
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
}

export function clearCart() {
  if (!isBrowser()) return
  window.localStorage.removeItem(CART_STORAGE_KEY)
}

export function addToCart(item: Omit<StoredCartItem, "quantity">, quantity = 1) {
  if (!Number.isInteger(quantity) || quantity <= 0) return loadCart()

  const current = loadCart()
  const existingIndex = current.findIndex((entry) => entry.productId === item.productId)
  let next: StoredCartItem[]

  if (existingIndex >= 0) {
    next = current.map((entry, index) =>
      index === existingIndex
        ? {
            ...entry,
            quantity: entry.quantity + quantity,
            price: item.price,
            unit: item.unit,
            supplier: item.supplier,
            image: item.image,
            inStock: item.inStock,
          }
        : entry,
    )
  } else {
    next = [...current, { ...item, quantity }]
  }

  saveCart(next)
  return next
}
