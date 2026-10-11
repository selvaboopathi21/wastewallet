# WasteWallet - Original Prompt & Specification

You are a senior MERN full-stack engineer and a patient teacher. I am a complete beginner. I want to UNDERSTAND what happens at every step, so build in very small steps, explain simply, and teach while building. Use easy English in comments and explanations.

# PROJECT: WasteWallet

A scrap collection and sorting platform for local scrap collectors ("kaalaankadaikaarar") in India.

## Real-world flow
1. Customer signs in (phone + OTP), uploads a waste photo (iron, copper wire, plastic, paper, e-waste), address and map location, optionally picks a pricing preference, then waits for confirmation.
2. The request goes to the best collector in the customer's zone (zone-wise matching, ranked by rating, like Zomato/Swiggy delivery partners).
3. Collector accepts, visits the home, weighs on the spot, and enters weights plus a photo of the scale display. The app calculates the amount from the rate card and shows it LIVE to the customer.
4. If the customer sees a low amount in mixed mode, they can tap "See separate price". This is a REQUEST to the collector, who can accept (weigh category by category) or decline with a reason.
5. Customer confirms the final weight and amount with a 6-digit OTP. After that the amount is LOCKED. Payment in MVP: cash, marked by the collector (online payment is a later upgrade).
6. Collector returns to his store and deposits the day's batch (batch QR code).
7. Store staff scan the QR, enter the received weight (system computes loss %), then separate the material and record category-wise sorted weights. E-waste, batteries and circuit boards are "special handling" and never mixed with normal categories.
8. The SYSTEM routes sorted material to the right buyer/recycler (never the customer): iron -> metal recycler, plastic -> plastic recycler, copper_wire -> metal recovery unit, ewaste -> e-waste recycler, battery -> battery handling unit (match using Buyer.acceptedMaterials).
9. Admin sees full traceability: pickup -> weight -> payment -> batch -> sorted material -> buyer.

Roles: customer, collector, store_staff, buyer, admin.
Principle: the customer side stays very simple. The real value is the collector, sorting and admin side. Customer education, recycling proof and complex price estimation are NOT core.

# MVP TECH STACK (free tier only; NO Docker, NO Redis, NO RabbitMQ for now)

Backend: Node.js LTS + Express, REST API under /api/v1, MongoDB Atlas free (M0) + Mongoose (2dsphere indexes), JWT auth with phone + OTP, Cloudinary (free) + multer for photos, Socket.io for live updates, Zod or Joi validation, helmet, cors, express-rate-limit (in-memory), dotenv, pino or winston, ESLint, a few Jest + Supertest tests.

Frontend: ONE React PWA with Vite, React Router, Axios, TanStack Query, Tailwind CSS, socket.io-client, react-i18next (English + Tamil), Leaflet + OpenStreetMap (no Google Maps), vite-plugin-pwa. Mobile-first.

Deploy: backend on Render (plain Node web service, NOT Docker), frontend on Vercel, database on MongoDB Atlas. Everything must run locally with just `npm install` and `npm run dev`.

# HOW THE MVP REPLACES REDIS AND RABBITMQ (important design)

- OTP: stored in a MongoDB collection with a TTL index (auto-delete after 5 min), max 3 attempts. In dev, print the OTP to the console. Never log OTPs in production.
- Nearest collector: store collector location as a GeoJSON Point on User, query with $near / $geoWithin on a 2dsphere index.
- Atomic accept: ONE conditional MongoDB update (findOneAndUpdate where status is still "offered" and offeredTo is this collector). Only one collector can win.
- 60 sec offer timeout: store offerExpiresAt in PickupRequest. A small checker (setInterval every 10 sec) finds expired offers and moves them to the next collector. State lives in MongoDB, NOT in memory, because Render free servers sleep and restart.
- Rate card: read from MongoDB directly.
- Rate limiting: express-rate-limit in memory.
- Notifications: Socket.io events plus a simple in-app notification list. No SMS/WhatsApp.

