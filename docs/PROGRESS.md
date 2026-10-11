# WasteWallet Project Progress

## 1. Project Overview & Current State

- **Language Used**: TypeScript (`.ts`) throughout backend. We strictly keep TypeScript.
- **Frontend Status**: Not yet started (as per plan, frontend begins after backend Step 9 is completed and tested).

---

## 2. Step-by-Step Status Breakdown

| Step | Title | Status | What is Done / What is Missing |
|---|---|---|---|
| **Step 1** | Project setup, Express, env, db (Atlas), logger, errorHandler, GET /health | **DONE** | Express app, Winston logger, environment config, MongoDB Atlas connection, central error handler, and `/health` are in place. |
| **Step 2** | User model, Otp model (TTL), phone + OTP login, JWT, auth + role middleware | **DONE** | `User.ts`, `Otp.ts` with TTL index, `auth.controller.ts`, `auth.service.ts`, `auth.ts` middleware, and `role.ts` middleware are created and tested (`test/testAuthFlow.ts`). |
| **Deploy Checkpoint A** | Deploy initial backend to Render + Atlas | **PENDING** | Can be deployed anytime or after Step 9. |
| **Step 3** | Zone, RateCard, admin seed script, admin APIs for rates and zones | **DONE** | `Zone.ts` & `RateCard.ts` models exist. Admin controller, services, and seed script (`npm run seed`) populate Chennai zones and standard paise rate cards. Tested (`test/testStep3.ts`). |
| **Step 4** | PickupRequest & PickupItem models, create pickup with Cloudinary upload, zone detection | **DONE** | `PickupRequest.ts` & `PickupItem.ts` models created. `pickup.service.ts` auto-detects zone via 2dsphere `$geoIntersects`, handles photo uploads, and creates pickup requests. Tested (`test/testStep4.ts`). |
| **Step 5** | dispatch.service (score, offer), atomic accept, offerTimeout job, status machine | **DONE** | `dispatch.service.ts` matching engine scores collectors, sets 60s timeout offer, atomic accept via conditional `findOneAndUpdate`, sequential status transitions (`accepted` ➔ `on_the_way` ➔ `arrived`), and `offerTimeout.job.ts` polls every 10s. Tested (`test/testStep5.ts`). |
| **Step 6** | weight entry (separate + mixed), pricing.service, customer OTP confirm, cash payment, complete pickup | **DONE** | On-site weighing in separate and mixed mode, rate snapshot in integer paise, 6-digit customer confirmation OTP lock, idempotent cash payment record, and completion transition (`confirmed` ➔ `paid` ➔ `completed`). Tested (`test/testStep6.ts`). |
| **Step 7** | Batch, SortedMaterial, Buyer, QR, loss %, sorting APIs, automatic buyer routing | **DONE** | Models (`Batch`, `SortedMaterial`, `Buyer`), deposit batch QR generation, store staff reception with loss % calculation, material sorting (special handling for e-waste & batteries), and automatic routing to matching buyers. Tested (`test/testStep7.ts`). |
| **Step 8** | Ratings, ranking, fraud alert, admin reports | **DONE** | Rating model with compound index, post-pickup reviews (1-5 stars & tags), rolling average rating calculation, fraud detection engine (loss % anomalies & excessive mixed mode conversion), and admin dashboard aggregations. Tested (`test/testStep8.ts`). |
| **Step 9** | Socket.io live amount and the separate-price request flow | **DONE** | Real-time WebSocket server, live `weight.updated` emissions to customer, "See separate price" request (`pricing.separate.requested`), collector accept (`pricing.separate.accepted`) or decline with reason (`pricing.separate.declined`), and `pickup.confirmed` lock notifications. Tested (`test/testStep9.ts`). |
| **Frontend F1** | Vite React PWA, Tailwind CSS, AuthContext, ProtectedRoute, Layouts | **DONE** | Mobile-first React setup with Vite, Tailwind CSS, PWA manifest, Axios client with auto JWT header, `AuthContext` (Phone + OTP), `ProtectedRoute` role guard, layout wrappers (`CustomerLayout`, `CollectorLayout`, `AdminLayout`), and `LoginPage`. Verified build bundle with zero errors. |
| **Frontend F2** | Customer Screens: Pickup Request with Map, Live Tracking, Live Weighing Amount & Confirmation OTP | **DONE** | Complete customer flow: `NewPickupPage` with preset Chennai zones & scrap category selector, `PickupHistoryPage` with status filters, and `LiveTrackingPage` with real-time Socket.io sync, live weighing bill feed, "See separate price" toggle request, and 6-digit confirmation OTP lock dialog. |
| **Frontend F3** | Collector Screens: Incoming Offers, Job Card, Weighing Screen, Scale Photo & OTP Lock | **DONE** | Collector flow complete: `CollectorHome` with online toggle & 60s incoming offer cards, `CollectorJobCard` with status transitions (`accepted` ➔ `on_the_way` ➔ `arrived`), on-site digital weighing form (separate & mixed), "Customer requested separate price" response alert, confirmation OTP trigger, and cash payment completion. Also built `CollectorBatchPage` for end-of-day QR generation. |
| **Frontend F4** | Store Staff Screens & Vercel Deployment Guide | **DONE** | Store warehouse reception: `StoreIntakePage` with batch QR scanning, gross scale received weight entry, automatic loss % computation, and `StoreSortingPage` with special handling segregation (e-waste & battery) and automatic industrial recycler buyer routing. Complete Vercel deployment setup with `vercel.json` SPA routing. |
| **Frontend F5** | Admin Dashboard: Live Metrics, Rate Cards, Zones & Fraud Anomaly Review | **DONE** | Master operations control: live KPI cards, interactive rate card price editor in paise (`AdminRatesPage`), GeoJSON service zone management, and fraud anomaly triage (`AdminFraudPage`) with partner suspension controls. Entire full-stack WasteWallet platform is 100% complete and verified! |

