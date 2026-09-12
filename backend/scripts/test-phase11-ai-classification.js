/**
 * Phase 11 Automated Verification Suite
 * Minimal AI-Assisted Service Request Classification
 * 
 * Tests:
 * 1. Valid Input (AC repair description from prompt)
 * 2. Ambiguous Input (vague or minimal text)
 * 3. Empty Input (empty string / whitespace)
 * 4. AI Failure (simulated provider timeout/network failure)
 * 5. Malformed AI Response (invalid JSON / broken schema)
 * 6. Non-binding Invariant Verification (no auto-diagnosis, pricing, or approvals)
 * 7. End-to-end HTTP API Integration (POST /api/ai/classify-request)
 */

const {
  classifyServiceRequest,
  validateAiClassification,
  classifyWithPatternEngine,
  ALLOWED_CATEGORIES,
  ALLOWED_URGENCIES,
  ADVISORY_DISCLAIMER
} = require('../src/services/aiService');
const app = require('../src/app');
const http = require('http');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

const assert = (condition, testName, details = '') => {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${testName} - ${details}`);
  }
};

const runPhase11Tests = async () => {
  console.log('================================================================');
  console.log('   PHASE 11: AI-ASSISTED SERVICE CLASSIFICATION TEST SUITE      ');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // TEST 1: Valid Input (Example from user prompt)
  // ---------------------------------------------------------------------------
  console.log('Test Group 1: Valid Customer Problem Description');
  try {
    const promptExample = "My AC starts normally but after some time it makes a loud noise and doesn't cool.";
    const result = await classifyServiceRequest(promptExample);

    assert(result.category === 'AC_REPAIR', 'Matches category AC_REPAIR', `Received: ${result.category}`);
    assert(typeof result.problemSummary === 'string' && result.problemSummary.length > 5, 'Problem summary is extracted string');
    assert(Array.isArray(result.possibleAreas) && result.possibleAreas.length > 0, 'Possible areas is non-empty array', `Count: ${result.possibleAreas?.length}`);
    assert(typeof result.suggestedService === 'string' && result.suggestedService.length > 0, 'Suggested service is present');
    assert(ALLOWED_URGENCIES.includes(result.urgency), `Urgency is valid enum (${result.urgency})`);
    assert(result.urgency === 'MEDIUM', 'Urgency correctly evaluated as MEDIUM for cooling/noise issue');
    assert(result.disclaimer && result.disclaimer.includes('AI recommendation only'), 'Includes non-binding advisory disclaimer');
  } catch (err) {
    assert(false, 'Valid input classification should not throw', err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 2: Ambiguous Input
  // ---------------------------------------------------------------------------
  console.log('\nTest Group 2: Ambiguous / Vague Customer Input');
  try {
    const ambiguousDescription = "It broke yesterday";
    const result = await classifyServiceRequest(ambiguousDescription);

    assert(result.isAmbiguous === true, 'Flags description as ambiguous');
    assert(result.category === 'OTHER', 'Assigns safe category OTHER for ambiguous input');
    assert(typeof result.clarificationPrompt === 'string' && result.clarificationPrompt.length > 0, 'Provides clarification guidance');
    assert(Array.isArray(result.possibleAreas), 'Returns fallback possible areas');
    assert(result.urgency === 'LOW', 'Default urgency is LOW for ambiguous queries');
  } catch (err) {
    assert(false, 'Ambiguous input should be handled gracefully without throwing', err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 3: Empty Input
  // ---------------------------------------------------------------------------
  console.log('\nTest Group 3: Empty / Whitespace Customer Input');
  try {
    let errorCaught = false;
    try {
      await classifyServiceRequest('   ');
    } catch (err) {
      errorCaught = true;
      assert(err.statusCode === 400 || err.message.includes('required'), 'Rejects empty input with validation message');
    }
    assert(errorCaught, 'Empty string throws validation error');

    let nullErrorCaught = false;
    try {
      await classifyServiceRequest(null);
    } catch (err) {
      nullErrorCaught = true;
    }
    assert(nullErrorCaught, 'Null input throws validation error');
  } catch (err) {
    assert(false, 'Empty input error handling test failed', err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 4: AI Failure / Network Error Resilience
  // ---------------------------------------------------------------------------
  console.log('\nTest Group 4: Downstream AI Failure (Workflow Continuity)');
  try {
    // Simulate external model or network throwing an unexpected exception
    const failingProvider = async () => {
      throw new Error('Downstream LLM API Rate Limit / Network Socket Timeout');
    };

    const result = await classifyServiceRequest('Water is dripping from the bathroom pipe joint under the sink', {
      customProvider: failingProvider
    });

    assert(result !== null && typeof result === 'object', 'AI failure does not crash execution');
    assert(result.fallbackUsed === true, 'Gracefully falls back to resilient pattern classifier');
    assert(result.category === 'PLUMBING', 'Fallback correctly resolves category PLUMBING');
    assert(result.possibleAreas.some(area => area.toLowerCase().includes('joint') || area.toLowerCase().includes('pipe') || area.toLowerCase().includes('seal')), 'Fallback accurately identifies probable areas');
    assert(result.isRecommendationOnly === true, 'Recommendation remains non-binding during fallback');
  } catch (err) {
    assert(false, 'AI failure should not break workflow', err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 5: Malformed AI Response
  // ---------------------------------------------------------------------------
  console.log('\nTest Group 5: Malformed AI Response & Schema Validation');
  try {
    // Simulate AI returning corrupted structure (missing category, invalid urgency, invalid types)
    const malformedProvider = async () => {
      return {
        category: 'INVALID_UNKNOWN_TYPE',
        problemSummary: '',
        possibleAreas: 'not-an-array',
        urgency: 'SUPER_CRITICAL_EMERGENCY_NOW'
      };
    };

    const result = await classifyServiceRequest('Kitchen switchboard sparking and MCB tripping', {
      customProvider: malformedProvider
    });

    assert(ALLOWED_CATEGORIES.includes(result.category), `Sanitizes invalid category into allowed enum (${result.category})`);
    assert(ALLOWED_URGENCIES.includes(result.urgency), `Normalizes invalid urgency into allowed enum (${result.urgency})`);
    assert(Array.isArray(result.possibleAreas) && result.possibleAreas.length > 0, 'Coerces possibleAreas into valid array of strings');
    assert(typeof result.problemSummary === 'string' && result.problemSummary.length > 0, 'Provides fallback problem summary');

    // Test directly against validateAiClassification with non-object input
    let validationCaught = false;
    try {
      validateAiClassification('string-instead-of-json');
    } catch (err) {
      validationCaught = true;
    }
    assert(validationCaught, 'validateAiClassification rejects non-object primitives');
  } catch (err) {
    assert(false, 'Malformed response handling should not fail', err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 6: Non-Binding Invariant Verification
  // ---------------------------------------------------------------------------
  console.log('\nTest Group 6: Strict Non-Binding Invariant Checks');
  try {
    const result = await classifyServiceRequest('Ceiling fan regulator is broken and sparking');

    assert(result.finalPrice === undefined, 'AI does not set final pricing');
    assert(result.estimatedPrice === undefined, 'AI does not set price estimates');
    assert(result.isApproved === undefined, 'AI does not auto-approve services');
    assert(result.autoDiagnosedFault === undefined, 'AI does not make binding technical fault diagnoses');
    assert(result.isRecommendationOnly === true, 'Explicitly marked as recommendation only');
    assert(result.disclaimer.includes('AI recommendation only'), 'Mandatory advisory disclaimer is always attached');
  } catch (err) {
    assert(false, 'Invariant verification failed', err.message);
  }

  // ---------------------------------------------------------------------------
  // TEST 7: End-to-end HTTP API Integration (POST /api/ai/classify-request)
  // ---------------------------------------------------------------------------
  console.log('\nTest Group 7: End-to-end HTTP API (/api/ai/classify-request)');
  let server;
  try {
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}/api/ai/classify-request`;

    // 7a. Valid POST request
    const validRes = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: "My AC starts normally but after some time it makes a loud noise and doesn't cool."
      })
    });
    const validJson = await validRes.json();

    assert(validRes.status === 200, 'HTTP 200 OK for valid classification request');
    assert(validJson.success === true, 'Response indicates success: true');
    assert(validJson.data.category === 'AC_REPAIR', 'HTTP API returned AC_REPAIR category');
    assert(validJson.data.urgency === 'MEDIUM', 'HTTP API returned MEDIUM urgency');

    // 7b. Empty POST request
    const emptyRes = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: '   ' })
    });
    const emptyJson = await emptyRes.json();

    assert(emptyRes.status === 400, 'HTTP 400 Bad Request for empty description');
    assert(emptyJson.success === false, 'Response indicates success: false');

    // 7c. Missing body POST request
    const missingRes = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert(missingRes.status === 400, 'HTTP 400 Bad Request when description field is missing');
  } catch (err) {
    assert(false, 'HTTP API integration test threw error', err.message);
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  }

  // ---------------------------------------------------------------------------
  // TEST SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    console.log('✨ All Phase 11 AI classification tests passed successfully!');
    process.exit(0);
  }
};

runPhase11Tests();
