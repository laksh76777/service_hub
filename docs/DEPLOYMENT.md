# ServiceHub Production Deployment & Operations Guide

This guide details the complete infrastructure setup, security configurations, environment variables, deployment options, webhook configurations, and troubleshooting procedures for the **ServiceHub** platform.

---

## 1. System Architecture Overview

ServiceHub is an India-oriented, end-to-end Local Service Booking & Work Verification Platform built on a resilient, decoupled architecture:

```
                      +-----------------------------+
                      |   Client: React + Vite SPA  |
                      |  (Tailwind v4, Google Fonts)|
                      +--------------+--------------+
                                     |  HTTPS (CORS + Helmet)
                                     v
                      +-----------------------------+
                      |   Backend: Node.js + Express|
                      |  Rate Limiting, Sanitization|
                      +-------+------+-------+------+
                              |      |       |      |
          +-------------------+      |       |      +--------------------+
          |                          |       |                           |
          v                          v       v                           v
+-------------------+      +-------------+ +------------------+ +-----------------+
|  MongoDB Atlas    |      |Firebase Auth| | BullMQ / Redis   | | Payment Gateway |
|  Mongoose ODM     |      |Identity SDK | | Async Queues &   | | Razorpay / Demo |
|  GridFS Evidence  |      |Admin Token  | | In-memory Fallbk | | Sync DB Ledger  |
+-------------------+      +-------------+ +------------------+ +-----------------+
```

---

## 2. Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Description | Example / Allowed Values |
|---|---|---|
| `PORT` | API Server Port | `5000` |
| `CLIENT_URL` | Frontend origin for CORS policy | `http://localhost:5173` or production domain |
| `MONGODB_URI` | MongoDB Atlas cluster connection string | `mongodb+srv://<user>:<password>@cluster.mongodb.net` |
| `MONGODB_DB_NAME` | Primary database name | `servicehub` |
| `FIREBASE_PROJECT_ID`| Firebase project identifier | `your-firebase-project-id` |
| `FIREBASE_API_KEY` | Firebase Web API key | `AIzaSy...` |
| `FIREBASE_CLIENT_EMAIL`| Optional: Service account client email | `firebase-adminsdk@...` |
| `FIREBASE_PRIVATE_KEY`| Optional: Service account private key | `-----BEGIN PRIVATE KEY-----\n...` |
| `PAYMENT_MODE` | Payment processing gateway | `demo` or `razorpay` |
| `RAZORPAY_KEY_ID` | Razorpay Merchant Key ID | `rzp_test_...` |
| `RAZORPAY_KEY_SECRET` | Razorpay Merchant Secret Key | `<razorpay_secret>` |
| `RAZORPAY_WEBHOOK_SECRET`| Secret used to verify Razorpay webhooks | `<webhook_secret>` |
| `REDIS_URL` | Redis connection URL | `redis://default:<pass>@host:6379` |
| `REDIS_HOST` | Redis hostname (if not using URL) | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `GEMINI_API_KEY` | Optional: Google Gemini API key for AI assist | `AIzaSy...` |
| `NODE_ENV` | Environment identifier | `production` or `development` |

### Frontend (`frontend/.env`)

| Variable | Description | Example |
|---|---|---|
| `VITE_API_URL` | Backend API base URL | `http://localhost:5000/api` or `/api` |
| `VITE_FIREBASE_API_KEY` | Firebase client API key | `AIzaSy...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase client Auth domain | `project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID | `your-project-id` |
| `VITE_FIREBASE_STORAGE_BUCKET`| Firebase storage bucket | `project.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID`| FCM Sender ID | `1234567890` |
| `VITE_FIREBASE_APP_ID` | Firebase Web App ID | `1:1234567890:web:abcdef` |

---

## 3. Step-by-Step Local Setup

### Prerequisites
- Node.js 18.x or 20.x+
- npm 9.x+
- MongoDB Atlas cluster (or local MongoDB 6.0+)
- Redis (optional: system has automatic in-memory fallback if Redis is offline)

### Step 1: Install Backend & Frontend Dependencies
```bash
# In project root
cd backend
npm install

cd ../frontend
npm install
```

### Step 2: Configure Environment Files
Copy `.env.example` templates to `.env`:
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```
Fill in your database connection string and Firebase API keys.

### Step 3: Seed Indian Marketplace Data & Demo Accounts
```bash
cd backend
npm run seed:demo
```
This initializes 8 Indian service categories, 20+ services, and 5 pre-configured demo roles:
- **System Admin**: `abc@gmail.com`
- **Customer**: `laksh@gmail.com`
- **AC Technician**: `ac.tech@servicehub.demo`
- **Plumber**: `plumber@servicehub.demo`
- **Electrician**: `electrician@servicehub.demo`
*(Password: `123456` in Firebase Auth)*

### Step 4: Run Development Servers
```bash
# Terminal 1: Backend API (Port 5000)
cd backend
npm run dev

