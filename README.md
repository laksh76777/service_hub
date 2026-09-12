# ServiceHub - Local Service Booking & Work Verification Platform

ServiceHub is a production-grade local service booking and work verification platform built with a modern, decoupled full-stack architecture.

## Phase 1 Overview

Phase 1 establishes the clean project architecture, foundational frontend (React + Vite + Tailwind CSS + React Router + Axios), and the Express REST API backend with modular separation of concerns.

### Tech Stack
- **Frontend**: React, Vite, JavaScript, Tailwind CSS, React Router, Axios
- **Backend**: Node.js, Express.js, JavaScript, REST API
- **Upcoming Phases**: MongoDB Atlas (Phase 2), Firebase Auth (Phase 3), Razorpay (Phase 8), GridFS, Redis/BullMQ.

## Project Structure

`	ext
service-platform/
├── client/                     # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/         # Reusable UI components
│   │   │   └── layout/         # Shell layout (Navbar, Footer, Outlet)
│   │   ├── pages/              # Placeholder pages
│   │   ├── services/           # Axios API client
│   │   ├── App.jsx             # Route definitions
│   │   └── main.jsx            # React root mount
├── server/                     # Backend (Node.js + Express)
│   ├── src/
│   │   ├── config/             # Environment configuration
│   │   ├── controllers/        # Request handlers
│   │   ├── middleware/         # Error and 404 middleware
│   │   ├── models/             # Reserved for Phase 2
│   │   ├── routes/             # Express API routes
│   │   ├── services/           # Business logic
│   │   ├── utils/              # Utility helpers
│   │   ├── app.js              # Express app setup
│   │   └── server.js           # Server entry point
├── .env.example
├── .gitignore
└── README.md
`

## Getting Started

### 1. Server Setup
`ash
cd server
npm install
cp .env.example .env
npm run dev
`
Server runs at http://localhost:5000
Health check: GET http://localhost:5000/api/health

### 2. Client Setup
`ash
cd client
npm install
npm run dev
`
Client runs at http://localhost:5173
