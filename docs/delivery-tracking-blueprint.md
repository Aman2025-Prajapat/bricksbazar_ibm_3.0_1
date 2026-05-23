# BricksBazar Delivery Tracking Blueprint

## Goal

Build a Swiggy-style tracking flow for heavy material orders using:

- maps for visualization
- live GPS updates from the assigned agent
- route and ETA data from a routing engine
- a strict delivery status workflow backed by logs

## Recommended MVP stack

- Next.js app routes for dashboards and APIs
- PostgreSQL or SQLite through the existing market tables
- React Leaflet + OpenStreetMap for rendering maps
- OpenRouteService for route distance, duration, and polyline
- Socket.IO or Supabase Realtime for buyer/distributor live updates

## Core tables

- `market_orders`
  - keeps order data, payment status, and delivery address
- `market_deliveries`
  - one delivery record per order
  - stores pickup/drop coordinates, ETA, vehicle details, current location, route summary, and milestone timestamps
- `market_delivery_assignments`
  - stores assignment details for the selected agent or distributor
- `market_delivery_locations`
  - append-only GPS pings from agent devices
- `market_delivery_status_logs`
  - timeline entries for buyer and distributor dashboards
- `market_delivery_route_stops`
  - supports multiple stop deliveries for future batching
- `market_delivery_otps`
  - OTP verification before handoff
- `market_delivery_proofs`
  - POD image, receiver signature, condition, and delivery completion data

## Status workflow

Canonical state progression:

`pending -> seller_confirmed -> packed -> assigned -> accepted -> picked_up -> in_transit -> near_delivery -> delivered`

Exception states:

- `failed`
- `cancelled`

Rules:

- only allowed transitions should be accepted by APIs
- every transition should create a `market_delivery_status_logs` row
- delivered orders should require proof or verified OTP

## API shape

Suggested route set:

- `POST /api/market/deliveries`
  - create delivery record when order becomes shippable
- `POST /api/market/deliveries/assign`
  - assign distributor or agent and cache pickup/drop route metadata
- `POST /api/market/deliveries/:deliveryId/status`
  - update workflow state after validating transition rules
- `POST /api/market/deliveries/:deliveryId/location`
  - ingest a GPS ping from agent web app or mobile app
- `GET /api/market/deliveries/:deliveryId`
  - delivery detail for dashboards
- `GET /api/market/deliveries/:deliveryId/route`
  - route polyline and remaining ETA
- `POST /api/market/deliveries/:deliveryId/proof`
  - upload proof of delivery

## Realtime events

Recommended event names:

- `delivery:location-updated`
- `delivery:status-updated`
- `delivery:eta-updated`
- `delivery:proof-uploaded`

Payload should include:

- `deliveryId`
- `orderId`
- latest status
- current coordinates
- remaining ETA and distance
- last updated timestamp

## Frontend modules

Buyer tracking page:

- timeline from `market_delivery_status_logs`
- map with pickup, destination, and agent markers
- route polyline and ETA summary
- proof of delivery panel after completion

Distributor dashboard:

- assigned deliveries list
- accept, pickup, in-transit, near-delivery, delivered actions
- compact live map for active deliveries
- proof upload and failure reporting

Agent page or mobile web page:

- start trip button
- browser geolocation permission
- background location sending with `navigator.geolocation.watchPosition`
- quick actions for pickup, near delivery, delivered

## Marker animation

Client-side marker movement should interpolate from the last coordinate to the newest coordinate over 1-2 seconds.

Important detail:

- map library renders the marker
- frontend animation moves it smoothly
- backend only sends discrete GPS updates

## ETA approach

MVP:

- on every meaningful location update, call route engine using current position and drop point
- persist `remaining_distance_km`, `eta_minutes`, and `last_eta_refresh_at`

Later improvements:

- traffic-aware ETA
- unloading time buffers
- heavy-load vehicle speed profiles
- multi-stop route optimization

## Recommended implementation phases

Phase 1:

- add workflow constants and DB support
- show static pickup and destination map
- display route line and status timeline

Phase 2:

- assign agent
- ingest live GPS updates
- broadcast realtime delivery events
- animate buyer-side marker and refresh ETA

Phase 3:

- proof of delivery
- OTP verification
- multi-stop deliveries
- route optimization and distributor analytics

## File-level direction

Suggested files to add or extend next:

- `lib/market-delivery-workflow.ts`
- `lib/market-delivery-routing.ts`
- `app/api/market/deliveries/...`
- `app/dashboard/buyer/orders/[orderId]/tracking/page.tsx`
- `app/dashboard/distributor/deliveries/page.tsx`
- `app/dashboard/agent/deliveries/[deliveryId]/page.tsx`

## Data integrity rules

- never overwrite the full location history with the newest point
- keep current location cached on `market_deliveries` for fast reads
- append every ping to `market_delivery_locations`
- append every status mutation to `market_delivery_status_logs`
- reject invalid state transitions
- require delivery proof for terminal success state