# Terminal 2: Frontend Vite Client (Port 5173)
cd frontend
npm run dev
```

---

## 4. Cloud Infrastructure Setup

### A. MongoDB Atlas Setup
1. Create an M0 Free Tier (or higher) cluster on MongoDB Atlas (AWS Mumbai `ap-south-1` recommended for lowest latency).
2. Create a Database User with read/write privileges on `servicehub`.
3. Configure Network Access: Add `0.0.0.0/0` (or your static production server IPs).
4. Set connection options in `MONGODB_URI`:
   `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority`
5. The backend automatically manages GridFS buckets (`fs.files`, `fs.chunks`) for work evidence photos.

### B. Firebase Authentication Setup
1. Open the [Firebase Console](https://console.firebase.google.com) and create or select your project.
2. Enable **Authentication** -> **Sign-in method** -> **Email/Password**.
3. Under **Project Settings** -> **General**, copy your Web SDK config into `frontend/.env`.
4. Under **Project Settings** -> **Service accounts**, generate a private key and set `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY` in `backend/.env`.

### C. Razorpay Payment Gateway Setup
1. Register on the [Razorpay Dashboard](https://dashboard.razorpay.com).
2. Generate API Keys under **Settings** -> **API Keys**.
3. Set `PAYMENT_MODE=razorpay` in `backend/.env`.
4. Provide `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.
5. For local testing without real bank accounts, keep `PAYMENT_MODE=demo` (uses realistic Indian Rupee escrow simulation).

### D. Redis & BullMQ Setup
1. Deploy a Redis instance (e.g., Redis Cloud, Upstash, AWS ElastiCache).
2. Supply `REDIS_URL` in `backend/.env`.
3. If Redis is unavailable or fails at runtime, ServiceHub's `queueManager.js` smoothly executes background jobs in-process without crashing the application.

---

## 5. Webhook Configuration (Razorpay)

1. In the Razorpay Dashboard, navigate to **Settings** -> **Webhooks** -> **Add New Webhook**.
2. **Webhook URL**: `https://your-domain.com/api/payments/webhook`
3. **Secret**: Enter a secure random string and set it as `RAZORPAY_WEBHOOK_SECRET` in `backend/.env`.
4. **Active Events**: Select:
   - `order.paid`
   - `payment.authorized`
   - `payment.captured`
   - `payment.failed`
5. The backend verifies SHA-256 HMAC signatures on all incoming webhooks and guarantees idempotent execution.

---

## 6. Production Deployment

### Option 1: Docker Deployment
```dockerfile
# Backend Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["node", "src/server.js"]
```

### Option 2: PM2 Process Manager (Node.js)
```bash
cd backend
npm ci --only=production
pm2 start src/server.js --name servicehub-api -i max
pm2 save
pm2 startup
```

### Option 3: Static Frontend Hosting (Vercel / Cloudflare Pages / Netlify / S3)
```bash
cd frontend
npm ci
npm run build
# Deploy the generated dist/ folder as a Single Page App (SPA)
# Ensure all routes redirect to /index.html
```

---

## 7. Troubleshooting & Health Monitoring

### Health Endpoints
- **API Liveness**: `GET /api/health` -> Returns `200 OK` and `{ status: "ok" }`.
- **Database Connectivity**: `GET /api/test/db-health` -> Verifies active MongoDB Atlas connection.

### Common Issues & Resolutions

| Issue | Root Cause | Resolution |
|---|---|---|
| `401 Unauthorized` on `/api/bookings` | Missing or expired Firebase ID token | Check client auth state or sign in again via `/login`. |
| `CORS policy violation` | Client origin not whitelisted | Add client domain to `CLIENT_URL` in `backend/.env`. |
| `Payload Too Large (413)` | Request exceeds 1MB limit | Work evidence photos must be compressed before upload or uploaded via multipart endpoint `/api/bookings/:id/files`. |
| `Rate limit exceeded (429)` | Exceeded 200 requests / 15 minutes | Relax `RATE_LIMIT_WINDOW_MS` in `security.js` or configure trusted proxy IPs. |
| Redis Connection Error | Port 6379 closed or network unreachable | Application automatically falls back to in-memory processing. Check `REDIS_URL`. |
