const express = require('express');
const { classifyRequest, assistEstimateHandler, adminSummaryHandler } = require('../controllers/aiController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// =========================================================
// FEATURE 1 — Problem Description Classification
// No auth required (used during booking creation flow)
// =========================================================
router.post('/classify-request', classifyRequest);

// =========================================================
// FEATURE 2 — Technician Estimate Assistance
// Auth required: TECHNICIAN or ADMIN only
// AI is advisory — technician retains full responsibility
// =========================================================
router.post(
  '/assist-estimate',
  requireAuth,
  requireRole('TECHNICIAN', 'ADMIN'),
  assistEstimateHandler
);

// =========================================================
// FEATURE 3 — Admin Platform Summary
// Auth required: ADMIN only
// Informational summaries only — no automated decisions
// =========================================================
router.post(
  '/admin-summary',
  requireAuth,
  requireRole('ADMIN'),
  adminSummaryHandler
);

module.exports = router;