Keep each of these behind a service file (otp.service, dispatch.service, notification.service) with simple function names, so I can later swap the inside for Redis/RabbitMQ without touching controllers. DO NOT create redis.js, rabbitmq.js, workers/ or docker-compose.yml now. They are future upgrades.

# PROJECT STRUCTURE

wastewallet/
  backend/
    src/
      config/        db.js, cloudinary.js, env.js
      models/        User, Zone, RateCard, PickupRequest, PickupItem, Payment, Rating, Batch, SortedMaterial, Buyer, Otp, Notification
      controllers/   auth, pickup, collector, payment, rating, batch, admin
      routes/        index.js + one file per controller
      middleware/    auth.js, role.js, upload.js, validate.js, rateLimit.js, errorHandler.js
      services/      dispatch, pricing, otp, payment, notification, rating
      jobs/          offerTimeout.job.js (the setInterval checker)
      sockets/       index.js
      utils/         ApiError.js, asyncHandler.js, logger.js, constants.js
      app.js         (express setup only)
      index.js       (connect DB, start jobs and sockets, then listen)
    test/
    .env.example, .gitignore, eslint.config.js, package.json, README.md
  frontend/
    public/          manifest.json, icons/
    src/
      api/ (axios.js with base URL from VITE_API_URL and auto JWT header), context/ (AuthContext, SocketContext), hooks/ (useAuth, useSocket, useGeolocation), components/ (Button, StatusBadge, PhotoUpload, RatingStars, MapView), layouts/ (CustomerLayout, CollectorLayout, AdminLayout), pages/ (auth, customer, collector, store, admin), routes/ (AppRoutes, ProtectedRoute), i18n/ (en.json, ta.json), utils/ (formatPaise, formatDate), App.jsx, main.jsx
    .env.example (VITE_API_URL), vercel.json (SPA rewrite to index.html), index.html, vite.config.js, package.json
  README.md

Architecture rule: routes only map URLs, controllers only read the request and send the response, services hold ALL business logic, models only define schema. Never put business logic in controllers.
Create only the files needed for the current step. Do not create files for later steps.

# DATA MODELS (MongoDB)

- User: name, phone (unique), role, address, location (GeoJSON Point), zoneId, rating {avg, count}, isBlocked, language (en|ta). Collector-only: isApproved, isOnline, acceptanceRate, storeName.
- Otp: phone, codeHash, attempts, expiresAt (TTL index).
- Zone: name, polygon (GeoJSON Polygon, 2dsphere), isActive.
- RateCard: category, ratePerKgPaise, zoneId (optional), updatedBy, effectiveFrom. Includes a "mixed" category (always lower than the category average).
- PickupRequest: customerId, collectorId, zoneId, address, location, photos[], preferredTime, status, offeredTo[], currentOfferCollectorId, offerExpiresAt, customerPricingPreference (quick_mixed | best_price_separate | none), pricingMode (separate | mixed | hybrid), separateRequest {requested, requestedAt, status: pending|accepted|declined, declineReason}, totalPickupWeightKg, totalAmountPaise, customerConfirmed, otpVerifiedAt, scalePhotos[], timestamps.
- PickupItem: requestId, category (iron|plastic|copper_wire|paper|ewaste|battery|other|mixed), weightKg, ratePerKgPaise (SNAPSHOT of the rate at pickup time), amountPaise.
- Payment: requestId, method (cash|upi|wallet), amountPaise, status, idempotencyKey.
- Rating: requestId, fromUserId, toUserId, stars (1-5), tags[], comment; unique on (requestId + fromUserId).
- Batch: collectorId, pickupRequestIds[], qrCode, depositedWeightKg, receivedWeightKg, lossPercent, status, receivedBy.
- SortedMaterial: batchId, materialType (iron|plastic|copper_wire|paper|ewaste|battery|other), weightKg, isSpecialHandling, isDamaged, destinationBuyerId, status.
- Buyer: name, acceptedMaterials[], location, contact.
- Notification: userId, type, message, isRead.

