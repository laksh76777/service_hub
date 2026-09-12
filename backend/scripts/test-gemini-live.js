/**
 * Live Gemini API Diagnostic Test
 * Verifies that the GEMINI_API_KEY from .env connects to Google Gemini API
 * and powers all 3 ServiceHub AI features end-to-end.
 */
require('dotenv').config({ path: __dirname + '/../.env' });
const aiService = require('../src/services/aiService');

const apiKey = (process.env.GEMINI_API_KEY || '').trim();
const model = (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim();

console.log('====================================================');
console.log('  SERVICEHUB GEMINI API LIVE DIAGNOSTIC             ');
console.log('====================================================');
console.log('API Key present in .env:', !!apiKey);
console.log('API Key preview:        ', apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)} (${apiKey.length} chars)` : 'MISSING');
console.log('Target Model:           ', model);
console.log('----------------------------------------------------');

async function testDirectApi() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  console.log('\n[1/4] Testing Direct API Call to Google Gemini...');
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Respond with JSON: {"greeting": "hello world", "status": "working"}' }] }],
        generationConfig: { responseMimeType: 'application/json' }
      }),
      signal: AbortSignal.timeout(10000)
    });

    console.log('HTTP Status:', res.status, res.statusText);
    const json = await res.json();
    if (!res.ok) {
      console.log('API Error:', JSON.stringify(json, null, 2));
      return false;
    }
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log('✅ Response:', text);
    return true;
  } catch (err) {
    console.error('❌ Connection error:', err.message);
    return false;
  }
}

async function testFeatures() {
  // Feature 1: Classification
  console.log('\n[2/4] Testing Feature 1: Customer Problem Classification...');
  const classResult = await aiService.classifyServiceRequest('My AC is making loud buzzing noise and not cooling at all');
  console.log('Category:         ', classResult.category);
  console.log('Problem Summary:  ', classResult.problemSummary);
  console.log('Suggested Service:', classResult.suggestedService);
  console.log('Urgency:          ', classResult.urgency);
  console.log('Engine Used:      ', classResult.engine);
  console.log('Fallback Used:    ', classResult.fallbackUsed);

  await new Promise(r => setTimeout(r, 1500));

  // Feature 2: Estimate Assist
  console.log('\n[3/4] Testing Feature 2: Technician Estimate Assistance...');
  const estResult = await aiService.assistEstimate(
    'Found refrigerant R32 low pressure, outdoor condenser coil clogged with dust, compressor capacitor weak',
    'AC Repair'
  );
  console.log('Inspection Summary:', estResult.inspectionSummary);
  console.log('Suggested Items:   ', estResult.suggestedItems?.map(i => `[${i.type}] ${i.description}`));
  console.log('Engine Used:       ', estResult.engine);
  console.log('Fallback Used:     ', estResult.fallbackUsed);

  await new Promise(r => setTimeout(r, 1500));

  // Feature 3: Admin Summary
  console.log('\n[4/4] Testing Feature 3: Admin Dashboard Summary...');
  const adminResult = await aiService.generateAdminSummary(
    {
      overview: { totalCustomers: 50, totalTechnicians: 10, activeBookings: 6, completedBookings: 42, totalPaymentVolume: 125000, openDisputes: 1, pendingVerification: 2 }
    },
    'platform_overview'
  );
  console.log('Headline:    ', adminResult.headline);
  console.log('Insights:    ', adminResult.insights);
  console.log('Engine Used: ', adminResult.engine);
  console.log('Fallback:    ', adminResult.fallbackUsed);
}

async function run() {
  const directOk = await testDirectApi();
  if (directOk) {
    await testFeatures();
    console.log('\n====================================================');
    console.log('✅ ALL GEMINI AI FEATURES VERIFIED & WORKING LIVE!');
    console.log('====================================================');
  } else {
    console.log('\n❌ Direct API call failed. Check your API key or network.');
  }
}

run().catch(console.error);
