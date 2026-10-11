# ♻️ WasteWallet

> A scrap collection, pricing, and sorting platform for local scrap collectors (*kaalaankadaikaarar*) in India.

---

## 📌 Project Overview & Real-World Flow

WasteWallet digitizes the local scrap ecosystem with transparency, fair rates, and complete material traceability:

1. **Customer**: Signs in with Phone + OTP, uploads scrap photos, sets GPS location, and requests a pickup.
2. **Matching & Dispatch**: The system finds approved collectors in the customer's zone, scores them (rating, distance, current workload), and offers the job with a 60-second timer.
3. **Atomic Accept**: A single conditional MongoDB query ensures only one collector can accept.
4. **On-Site Weighing & Live Pricing**: Collector visits, weighs scrap (separate category by category or mixed mode), and captures a scale display photo. The server calculates amounts in integer paise using frozen rate snapshots.
5. **Customer Confirmation**: Customer locks the final weight and amount using a 6-digit confirmation OTP.
6. **Payment**: Cash payment marked by the collector (idempotent, no double payments).
7. **End-of-Day Store Batch**: Collector deposits the day's collection at the store using a batch QR code.
8. **Store Sorting & Loss Calculation**: Staff weigh the batch (computing loss %), sort categories (flagging e-waste and batteries for special handling), and route materials to registered recycling buyers.
9. **Admin Traceability**: Complete audit trail from household pickup ➔ weighed amount ➔ payment ➔ store batch ➔ sorted material ➔ buyer.

---

## 📊 Current Progress Status

| Phase / Step | Feature | Status | Description |
|---|---|---|---|
| **Step 1** | Scaffolding, Express, DB, Health Check | **DONE** | TypeScript Express app with Helmet, CORS, MongoDB Atlas, Winston logger, and `/health`. |
| **Step 2** | User & OTP Models, JWT Auth, Roles | **DONE** | Phone + OTP login, 5-min TTL auto-delete index, JWT verification, and role-based guards. |
| **Step 3** | Zones, Rate Cards, Admin Seed Script | **DONE** | GeoJSON Polygon zones (2dsphere index), scrap rate cards in integer paise, and `npm run seed`. |
| **Step 4** | Pickup Request & Zone Detection | **DONE** | Pickup creation, photo handling, automatic zone matching via `$geoIntersects`. |
| **Step 5** | Dispatch Engine & Atomic Accept | **DONE** | Collector scoring, 60s offer timeout job (`offerTimeout.job.ts`), atomic accept, and status transitions. |
| **Step 6** | On-Site Weighting, Pricing & Payment | **DONE** | Separate/mixed weighing, rate snapshots, customer 6-digit OTP locking, cash payment, and pickup completion. |
| **Step 7** | Batch, Sorting, Loss %, Buyer Routing | **DONE** | Store batch deposit QR, store weighing, loss % calculation, material sorting (special handling), and buyer routing. Tested (`npm run test:step7`). |
| **Step 8** | Ratings, Fraud Detection, Admin Reports | **DONE** | Customer & collector ratings, rolling average calculation, fraud alerts (loss % & mixed mode conversion), and admin reports. Tested (`npm run test:step8`). |
| **Step 9** | Socket.io Real-Time Updates | **DONE** | Live `weight.updated` events, "See separate price" request/response events, and `pickup.confirmed` lock events. Tested (`npm run test:step9`). |
| **Frontend F1** | Vite React PWA, AuthContext & Role Layouts | **DONE** | Mobile-first React PWA setup, Tailwind CSS styling, Phone + OTP auth, JWT persistence, role guarding, and customer/collector/admin layouts. |
| **Frontend F2** | Customer Screens: Request, Live Tracking, Live Price & OTP | **DONE** | Customer pickup request form with location presets, pickup history with status filters, and live tracking with Socket.io real-time weighing feed, "See separate price" toggle, and confirmation OTP dialog. |
| **Frontend F3** | Collector Screens: Incoming Offers, Job Card, Weighing & Cash | **DONE** | Collector incoming offer countdown (60s), job status transitions (accept ➔ on the way ➔ arrived), on-site itemized weight entry (separate & mixed), customer separate price response, confirmation OTP trigger, and cash settlement. Also includes end-of-day store batch deposit QR generator. |
| **Frontend F4** | Store Staff Screens & Vercel Deployment Guide | **DONE** | Store warehouse reception: QR code scanner, received gross scale weight input, automatic loss % computation, and material sorting stream allocation to buyers. Complete Vercel deployment instructions with SPA client routing configuration. |
| **Frontend F5** | Admin Dashboard: Live Metrics, Rate Cards, Zones & Fraud Anomaly Review | **NEXT UP** | Master operations control: live KPI cards, rate card price editor in paise, GeoJSON service zone visualizer, and fraud anomaly triage (high loss % & mixed mode conversion divergence). |