Special handling = ewaste + battery (incl. mobiles, laptops, chargers, circuit boards). Normal = iron, plastic, copper_wire, paper.

# PRICING MODES AND WEIGHT MODEL

Price is ALWAYS category-based. Modes (per pickup, default "separate"):
- separate: each category weighed and priced by its own rate. Best price for the customer.
- mixed: one total weight x the admin-set "mixed" rate. Faster; lower rate because the collector takes the sorting risk.
- hybrid (build last, optional): valuable categories (copper_wire, ewaste, iron) weighed separately; low-value ones (plastic, paper) combined as "mixed".
The customer may state a preference. The collector sets the final mode on site. The customer confirms the amount with OTP.

Two-stage weight: Stage 1 = pickup weight at home (money is calculated ONLY from this). Stage 2 = sorted weight at the store (verification only; money never changes). They differ because of dust, moisture and non-recyclables, so store both. Compute loss % per batch AND per category. Use a higher loss tolerance for "mixed" mode.

# CORE BUSINESS RULES

1. Status machine (no skipping): pending -> offered -> accepted -> on_the_way -> arrived -> weighed -> confirmed -> paid -> completed. Also cancelled, expired. Enforce ALL transitions in ONE function.
2. Dispatch: find the zone from the customer location -> online, approved, unblocked collectors in that zone -> score = distance + rating + acceptanceRate + current workload -> offer to the best one with offerExpiresAt = now + 60 sec -> if no response, the job checker offers to the next -> if all decline or time out, mark expired and notify the customer.
3. Accept is atomic via one conditional MongoDB update. Only one collector wins.
4. Pricing: amount = weight x rate snapshot, integer paise only (never floats). Total = sum of items. Never trust amounts from the client; always recompute on the server. Snapshot the rate for every item, including "mixed".
5. Live amount: whenever the collector saves weights, the server recalculates and emits Socket.io weight.updated to the customer.
6. "See separate price" request: allowed only while status is "weighed", not yet confirmed, and mode is mixed/hybrid. POST /pickups/:id/request-separate sets separateRequest.status = pending and emits pricing.separate.requested to the collector. The collector can accept (switch to separate and re-enter weights; old PickupItems are replaced, the total is recalculated, and the customer sees the new amount and the difference live) or decline with a reason (e.g. "only 1 kg, not worth sorting"). After the customer confirms with OTP, amount and mode are LOCKED.
7. Customer confirms with a 6-digit OTP (5 min expiry, max 3 attempts).
8. Payment (MVP): cash. Collector marks paid, customer confirms. Make payment.service replaceable so Razorpay test mode can be added later. Idempotent: no double payment.
9. Ratings: only completed and paid pickups, once per side. Customer rates collector (1-5 + tags like "fair weight", "on time"). Collector may rate customer. Low average gives a warning, then a block. High rating gives priority jobs and a badge.
10. Batch: collector deposits at end of day, QR generated; store staff scan the QR and enter received weight -> lossPercent = (deposited - received) / deposited x 100 -> staff enter category-wise sorted weights. E-waste and batteries get isSpecialHandling = true, never mixed with normal categories; damaged items can be marked. Then route to buyers automatically.
11. Fraud alert: flag a collector whose average loss % (overall or per category) is far above the zone average, or who often pushes customers into mixed mode.
12. Admin: manage rates (incl. mixed) and zones, approve/block collectors, daily/monthly reports, material totals, collector performance, all records.

# SOCKET.IO EVENTS
weight.updated -> customer | pricing.separate.requested -> collector | pricing.separate.accepted / declined -> customer | pickup.status.changed -> both | collector.location -> customer | pickup.confirmed -> collector

