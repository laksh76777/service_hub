# ServiceHub — India's Local Service Booking & Work Verification Platform

[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19.x-blue.svg)](https://react.dev/)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB-Atlas-forestgreen.svg)](https://www.mongodb.com/atlas)
[![Firebase Auth](https://img.shields.io/badge/Firebase-Auth-orange.svg)](https://firebase.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-cyan.svg)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

ServiceHub is a production-grade, full-stack home service marketplace designed specifically for Indian domestic requirements (Bengaluru, Delhi NCR, Mumbai, Hyderabad, Pune). It solves trust and pricing unpredictability through **transparent digital estimates**, **two-step OTP arrival/completion validation**, **photo work evidence verification**, **escrow-style payment holds**, **30-day warranty backing**, and **practical AI service classification**.

---

## Key Features & Production Workflows

### 1. Booking State Machine & Two-Step OTP
Service appointments transition through a strictly enforced finite state machine with role-based validation:
```
REQUESTED ──> ACCEPTED ──> SCHEDULED ──> TECHNICIAN_ARRIVED (Start OTP)
                                                 │
                                                 ▼
COMPLETED <── CUSTOMER_VERIFIED <── COMPLETION_PENDING <── IN_PROGRESS
     ▲              ▲                       │
     │              │                       ▼
     └──────────────┴───────────────── DISPUTED (Arbitration)
```
- **Start OTP**: 6-digit one-time password generated upon dispatch and validated on-site before physical work begins.
- **Completion OTP**: Generated when technician marks work complete; customer verifies physical deliverables before sharing.

### 2. Digital Estimates & Customer Approvals
- Technicians generate itemized digital estimates (Labor, Parts, Service, Other).
- **Zero Surprise Charges**: Only customer-approved estimates become billable. Technicians cannot mark estimates as approved.
- Additional scope discovered mid-job requires a secondary supplemental estimate approved by the homeowner.

### 3. GST-Compliant Invoices & Payment Gateway
- Automatic invoice generation with 18% GST calculation and itemized breakdown.
- Dual-mode payment architecture:
  - `PAYMENT_MODE=demo`: Realistic escrow payment simulation with test cards, UPI IDs, and NetBanking.
  - `PAYMENT_MODE=razorpay`: Production integration with Razorpay orders and webhook signature verification.
- Idempotent payment processing with immutable ledger transaction logs.

### 4. Work Evidence Photo Gallery (GridFS)
- Before and after high-resolution work photos stored securely in MongoDB GridFS with MIME validation (`image/jpeg`, `image/png`, `image/webp`).
- Homeowners review photo evidence directly in their job console.

### 5. 30-Day Warranties & Dispute Arbitration
- Providers issue 30 to 60-day warranty certificates upon job completion.
- Customers can file warranty claims or escalate unresolved quality issues into formal disputes.
- Administrators arbitrate disputes with full audit trail history and refund options.

### 6. Isolated AI Service Request Classification (Phase 11)
- Natural language classification converts symptom descriptions into structured service recommendations.
- **Strict Non-Binding Guardrail**: AI output is an advisory recommendation only. Never automatically diagnoses a technical fault, never approves a booking, and never sets final pricing.
- Resilient fallback ensures standard customer booking flow continues seamlessly if external AI models are unavailable.

### 7. Background Jobs & Security Hardening (Phase 10)
- BullMQ and Redis queue manager for notification dispatch, invoice PDF generation, warranty reminders, and stale OTP cleanup.
- Automatic in-memory fallback if Redis is offline.
- Helmet security headers (`nosniff`, `HSTS`, `XSS Protection`), API and Auth rate limiting, recursive NoSQL injection sanitization (`$` and `.` stripping), and request payload limits (`1mb`).

---

## Pre-Configured Demo Accounts

For rapid demonstration and testing, the following accounts are pre-seeded in the database:

| Role | Email | Password | Details |
|---|---|---|---|
| **System Admin** | `abc@gmail.com` | `123456` | Platform management & dispute arbitration |
| **Customer** | `laksh@gmail.com` | `123456` | Laksh Suthar (Indiranagar, Bengaluru) |
| **AC Technician** | `ac.tech@servicehub.demo` | `123456` | Rahul Sharma (CoolCare Services) |
| **Plumber** | `plumber@servicehub.demo` | `123456` | Imran Khan (QuickFix Plumbing) |
| **Electrician** | `electrician@servicehub.demo` | `123456` | Arjun Patel (PowerFix Electricals) |

> [!NOTE]
> Demo accounts authenticate via Firebase Authentication. Use the **1-Click Quick Fill** buttons on the `/login` screen to instantly sign in.

---

## Directory Structure

```
service-platform/
├── backend/
│   ├── scripts/                # Automated verification test suites
│   │   ├── seed-demo-data.js
│   │   ├── test-phase8-payments.js
│   │   ├── test-phase9-warranty-disputes-reviews-notifications.js
│   │   ├── test-phase11-ai-classification.js
│   │   └── test-production-readiness.js
│   ├── src/
│   │   ├── config/             # Database, Redis, Firebase, and environment
│   │   ├── controllers/        # Express request controllers
│   │   ├── jobs/               # BullMQ queues and workers
│   │   ├── middleware/         # Auth, Security (Helmet/Rate-limit/Sanitize), Error
│   │   ├── models/             # Mongoose schemas (Booking, Invoice, Estimate, etc.)
│   │   ├── routes/             # Express API routes
│   │   ├── services/           # Business logic & isolated AI service
│   │   ├── utils/              # State machine, logger, constants
│   │   ├── app.js              # Express application setup
│   │   └── server.js           # Server lifecycle & graceful shutdown
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── booking/        # Timelines, modals, evidence, warranty, dispute
│   │   │   ├── common/         # Buttons, cards, loaders, empty states, Navbar
│   │   │   └── layout/         # Shell and notification bell
│   │   ├── pages/              # Landing, Dashboard, Provider, BookingDetail, Login
│   │   ├── services/           # Axios client & API methods
│   │   ├── context/            # AuthContext (Firebase + MongoDB synchronization)
│   │   ├── App.jsx             # React Router routing tree
│   │   ├── index.css           # Tailwind v4, glassmorphism, Google Fonts
│   │   └── main.jsx            # Application entry point
│   ├── .env.example
│   └── package.json
├── docs/
│   └── DEPLOYMENT.md           # Production deployment & infrastructure guide
├── .gitignore
└── README.md
```

---

## Quick Start Guide

### 1. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Fill in MongoDB Atlas URI and Firebase credentials in .env
npm run seed:demo
npm run dev
```

### 2. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
# Fill in Firebase client keys in .env
npm run dev
```

The application will be accessible at:
- **Client**: `http://localhost:5173`
- **API Server**: `http://localhost:5000`
- **API Health**: `http://localhost:5000/api/health`

---

## Automated Test Suites

Run the complete suite of verification scripts directly from the `backend/` directory:

| Test Command | Scope |
|---|---|
| `npm run test:production` | **Master 20-Point Production Readiness Suite** (54/54 Checks) |
| `npm run test:phase11` | AI Service Request Classification (Valid, Ambiguous, Empty, Malformed) |
| `npm run test:phase9` | Warranty, Disputes, Reviews, and In-App Notifications |
| `npm run test:phase8` | Authoritative Pricing, Demo Escrow Gateway, Idempotency |
| `npm run test:phase7` | Estimates, Customer Approvals, Additional Scope, Invoices |
| `npm run test:phase6` | GridFS Photo Evidence Upload and Two-Step OTP Workflows |

---

## Production Deployment

Detailed production deployment guides for Docker, PM2, and static cloud hosting are available in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## License
MIT License. Developed for ServiceHub.