---

## 🚀 What We Are Building Next (Step F5: Operations & Fraud Audit Dashboard)

In the upcoming step, we will implement the **Admin Operations & Fraud Intelligence Hub**:
1. **Live Platform KPIs**: Total pickups, tons of scrap collected, total cash disbursed in rupees, active collector partner count, and flagged anomalies.
2. **Rate Card Price Editor**: Live update scrap rates per kilogram in paise (instantly updating active customer and collector calculations).
3. **Service Zone Polygon Inspector**: Visual zone boundary management (Chennai Central & Chennai South).
4. **Fraud Anomaly Triage**: Review collector weight divergence flags (>15% loss) and abnormal flat mixed mode conversion rates (>75%).

---

## 💻 How to Run Locally

### Prerequisites
- Node.js (LTS version)
- MongoDB Atlas database URI (or local MongoDB)

### 1. Clone & Install
```bash
git clone <your-github-repo-url>
cd WasteWallet/backend
npm install
```

### 2. Configure Environment (`.env`)
Create a `.env` file in the `backend/` directory:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/wastewallet?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d
```

### 3. Seed Initial Data
Seeds the Master Admin user, Chennai collection zones, and default scrap rate cards in paise:
```bash
npm run seed
```

### 4. Start Development Server
```bash
npm run dev
```

### 5. Verify Server Health
Visit `http://localhost:5000/health` in your browser or run:
```bash
curl http://localhost:5000/health
```
Expected response:
```json
{
  "success": true,
  "message": "WasteWallet API is healthy and running (TypeScript)",
  "data": {
    "uptime": 12.5,
    "timestamp": "...",
    "database": "connected"
  }
}
```

---

## 🔒 Safe Deployment Guidelines (GitHub & Render)

### ⚠️ Never Commit Secrets to GitHub!
- Keep your `.env` file private. It is already included in `.gitignore`.
- Run `git status` before committing to verify that `.env` is never listed under tracked files.

### 📤 Pushing to GitHub
```bash
git add .
git commit -m "docs: add project README and progress tracking"
git push origin main
```

### ☁️ Deploying Backend on Render (Free Web Service)
When deploying on Render:
1. **Service Type**: Web Service (Node.js runtime, NOT Docker).
2. **Root Directory**: `backend`
3. **Build Command**: `npm install && npm run build`
4. **Start Command**: `npm start`
5. **Environment Variables**: Add each key from your `.env` directly in the Render Dashboard (**Environment** tab):
   - `PORT`: (Render sets this automatically, but your code reads `process.env.PORT`)
   - `NODE_ENV`: `production`
   - `MONGO_URI`: Your MongoDB Atlas connection string
   - `JWT_SECRET`: A strong secret key
   - `JWT_EXPIRES_IN`: `7d`
   - `CLIENT_URL`: Your Vercel frontend URL (once deployed)
6. **MongoDB Atlas Network Access**: Because Render free tier uses dynamic outgoing IP addresses, ensure MongoDB Atlas Network Access has `0.0.0.0/0` (Allow access from anywhere) enabled, protected by a strong database user password.

---

## 📁 Repository Structure

```
wastewallet/
├── backend/
│   ├── src/
│   │   ├── config/        # Environment, Database, Cloudinary
│   │   ├── controllers/   # HTTP request & response handlers
│   │   ├── jobs/          # 10s offer timeout background worker
│   │   ├── middleware/    # Auth, Role guards, Multer upload, Central Error Handler
│   │   ├── models/        # Mongoose schemas (User, Zone, RateCard, Pickup, Payment...)
│   │   ├── routes/        # Express API endpoints (/api/v1)
│   │   ├── scripts/       # Database seed script
│   │   ├── services/      # Core business logic (pricing, dispatch, OTP, payments)
│   │   ├── types/         # TypeScript interfaces & types
│   │   ├── utils/         # Logger, ApiError, AsyncHandler, Constants
│   │   ├── app.ts         # Express server configuration
│   │   └── index.ts       # Application bootstrap & listener
│   ├── test/              # Step verification integration tests
│   ├── package.json
│   └── tsconfig.json
├── docs/
│   ├── PROMPT.md          # Full original prompt & requirements specification
│   └── PROGRESS.md        # Step-by-step progress tracking
└── README.md              # Project overview, setup, and deployment guide
```
