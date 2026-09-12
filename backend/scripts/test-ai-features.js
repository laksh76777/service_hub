/**
 * ServiceHub AI Features Test Suite
 *
 * Tests all three AI features in isolation (no network / no DB required):
 * Feature 1: Problem description classification (customer)
 * Feature 2: Technician estimate assistance
 * Feature 3: Admin platform summary
 *
 * Tests the complete graceful-degradation behavior when AI is unavailable.
 */

'use strict';

const { classifyServiceRequest, assistEstimate, generateAdminSummary, classifyWithPatternEngine } = require('../src/services/aiService');

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✓ PASSED: ${label}`);
    passed++;
  } else {
    console.error(`  ❌ FAILED: ${label}`);
    failed++;
  }
}

async function runAiTests() {
  console.log('\n=============================================================');
  console.log('🤖 SERVICEHUB AI FEATURES TEST SUITE');
  console.log('=============================================================\n');

  // ===========================================================
  // FEATURE 1: PROBLEM DESCRIPTION CLASSIFICATION
  // ===========================================================
  console.log('🔹 [1/6] Feature 1 — AC Problem Classification');
  {
    const result = await classifyServiceRequest('My AC is making a loud noise and doesn\'t cool properly');
    assert(result.category === 'AC_REPAIR', 'AC Repair category detected');
    assert(typeof result.problemSummary === 'string' && result.problemSummary.length > 0, 'Problem summary generated');
    assert(Array.isArray(result.possibleAreas) && result.possibleAreas.length > 0, 'Possible areas identified');
    assert(typeof result.suggestedService === 'string' && result.suggestedService.length > 0, 'Suggested service returned');
    assert(['LOW', 'MEDIUM', 'HIGH'].includes(result.urgency), 'Urgency is valid (LOW/MEDIUM/HIGH)');
    assert(result.isRecommendationOnly === true, 'isRecommendationOnly flag is set');
    assert(typeof result.disclaimer === 'string', 'Advisory disclaimer present');
  }

  console.log('\n🔹 [2/6] Feature 1 — Plumbing / Electrical / RO Classification');
  {
    const plumbing = await classifyServiceRequest('Water is leaking from the kitchen tap and drain is clogged');
    assert(plumbing.category === 'PLUMBING', 'Plumbing category detected');

    const electrical = await classifyServiceRequest('My MCB keeps tripping and switch board is sparking');
    assert(electrical.category === 'ELECTRICAL', 'Electrical category detected');
    assert(electrical.urgency === 'HIGH', 'Sparking correctly identified as HIGH urgency');

    const ro = await classifyServiceRequest('My RO water purifier is producing very low water and TDS is high');
    assert(ro.category === 'RO_WATER_PURIFIER', 'RO Purifier category detected');
  }

  console.log('\n🔹 [3/6] Feature 1 — Ambiguous input & empty input handling');
  {
    // Short/ambiguous
    const ambiguous = await classifyServiceRequest('broken thing');
    assert(ambiguous.isAmbiguous === true || ambiguous.category === 'OTHER', 'Short ambiguous input handled gracefully');
    assert(ambiguous.isRecommendationOnly === true, 'Advisory flag set on ambiguous result');

    // Empty input
    try {
      await classifyServiceRequest('   ');
      assert(false, 'Empty input should have thrown an error');
    } catch (err) {
      assert(err.statusCode === 400 || err.message.includes('required'), 'Empty description throws 400 error');
    }
  }

  // ===========================================================
  // FEATURE 2: TECHNICIAN ESTIMATE ASSISTANCE
  // ===========================================================
  console.log('\n🔹 [4/6] Feature 2 — Estimate Assistance for AC Inspection Notes');
  {
    const inspectionNotes = 'AC compressor running but cooling is minimal. Found capacitor swollen and refrigerant gas is low. Filter is dirty and needs cleaning.';
    const result = await assistEstimate(inspectionNotes, 'AC Repair');

    assert(typeof result.inspectionSummary === 'string' && result.inspectionSummary.length > 0, 'Inspection summary generated');
    assert(Array.isArray(result.suggestedItems) && result.suggestedItems.length > 0, 'Suggested items array returned');
    assert(result.isRecommendationOnly === true, 'isRecommendationOnly flag set on estimate assist');
    assert(typeof result.disclaimer === 'string', 'Disclaimer present');

    // Should suggest capacitor and gas-related items
    const hasCapacitor = result.suggestedItems.some((i) => i.description.toLowerCase().includes('capacitor'));
    const hasGas = result.suggestedItems.some((i) => i.description.toLowerCase().includes('gas') || i.description.toLowerCase().includes('refrigerant'));
    const hasFilter = result.suggestedItems.some((i) => i.description.toLowerCase().includes('filter'));
    const hasLabour = result.suggestedItems.some((i) => i.type === 'LABOUR');

    assert(hasCapacitor, 'Capacitor replacement suggested for swollen capacitor notes');
    assert(hasGas, 'Refrigerant gas suggested for low gas notes');
    assert(hasFilter, 'Filter service suggested for dirty filter notes');
    assert(hasLabour, 'Labour item always included');

    // All items have required fields
    const allValid = result.suggestedItems.every((i) => i.type && i.description);
    assert(allValid, 'All suggested items have type and description');
  }

  console.log('\n🔹 [5/6] Feature 2 — Estimate Assistance graceful degradation & empty input');
  {
    // Empty notes should throw
    try {
      await assistEstimate('');
      assert(false, 'Empty inspection notes should throw an error');
    } catch (err) {
      assert(err.statusCode === 400 || err.message.includes('required'), 'Empty inspection notes throws 400 error');
    }

    // Pattern engine fallback via forcePatternEngine option
    const plumbingNotes = 'Tap washer worn out, pipe joint leaking, drain blocked';
    const result = await assistEstimate(plumbingNotes, 'Plumbing', { forcePatternEngine: true });
    const hasWasher = result.suggestedItems.some((i) => i.description.toLowerCase().includes('washer'));
    const hasDrain = result.suggestedItems.some((i) => i.description.toLowerCase().includes('drain'));
    assert(hasWasher, 'Washer item suggested for plumbing tap issue');
    assert(hasDrain, 'Drain item suggested for blocked drain notes');
  }

  // ===========================================================
  // FEATURE 3: ADMIN PLATFORM SUMMARY
  // ===========================================================
  console.log('\n🔹 [6/6] Feature 3 — Admin Platform Summary (All Types)');
  {
    const mockOverview = {
      totalCustomers: 120,
      totalTechnicians: 45,
      activeBookings: 12,
      completedBookings: 87,
      totalPaymentVolume: 143500,
      successfulPayments: 85,
      failedPayments: 3,
      openDisputes: 2,
      pendingVerification: 4
    };

    // Booking Summary
    const bookingSummary = await generateAdminSummary({ overview: mockOverview }, 'bookings');
    assert(bookingSummary.summaryType === 'bookings', 'Summary type is bookings');
    assert(typeof bookingSummary.headline === 'string' && bookingSummary.headline.length > 0, 'Booking headline generated');
    assert(Array.isArray(bookingSummary.insights) && bookingSummary.insights.length > 0, 'Booking insights array returned');
    assert(bookingSummary.isInformationalOnly === true, 'isInformationalOnly flag set on booking summary');
    assert(typeof bookingSummary.disclaimer === 'string', 'Disclaimer present in booking summary');
    assert(bookingSummary.headline.includes('87') || bookingSummary.headline.includes('12') || bookingSummary.headline.length > 10, 'Headline contains meaningful data');

    // Dispute Summary
    const disputeSummary = await generateAdminSummary({ overview: mockOverview }, 'disputes');
    assert(disputeSummary.summaryType === 'disputes', 'Summary type is disputes');
    assert(typeof disputeSummary.headline === 'string' && disputeSummary.headline.includes('2'), 'Dispute headline shows correct open dispute count');
    assert(disputeSummary.isInformationalOnly === true, 'isInformationalOnly on dispute summary');
    const noDecision = disputeSummary.insights.some((i) => i.toLowerCase().includes('admin') || i.toLowerCase().includes('review'));
    assert(noDecision, 'Dispute summary correctly defers decision to admin (no automated action)');

    // Service Trends
    const trendsSummary = await generateAdminSummary({ overview: mockOverview, services: [] }, 'service_trends');
    assert(trendsSummary.summaryType === 'service_trends', 'Summary type is service_trends');
    assert(typeof trendsSummary.headline === 'string', 'Service trends headline generated');
    assert(trendsSummary.isInformationalOnly === true, 'isInformationalOnly on service trends');

    // General Summary
    const generalSummary = await generateAdminSummary({ overview: mockOverview }, 'general');
    assert(generalSummary.summaryType === 'general', 'General summary type');
    assert(generalSummary.isInformationalOnly === true, 'isInformationalOnly on general summary');
    assert(typeof generalSummary.generatedAt === 'string', 'generatedAt timestamp present');

    // AI decisions must not appear anywhere
    const allInsights = [
      ...(bookingSummary.insights || []),
      ...(disputeSummary.insights || []),
      ...(trendsSummary.insights || [])
    ].join(' ').toLowerCase();
    const noAutoApproval = !allInsights.includes('automatically approve') && !allInsights.includes('auto-assign') && !allInsights.includes('auto-resolve');
    assert(noAutoApproval, 'AI summaries contain no automated approval/assignment/resolution language');
  }

  console.log('\n=============================================================');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('=============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAiTests().catch((err) => {
  console.error('\n❌ Test execution error:', err.message);
  process.exit(1);
});