---

## 3. Existing Files & Their Purpose (One Line Each)

### Configuration & Entry
- `backend/src/index.ts`: Entry point; connects to DB, starts background timeout job, and starts HTTP server.
- `backend/src/app.ts`: Express application setup with CORS, Helmet, JSON body parsers, routes, and error handling.
- `backend/src/config/env.ts`: Central typed environment variable configuration loaded from `.env`.
- `backend/src/config/db.ts`: Mongoose connection to MongoDB Atlas with auto-retry and logging.
- `backend/src/config/cloudinary.ts`: Cloudinary SDK setup for photo uploads with local mock fallback.

### Middleware
- `backend/src/middleware/auth.ts`: Verifies JWT tokens from Authorization header and attaches `req.user`.
- `backend/src/middleware/role.ts`: Enforces role-based permissions (customer, collector, store_staff, buyer, admin).
- `backend/src/middleware/upload.ts`: Multer configuration for handling file uploads (scale and waste photos).
- `backend/src/middleware/errorHandler.ts`: Catches 404s and unhandled errors, sending a clean, standard JSON error response.

### Models
- `backend/src/models/User.ts`: Mongoose schema for all roles with 2dsphere geo-index and ratings.
- `backend/src/models/Otp.ts`: Stores OTPs with auto-deleting MongoDB TTL index (expires in 5 minutes).
- `backend/src/models/Zone.ts`: GeoJSON polygon defining service zones for geo-dispatch matching.
- `backend/src/models/RateCard.ts`: Per-category rates in integer paise, including the mixed waste rate.
- `backend/src/models/PickupRequest.ts`: Lifecycle tracking of scrap pickups, offers, pricing mode, and weights.
- `backend/src/models/PickupItem.ts`: Itemized categories, weights, and price snapshots for a pickup request.
- `backend/src/models/Payment.ts`: Payment records (cash/upi) with idempotency keys.

### Services (Business Logic)
- `backend/src/services/auth.service.ts`: Handles OTP verification, user creation, and JWT token issuance.
- `backend/src/services/otp.service.ts`: Generates 6-digit OTPs, hashes them, and checks attempt limits.
- `backend/src/services/dispatch.service.ts`: Finds online collectors in zone, calculates scores, offers jobs, atomic accept.
- `backend/src/services/pricing.service.ts`: Recalculates total cost in paise based on weight snapshots and rate cards.
- `backend/src/services/pickup.service.ts`: Manages pickup request creation, status changes, and item records.
- `backend/src/services/payment.service.ts`: Processes idempotent cash payments and locks amounts.
- `backend/src/services/admin.service.ts`: Business logic for admin stats, rate cards, and zone management.

### Controllers & Routes
- `backend/src/controllers/auth.controller.ts`: HTTP request handlers for login, OTP request, and verification.
- `backend/src/controllers/pickup.controller.ts`: HTTP request handlers for creating and managing pickups.
- `backend/src/controllers/collector.controller.ts`: HTTP request handlers for collector accepting jobs and entering weights.
- `backend/src/controllers/admin.controller.ts`: HTTP request handlers for admin managing zones and rate cards.
- `backend/src/routes/auth.routes.ts`: Maps `/api/v1/auth` endpoints.
- `backend/src/routes/pickup.routes.ts`: Maps `/api/v1/pickups` endpoints.
- `backend/src/routes/collector.routes.ts`: Maps `/api/v1/collector` endpoints.
- `backend/src/routes/admin.routes.ts`: Maps `/api/v1/admin` endpoints.
- `backend/src/routes/index.ts`: Combines all API route modules into `/api/v1`.

### Utilities, Scripts & Background Jobs
- `backend/src/jobs/offerTimeout.job.ts`: 10-second interval checker that reassigns expired 60s offers.
- `backend/src/scripts/seed.ts`: Seeds Master Admin, Chennai Central and South Zones, and 8 scrap rate cards.
- `backend/src/utils/logger.ts`: Logging setup for clean development and production logs.
- `backend/src/utils/constants.ts`: Shared constants including roles, categories, and pickup statuses.
- `backend/src/utils/ApiError.ts`: Custom error class for clean HTTP status code errors.
- `backend/src/utils/asyncHandler.ts`: Higher-order wrapper to catch errors in async route handlers.

---

## 4. How to Run & Test

1. Seed initial data (Admin, Zones, Rate Card):
   ```bash
   cd backend
   npm run seed
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

3. Test Health:
   ```bash
   curl http://localhost:5000/health
   ```

---

## 5. Next Planned Step: Frontend Step F1

- **Frontend Step F1: Vite, Tailwind, AuthContext, ProtectedRoute, Layouts**
  1. Initialize React PWA with Vite (`frontend/`).
  2. Setup Tailwind CSS with modern color palette and clean mobile-first styling.
  3. Create Axios API client configured with `VITE_API_URL` and automatic JWT Authorization header.
  4. Create `AuthContext` with phone + 6-digit OTP login, token persistence, and role management.
  5. Build `ProtectedRoute` for role-based route guarding.
  6. Build baseline layout wrappers: `CustomerLayout`, `CollectorLayout`, and `AdminLayout`.
