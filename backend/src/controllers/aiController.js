const { classifyServiceRequest, assistEstimate, generateAdminSummary } = require('../services/aiService');
const { adminGetOverview } = require('./adminController');
const { USER_ROLES } = require('../utils/constants');

// =========================================================
// FEATURE 1 — PROBLEM DESCRIPTION CLASSIFICATION
// Customer advisory: AI analyses problem and suggests service category
// =========================================================

/**
 * POST /api/ai/classify-request
 * Public — no auth required (booking flow uses this before request creation)
 */
const classifyRequest = async (req, res, next) => {
  try {
    const { description } = req.body;

    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Problem description is required and cannot be empty.'
      });
    }

    const classification = await classifyServiceRequest(description);

    return res.status(200).json({
      success: true,
      data: classification
    });
  } catch (error) {
    // AI failures must NOT break the booking flow
    console.warn('[AIController] classifyRequest failed gracefully:', error.message);
    return res.status(200).json({
      success: true,
      data: {
        category: 'OTHER',
        problemSummary: (req.body.description || '').slice(0, 120),
        possibleAreas: ['General inspection required'],
        suggestedService: 'General Inspection & Diagnostics',
        urgency: 'MEDIUM',
        disclaimer: 'AI recommendation only. Advisory use only.',
        isRecommendationOnly: true,
        fallbackUsed: true
      }
    });
  }
};

// =========================================================
// FEATURE 2 — TECHNICIAN ESTIMATE ASSISTANCE
// Technician-only: AI summarizes inspection notes and
// suggests estimate item descriptions. Technician remains
// fully responsible for the final estimate.
// =========================================================

/**
 * POST /api/ai/assist-estimate
 * Requires: authenticated TECHNICIAN or ADMIN
 */
const assistEstimateHandler = async (req, res, next) => {
  try {
    const { inspectionNotes, serviceName } = req.body;

    if (!inspectionNotes || typeof inspectionNotes !== 'string' || !inspectionNotes.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Inspection notes are required for AI estimate assistance.'
      });
    }

    const result = await assistEstimate(inspectionNotes.trim(), serviceName || '');

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    // AI failures must NOT break the estimate workflow
    console.warn('[AIController] assistEstimate failed gracefully:', error.message);
    if (error.statusCode === 400) {
      return res.status(400).json({ success: false, message: error.message });
    }
    return res.status(200).json({
      success: true,
      data: {
        inspectionSummary: (req.body.inspectionNotes || '').slice(0, 100),
        suggestedItems: [
          { type: 'LABOUR', description: 'Technician labour and service charges' },
          { type: 'PART', description: 'Parts and materials as required' },
          { type: 'OTHER', description: 'Consumables and sundry materials' }
        ],
        disclaimer: 'AI assistant temporarily unavailable. Please fill in estimate items manually.',
        isRecommendationOnly: true,
        fallbackUsed: true
      }
    });
  }
};

// =========================================================
// FEATURE 3 — ADMIN PLATFORM SUMMARY
// Admin-only: AI generates informational summaries about
// bookings, disputes, or service trends.
// Never makes business decisions automatically.
// =========================================================

/**
 * POST /api/ai/admin-summary
 * Requires: authenticated ADMIN
 */
const adminSummaryHandler = async (req, res, next) => {
  try {
    const { summaryType = 'general', overview, bookings, disputes, services } = req.body;

    const validTypes = ['bookings', 'disputes', 'service_trends', 'general'];
    const resolvedType = validTypes.includes(summaryType) ? summaryType : 'general';

    const data = {
      overview: overview || {},
      bookings: bookings || [],
      disputes: disputes || [],
      services: services || []
    };

    const result = await generateAdminSummary(data, resolvedType);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    // AI failures must NOT break the admin dashboard
    console.warn('[AIController] adminSummary failed gracefully:', error.message);
    return res.status(200).json({
      success: true,
      data: {
        summaryType: req.body.summaryType || 'general',
        headline: 'Platform summary temporarily unavailable.',
        insights: ['Please review the dashboard statistics directly.'],
        disclaimer: 'AI summary is informational only.',
        isInformationalOnly: true,
        fallbackUsed: true,
        generatedAt: new Date().toISOString()
      }
    });
  }
};

module.exports = {
  classifyRequest,
  assistEstimateHandler,
  adminSummaryHandler
};