# SECURITY AND QUALITY
Validate every input. Role-check every route. Consistent JSON response {success, data, message}. Central error handler. Pagination on list APIs. Indexes on queried fields. All secrets in .env, with a complete .env.example. Short WHY-comments in easy English.

# FRONTEND RULES
- Start the frontend ONLY after backend Step 9 is tested.
- No business logic or price calculation in the frontend. The server is the source of truth; the frontend only displays. Convert paise to rupees only for display.
- Handle loading, error and empty states on every screen.
- ProtectedRoute does role-based access, like backend role.js.
- Customer screens: request pickup (photo, address, map location, time, pricing preference), track pickup, live amount with a "See separate price" button (only in mixed/hybrid before confirmation), confirm with OTP, history, rate collector.
- Collector screens: job feed, active pickup, weight entry (mode switch, category, weight, scale photo), separate-price request banner (accept/decline), earnings, deposit batch.
- Store screens: receive batch (QR scan), sort materials. Admin screens: dashboard, rates (incl. mixed rate), zones, collectors, reports.

# DEPLOYMENT RULES (Render + Vercel, no Docker)
- Backend reads PORT from env (Render sets it). Add GET /health. package.json has "start": "node src/index.js".
- CORS allows only the Vercel URL (env FRONTEND_URL) plus localhost for dev. Socket.io CORS the same.
- Atlas: allow network access from anywhere (0.0.0.0/0) because Render IPs change. Explain the risk and tell me to use a strong DB password.
- Frontend uses VITE_API_URL. vercel.json rewrites all routes to index.html so page refresh works.
- Render free servers sleep when idle, so the first request may be slow. Never keep important state in memory.
- Explain each deploy step click by click.

# HOW TO WORK (MOST IMPORTANT)
I want to see and understand each coding round. Work in SMALL STEPS. For EVERY step:
1. "Plan": 5 lines on what we build and why.
2. Build only that step.
3. "What each file does": 1 line per file in very simple words.
4. "How the request flows": a small text diagram (route -> middleware -> controller -> service -> model).
5. "Run it": exact commands.
6. "Test it": Postman/curl examples (browser steps for frontend) with the expected response.
7. "Check yourself": 2 short questions to confirm I understood.
8. STOP and WAIT for me to say "next". Never start the next step on your own.

Backend steps:
- Step 1: project setup, Express, config/env.js, db.js (Atlas), logger, errorHandler, GET /health.
- Step 2: User model, Otp model (TTL), phone + OTP login, JWT, auth.js + role.js middleware.
- DEPLOY CHECKPOINT A: deploy this small backend to Render with Atlas, so I learn deployment early.
- Step 3: Zone, RateCard, admin seed script, admin APIs for rates and zones.
- Step 4: PickupRequest and PickupItem models, create pickup with Cloudinary photo upload, zone detection.
- Step 5: dispatch.service (score, offer), atomic accept, offerTimeout job, status machine.
- Step 6: weight entry (separate + mixed), pricing.service, customer OTP confirm, cash payment, complete pickup.
- Step 7: Batch, SortedMaterial, Buyer, QR, loss %, sorting APIs, automatic buyer routing.
- Step 8: ratings, ranking, fraud alert, admin reports.
- Step 9: Socket.io live amount and the separate-price request flow.
- Step 10 (optional): hybrid mode.

Frontend steps (after backend Step 9 is tested):
- F1: Vite, Tailwind, login (phone + OTP), AuthContext, ProtectedRoute, layouts.
- F2: customer screens. F3: collector screens. F4: store and admin screens.
- F5: Socket.io live updates, Tamil/English toggle, PWA.
- DEPLOY CHECKPOINT B: deploy the frontend to Vercel and connect it to the Render backend.

Future upgrades (DO NOT build now; just list them at the very end): Redis (OTP, cache, geo, lock), RabbitMQ (dispatch, timeout, payment retry), Razorpay test mode, SMS/WhatsApp, Docker, MCP assistant.
