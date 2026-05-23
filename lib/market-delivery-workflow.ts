export const MARKET_DELIVERY_STATUSES = [
  "pending",
  "seller_confirmed",
  "packed",
  "assigned",
  "accepted",
  "picked_up",
  "in_transit",
  "near_delivery",
  "delivered",
  "failed",
  "cancelled",
] as const

export type MarketDeliveryStatus = (typeof MARKET_DELIVERY_STATUSES)[number]

export type MarketDeliveryTimelineStep = {
  id: MarketDeliveryStatus
  label: string
  description: string
}

export const MARKET_DELIVERY_TIMELINE: MarketDeliveryTimelineStep[] = [
  {
    id: "pending",
    label: "Order Placed",
    description: "Buyer placed the order and delivery has not been prepared yet.",
  },
  {
    id: "seller_confirmed",
    label: "Seller Confirmed",
    description: "Seller accepted the order and is preparing the material.",
  },
  {
    id: "packed",
    label: "Packed",
    description: "Material is packed and ready for pickup.",
  },
  {
    id: "assigned",
    label: "Assigned to Distributor",
    description: "A truck or delivery agent has been assigned to the order.",
  },
  {
    id: "accepted",
    label: "Driver Accepted",
    description: "Assigned delivery agent accepted the trip.",
  },
  {
    id: "picked_up",
    label: "Picked Up",
    description: "Material has been loaded and pickup is complete.",
  },
  {
    id: "in_transit",
    label: "In Transit",
    description: "Delivery is actively moving toward the destination.",
  },
  {
    id: "near_delivery",
    label: "Near Delivery",
    description: "Truck is close to the destination and unloading can be prepared.",
  },
  {
    id: "delivered",
    label: "Delivered",
    description: "Delivery is complete and proof of delivery can be shown.",
  },
  {
    id: "failed",
    label: "Delivery Failed",
    description: "Delivery attempt failed and requires manual follow-up.",
  },
  {
    id: "cancelled",
    label: "Cancelled",
    description: "Order or delivery was cancelled before completion.",
  },
]

export const MARKET_DELIVERY_PROGRESS_SEQUENCE: MarketDeliveryStatus[] = [
  "pending",
  "seller_confirmed",
  "packed",
  "assigned",
  "accepted",
  "picked_up",
  "in_transit",
  "near_delivery",
  "delivered",
]

const DELIVERY_TRANSITIONS: Record<MarketDeliveryStatus, MarketDeliveryStatus[]> = {
  pending: ["seller_confirmed", "cancelled"],
  seller_confirmed: ["packed", "cancelled"],
  packed: ["assigned", "cancelled"],
  assigned: ["accepted", "cancelled"],
  accepted: ["picked_up", "cancelled"],
  picked_up: ["in_transit", "failed"],
  in_transit: ["near_delivery", "failed"],
  near_delivery: ["delivered", "failed"],
  delivered: [],
  failed: ["assigned", "cancelled"],
  cancelled: [],
}

export const TERMINAL_DELIVERY_STATUSES: MarketDeliveryStatus[] = [
  "delivered",
  "failed",
  "cancelled",
]

export function getDeliveryStatusLabel(status: MarketDeliveryStatus): string {
  return MARKET_DELIVERY_TIMELINE.find((step) => step.id === status)?.label ?? status
}

export function getAllowedDeliveryTransitions(
  status: MarketDeliveryStatus,
): MarketDeliveryStatus[] {
  return DELIVERY_TRANSITIONS[status] ?? []
}

export function isTerminalDeliveryStatus(status: MarketDeliveryStatus): boolean {
  return TERMINAL_DELIVERY_STATUSES.includes(status)
}

export function getCompletedDeliverySteps(status: MarketDeliveryStatus): MarketDeliveryTimelineStep[] {
  const currentIndex = MARKET_DELIVERY_PROGRESS_SEQUENCE.indexOf(status)
  if (currentIndex !== -1) {
    return MARKET_DELIVERY_PROGRESS_SEQUENCE.slice(0, currentIndex + 1)
      .map((stepId) => MARKET_DELIVERY_TIMELINE.find((step) => step.id === stepId))
      .filter(Boolean) as MarketDeliveryTimelineStep[]
  }

  const currentStep = MARKET_DELIVERY_TIMELINE.find((step) => step.id === status)
  return currentStep ? [currentStep] : []
}

export function canTransitionDeliveryStatus(
  from: MarketDeliveryStatus,
  to: MarketDeliveryStatus,
): boolean {
  return getAllowedDeliveryTransitions(from).includes(to)
}
