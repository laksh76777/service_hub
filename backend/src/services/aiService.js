/**
 * AI Service for ServiceHub
 * 
 * Strictly isolated service for converting customer problem descriptions
 * into structured service-request information.
 * 
 * IMPORTANT NON-BINDING RULES:
 * - AI output is strictly an advisory recommendation.
 * - Never automatically diagnoses a technical fault.
 * - Never automatically approves a service.
 * - Never automatically sets final pricing.
 * - Customer and provider remain strictly responsible for all decisions.
 */

const logger = require('../utils/logger') || console;

const ALLOWED_CATEGORIES = [
  'AC_REPAIR',
  'PLUMBING',
  'ELECTRICAL',
  'RO_WATER_PURIFIER',
  'APPLIANCE_REPAIR',
  'ELECTRONICS',
  'CARPENTRY',
  'PAINTING',
  'OTHER'
];

const ALLOWED_URGENCIES = ['LOW', 'MEDIUM', 'HIGH'];

const ADVISORY_DISCLAIMER =
  'AI recommendation only. Does not constitute a technical diagnosis, approval, or pricing commitment. Customer and service provider retain full responsibility.';

const getGeminiApiKey = () => (process.env.GEMINI_API_KEY || '').trim();
const getGeminiModel = () => (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim();

/**
 * Validate and sanitize structured AI classification output
 * @param {Object} output
 * @returns {Object} validated output
 */
const validateAiClassification = (output) => {
  if (!output || typeof output !== 'object' || Array.isArray(output)) {
    throw new Error('AI output must be a valid JSON object');
  }

  // 1. Validate Category
  let category = String(output.category || 'OTHER').toUpperCase().trim().replace(/[-\s]+/g, '_');
  if (!ALLOWED_CATEGORIES.includes(category)) {
    // Map known informal aliases if present
    if (category.includes('AC') || category.includes('COOLING')) category = 'AC_REPAIR';
    else if (category.includes('PLUMB') || category.includes('PIPE') || category.includes('WATER_LEAK')) category = 'PLUMBING';
    else if (category.includes('ELECTRIC') || category.includes('WIRING') || category.includes('SWITCH')) category = 'ELECTRICAL';
    else if (category.includes('PURIFIER') || category.includes('RO_') || category.includes('FILTER')) category = 'RO_WATER_PURIFIER';
    else if (category.includes('WASHING') || category.includes('REFRIG') || category.includes('GEYSER')) category = 'APPLIANCE_REPAIR';
    else if (category.includes('TV') || category.includes('LAPTOP')) category = 'ELECTRONICS';
    else if (category.includes('CARPENT') || category.includes('WOOD')) category = 'CARPENTRY';
    else if (category.includes('PAINT')) category = 'PAINTING';
    else category = 'OTHER';
  }

  // 2. Validate Problem Summary
  let problemSummary = String(output.problemSummary || '').trim();
  if (!problemSummary) {
    problemSummary = 'Customer reported a service requirement.';
  }

  // 3. Validate Possible Areas
  let possibleAreas = [];
  if (Array.isArray(output.possibleAreas)) {
    possibleAreas = output.possibleAreas
      .map((item) => String(item).trim())
      .filter((item) => item.length > 0);
  }
  if (possibleAreas.length === 0) {
    possibleAreas = ['General inspection'];
  }

  // 4. Validate Suggested Service
  let suggestedService = String(output.suggestedService || '').trim();
  if (!suggestedService) {
    suggestedService = 'General Visit & Fault Diagnosis Call';
  }

  // 5. Validate Urgency
  let urgency = String(output.urgency || 'MEDIUM').toUpperCase().trim();
  if (!ALLOWED_URGENCIES.includes(urgency)) {
    urgency = 'MEDIUM';
  }

  // Return strictly validated schema with guaranteed advisory disclaimer
  const validated = {
    category,
    problemSummary,
    possibleAreas,
    suggestedService,
    urgency,
    disclaimer: ADVISORY_DISCLAIMER,
    isRecommendationOnly: true
  };

  if (output.isAmbiguous) {
    validated.isAmbiguous = true;
    validated.clarificationPrompt =
      output.clarificationPrompt ||
      'Please mention the specific appliance, fixture, or area (e.g. AC, tap leakage, electrical switch, washing machine).';
  }

  return validated;
};

/**
 * Heuristic/Pattern-based Natural Language Classifier
 * Provides fast, zero-dependency, highly reliable domain extraction.
 * @param {string} text
 * @returns {Object}
 */
const classifyWithPatternEngine = (text) => {
  const lower = text.toLowerCase();

  // Urgency detection
  let urgency = 'LOW';
  if (
    lower.includes('spark') ||
    lower.includes('burning') ||
    lower.includes('short circuit') ||
    lower.includes('fire') ||
    lower.includes('burst') ||
    lower.includes('flooding') ||
    lower.includes('heavy leak') ||
    lower.includes('emergency') ||
    lower.includes('immediately') ||
    lower.includes('urgent')
  ) {
    urgency = 'HIGH';
  } else if (
    lower.includes('noise') ||
    lower.includes('not working') ||
    lower.includes('doesn\'t cool') ||
    lower.includes('does not cool') ||
    lower.includes('cooling') ||
    lower.includes('leak') ||
    lower.includes('clog') ||
    lower.includes('tripping') ||
    lower.includes('power trip') ||
    lower.includes('stopped') ||
    lower.includes('broken')
  ) {
    urgency = 'MEDIUM';
  }

  // Category & Domain Mapping
  if (
    lower.includes('ac') ||
    lower.includes('air conditioner') ||
    lower.includes('cooling') ||
    lower.includes('gas charging') ||
    lower.includes('compressor') ||
    lower.includes('split ac') ||
    lower.includes('window ac')
  ) {
    const areas = [];
    if (lower.includes('noise') || lower.includes('sound')) areas.push('Blower fan & motor bearing');
    if (lower.includes('cool')) areas.push('Refrigerant gas level & cooling coil');
    if (lower.includes('start') || lower.includes('stop')) areas.push('Capacitor & PCB power circuit');
    if (areas.length === 0) areas.push('Compressor and air filter unit');

    return {
      category: 'AC_REPAIR',
      problemSummary: 'Air conditioner operational irregularity with performance degradation',
      possibleAreas: areas,
      suggestedService: 'AC Inspection & Diagnostics',
      urgency
    };
  }

  if (
    lower.includes('plumb') ||
    lower.includes('pipe') ||
    lower.includes('tap') ||
    lower.includes('drain') ||
    lower.includes('water tank') ||
    lower.includes('sink') ||
    lower.includes('flush') ||
    lower.includes('commode') ||
    lower.includes('faucet') ||
    lower.includes('sewage')
  ) {
    const areas = [];
    if (lower.includes('leak') || lower.includes('drip')) areas.push('Washer, spindle or joint seal');
    if (lower.includes('drain') || lower.includes('clog') || lower.includes('block')) areas.push('Drainage trap and waste pipe');
    if (areas.length === 0) areas.push('Pipeline connection and valves');

    return {
      category: 'PLUMBING',
      problemSummary: 'Plumbing fixture or water pipeline distribution issue',
      possibleAreas: areas,
      suggestedService: 'Plumbing Visit & Inspection',
      urgency
    };
  }

  if (
    lower.includes('electric') ||
    lower.includes('mcb') ||
    lower.includes('switch') ||
    lower.includes('socket') ||
    lower.includes('wire') ||
    lower.includes('fuse') ||
    lower.includes('fan') ||
    lower.includes('short circuit') ||
    lower.includes('power trip') ||
    lower.includes('inverter')
  ) {
    const areas = [];
    if (lower.includes('mcb') || lower.includes('trip')) areas.push('MCB breaker and circuit load');
    if (lower.includes('switch') || lower.includes('socket')) areas.push('Switchboard contact terminal');
    if (lower.includes('fan')) areas.push('Fan capacitor and regulator');
    if (areas.length === 0) areas.push('Concealed house wiring and earthing');

    return {
      category: 'ELECTRICAL',
      problemSummary: 'Electrical power circuit or appliance wiring fault',
      possibleAreas: areas,
      suggestedService: 'Electrical Visit & Fault Diagnosis',
      urgency: urgency === 'LOW' ? 'MEDIUM' : urgency
    };
  }

  if (
    lower.includes('ro ') ||
    lower.includes('water purifier') ||
    lower.includes('purifier') ||
    lower.includes('filter') ||
    lower.includes('tds')
  ) {
    return {
      category: 'RO_WATER_PURIFIER',
      problemSummary: 'RO water purifier filtration or membrane flow issue',
      possibleAreas: ['Pre-carbon filter', 'RO membrane', 'Booster pump pressure'],
      suggestedService: 'RO Purifier Complete Filter Replacement',
      urgency
    };
  }

  if (
    lower.includes('washing machine') ||
    lower.includes('fridge') ||
    lower.includes('refrigerator') ||
    lower.includes('geyser') ||
    lower.includes('water heater') ||
    lower.includes('microwave')
  ) {
    const areas = [];
    if (lower.includes('geyser')) areas.push('Heating element and thermostat');
    else if (lower.includes('fridge') || lower.includes('refrigerator')) areas.push('Compressor relay and defrost coil');
    else areas.push('Motor drive belt and drain pump');

    return {
      category: 'APPLIANCE_REPAIR',
      problemSummary: 'Major domestic appliance operational fault',
      possibleAreas: areas,
      suggestedService: 'Appliance Diagnosis & Repair',
      urgency
    };
  }

  if (
    lower.includes('tv') ||
    lower.includes('laptop') ||
    lower.includes('computer') ||
    lower.includes('display') ||
    lower.includes('screen')
  ) {
    return {
      category: 'ELECTRONICS',
      problemSummary: 'Consumer electronics hardware or display malfunction',
      possibleAreas: ['Power supply circuit', 'Display panel connection', 'Internal cooling/motherboard'],
      suggestedService: 'Electronics Diagnosis & Servicing',
      urgency
    };
  }

  if (lower.includes('door') || lower.includes('lock') || lower.includes('wood') || lower.includes('furniture')) {
    return {
      category: 'CARPENTRY',
      problemSummary: 'Wooden fixture, door alignment or hardware fitting issue',
      possibleAreas: ['Hinges & lock mechanism', 'Wooden panel alignment'],
      suggestedService: 'Carpentry Inspection & Repair',
      urgency
    };
  }

  if (lower.includes('paint') || lower.includes('damp') || lower.includes('seepage') || lower.includes('wall')) {
    return {
      category: 'PAINTING',
      problemSummary: 'Wall moisture, paint peeling or waterproofing requirement',
      possibleAreas: ['Surface plaster', 'Waterproofing barrier', 'Primer layer'],
      suggestedService: 'Painting & Waterproofing Inspection',
      urgency
    };
  }

  // Ambiguous/unspecified general description
  return {
    category: 'OTHER',
    problemSummary: 'General home service or unspecified maintenance inquiry',
    possibleAreas: ['On-site physical inspection'],
    suggestedService: 'General Service & Inspection Visit',
    urgency: 'LOW',
    isAmbiguous: true,
    clarificationPrompt:
      'Please mention the specific appliance, fixture, or area (e.g. AC, tap leakage, electrical switch, washing machine).'
  };
};

/**
 * Main AI Classification Function
 * 
 * @param {string} description - Customer problem description
 * @param {Object} options - Optional configuration or mock provider for testing
 * @returns {Promise<Object>}
 */
const classifyServiceRequest = async (description, options = {}) => {
  // 1. Check for empty/whitespace input
  if (!description || typeof description !== 'string' || !description.trim()) {
    const err = new Error('Problem description is required and cannot be empty.');
    err.statusCode = 400;
    throw err;
  }

  const cleanDescription = description.trim();

  // 2. Check for extremely short/ambiguous input
  const words = cleanDescription.split(/\s+/).filter(Boolean);
  const isAmbiguousInput = words.length <= 2 && !/(ac|plumb|tap|electric|leak|pipe|mcb|fan|geyser|fridge)/i.test(cleanDescription);

  if (isAmbiguousInput) {
    return {
      category: 'OTHER',
      problemSummary: cleanDescription,
      possibleAreas: ['General inspection needed due to brief description'],
      suggestedService: 'General Inspection & Diagnostics',
      urgency: 'LOW',
      isAmbiguous: true,
      clarificationPrompt:
        'Could you share more details about which appliance or home fixture needs repair?',
      disclaimer: ADVISORY_DISCLAIMER,
      isRecommendationOnly: true
    };
  }

  // 3. Execution: If mock or external provider is passed, handle defensively
  let rawResult;
  try {
    let usedEngine = 'pattern_engine';
    if (typeof options.customProvider === 'function') {
      // Allows testing external AI providers, network timeouts, and malformed responses
      rawResult = await options.customProvider(cleanDescription);
      usedEngine = 'custom_provider';
    } else if (getGeminiApiKey() && !options.forcePatternEngine) {
      // Optional external Google Gemini integration if key is present
      rawResult = await callGeminiModel(cleanDescription);
      usedEngine = 'gemini';
    } else {
      // Standard resilient classification pattern engine
      rawResult = classifyWithPatternEngine(cleanDescription);
    }

    // 4. Validate output on backend
    const validated = validateAiClassification(rawResult);
    validated.fallbackUsed = false;
    validated.engine = usedEngine;
    return validated;
  } catch (error) {
    if (logger.warn) {
      logger.warn('AI classification failed, falling back to resilient pattern engine:', error.message);
    } else {
      console.warn('[AIService] Provider failed, applying resilient fallback:', error.message);
    }

    // Resilience Rule: If AI fails or returns malformed data, fallback so workflow continues uninterrupted
    try {
      const fallbackResult = classifyWithPatternEngine(cleanDescription);
      const validatedFallback = validateAiClassification(fallbackResult);
      validatedFallback.fallbackUsed = true;
      return validatedFallback;
    } catch (fallbackError) {
      // Safe default guarantees workflow never halts
      return {
        category: 'OTHER',
        problemSummary: cleanDescription.slice(0, 120),
        possibleAreas: ['General on-site inspection'],
        suggestedService: 'General Inspection & Diagnostics',
        urgency: 'LOW',
        disclaimer: ADVISORY_DISCLAIMER,
        isRecommendationOnly: true,
        fallbackUsed: true
      };
    }
  }
};

/**
 * Optional Gemini API caller via global fetch
 * Encapsulated purely inside aiService.js
 */
const callGeminiModel = async (description) => {
  const apiKey = getGeminiApiKey();
  const model = getGeminiModel();
  const prompt = `You are an advisory assistant for an Indian home services platform called ServiceHub.
Analyze the customer's problem description and convert it into a structured service recommendation.

Customer problem: "${description}"

You must respond ONLY with a single valid JSON object strictly matching this schema:
{
  "category": "AC_REPAIR" | "PLUMBING" | "ELECTRICAL" | "RO_WATER_PURIFIER" | "APPLIANCE_REPAIR" | "ELECTRONICS" | "CARPENTRY" | "PAINTING" | "OTHER",
  "problemSummary": "concise description of the symptom",
  "possibleAreas": ["1 to 3 probable physical parts or areas to inspect"],
  "suggestedService": "suggested service title",
  "urgency": "LOW" | "MEDIUM" | "HIGH"
}

Do NOT output markdown code blocks. Do not add conversational text.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json'
      }
    }),
    signal: AbortSignal.timeout(6000)
  });

  if (!response.ok) {
    throw new Error(`Gemini API HTTP ${response.status}`);
  }

  const json = await response.json();
  const textContent = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textContent) {
    throw new Error('Empty response from Gemini API');
  }

  // Parse JSON defensively
  const cleanedText = textContent.replace(/```json/gi, '').replace(/```/g, '').trim();
  return JSON.parse(cleanedText);
};

// module.exports is at the bottom of this file — see end of aiService.js

// =========================================================
// FEATURE 2 — TECHNICIAN ESTIMATE ASSISTANCE
// AI can summarize inspection notes and suggest item
// descriptions. The technician remains fully responsible.
// =========================================================

/**
 * Pattern-based technician estimate assistant
 * @param {string} inspectionNotes
 * @param {string} [serviceName]
 * @returns {Object}
 */
function assistEstimateWithPatternEngine(inspectionNotes, serviceName = '') {
  const lower = (inspectionNotes || '').toLowerCase();
  const suggestions = [];

  // Labour
  suggestions.push({ type: 'LABOUR', description: 'Technician labour charges for on-site diagnosis and repair work' });

  // AC related
  if (lower.includes('capacitor')) suggestions.push({ type: 'PART', description: 'Capacitor replacement (motor/compressor start/run)' });
  if (lower.includes('gas') || lower.includes('refrigerant')) suggestions.push({ type: 'SERVICE', description: 'Refrigerant gas charging (R-22 / R-32) and leak test' });
  if (lower.includes('filter') || lower.includes('clean')) suggestions.push({ type: 'SERVICE', description: 'Air filter cleaning and coil wash' });
  if (lower.includes('compressor')) suggestions.push({ type: 'PART', description: 'Compressor replacement or overhaul' });
  if (lower.includes('pcb') || lower.includes('board')) suggestions.push({ type: 'PART', description: 'PCB control board replacement' });

  // Plumbing related
  if (lower.includes('washer') || lower.includes('tap') || lower.includes('faucet')) suggestions.push({ type: 'PART', description: 'Rubber washer and spindle replacement' });
  if (lower.includes('pipe') || lower.includes('joint')) suggestions.push({ type: 'PART', description: 'Pipe fitting and joint sealing' });
  if (lower.includes('drain') || lower.includes('clog')) suggestions.push({ type: 'SERVICE', description: 'Drain cleaning and blockage removal' });

  // Electrical related
  if (lower.includes('switch') || lower.includes('socket')) suggestions.push({ type: 'PART', description: 'Switch / socket module replacement' });
  if (lower.includes('mcb') || lower.includes('breaker')) suggestions.push({ type: 'PART', description: 'MCB breaker unit replacement' });
  if (lower.includes('wire') || lower.includes('wiring')) suggestions.push({ type: 'SERVICE', description: 'Electrical wiring inspection and re-routing' });

  // Geyser / water heater
  if (lower.includes('element') || lower.includes('geyser')) suggestions.push({ type: 'PART', description: 'Heating element replacement' });
  if (lower.includes('thermostat')) suggestions.push({ type: 'PART', description: 'Thermostat replacement' });

  // RO purifier
  if (lower.includes('membrane') || lower.includes('ro')) suggestions.push({ type: 'PART', description: 'RO membrane replacement' });
  if (lower.includes('pre-carbon') || lower.includes('carbon')) suggestions.push({ type: 'PART', description: 'Pre-carbon / post-carbon filter cartridge' });
  if (lower.includes('pump') || lower.includes('booster')) suggestions.push({ type: 'PART', description: 'Booster pump replacement' });

  // Generic parts
  if (lower.includes('motor')) suggestions.push({ type: 'PART', description: 'Motor unit replacement' });
  if (lower.includes('seal') || lower.includes('gasket')) suggestions.push({ type: 'PART', description: 'Rubber seal / gasket set' });

  // Consumables / visit charge
  suggestions.push({ type: 'OTHER', description: 'Consumables and sundry materials' });

  // Summarize inspection notes
  const words = (inspectionNotes || '').trim().split(/\s+/).filter(Boolean);
  const summary = words.length > 15
    ? words.slice(0, 15).join(' ') + '...'
    : inspectionNotes.trim();

  return {
    inspectionSummary: summary || 'On-site inspection and fault identification completed.',
    suggestedItems: suggestions,
    disclaimer: 'AI suggestions are advisory only. Technician must review and confirm all items, quantities, and prices.',
    isRecommendationOnly: true
  };
}

/**
 * AI Estimate Assistance — Feature 2
 * @param {string} inspectionNotes
 * @param {string} [serviceName]
 * @param {Object} [options]
 * @returns {Promise<Object>}
 */
const assistEstimate = async (inspectionNotes, serviceName = '', options = {}) => {
  if (!inspectionNotes || typeof inspectionNotes !== 'string' || !inspectionNotes.trim()) {
    const err = new Error('Inspection notes are required for estimate assistance.');
    err.statusCode = 400;
    throw err;
  }

  try {
    if (getGeminiApiKey() && !options.forcePatternEngine) {
      const result = await callGeminiEstimateAssist(inspectionNotes.trim(), serviceName);
      result.fallbackUsed = false;
      result.engine = 'gemini';
      return result;
    }
    const result = assistEstimateWithPatternEngine(inspectionNotes.trim(), serviceName);
    result.fallbackUsed = false;
    result.engine = 'pattern_engine';
    return result;
  } catch (err) {
    console.warn('[AIService] Estimate assist failed, falling back to pattern engine:', err.message);
    try {
      const fallback = assistEstimateWithPatternEngine(inspectionNotes.trim(), serviceName);
      fallback.fallbackUsed = true;
      fallback.engine = 'pattern_engine';
      return fallback;
    } catch (fallbackErr) {
      return {
        inspectionSummary: inspectionNotes.trim().slice(0, 100),
        suggestedItems: [
          { type: 'LABOUR', description: 'Technician labour and service charges' },
          { type: 'PART', description: 'Parts and materials as required' }
        ],
        disclaimer: 'AI unavailable. Suggestions are basic defaults only.',
        isRecommendationOnly: true,
        fallbackUsed: true
      };
    }
  }
};

/**
 * Gemini-powered estimate assist (optional)
 */
const callGeminiEstimateAssist = async (inspectionNotes, serviceName) => {
  const apiKey = getGeminiApiKey();
  const model = getGeminiModel();
  const prompt = `You are an assistant for a home services platform in India called ServiceHub.
A technician completed on-site inspection and wrote these notes: "${inspectionNotes}"
Service type: ${serviceName || 'General home service'}

Generate a structured advisory to help the technician prepare an accurate estimate.
Respond ONLY with a single valid JSON object matching this schema:
{
  "inspectionSummary": "1-2 sentence summary of the problem identified",
  "suggestedItems": [
    { "type": "LABOUR" | "PART" | "SERVICE" | "OTHER", "description": "concise item description" }
  ],
  "disclaimer": "AI suggestions are advisory only. Technician must confirm all details.",
  "isRecommendationOnly": true
}
Maximum 5 suggested items. Do NOT include prices. Do NOT output markdown.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, responseMimeType: 'application/json' }
    }),
    signal: AbortSignal.timeout(6000)
  });
  if (!response.ok) throw new Error(`Gemini HTTP ${response.status}`);
  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty Gemini response');
  const clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const parsed = JSON.parse(clean);
  parsed.isRecommendationOnly = true;
  return parsed;
};

// =========================================================
// FEATURE 3 — ADMIN PLATFORM SUMMARY
// AI generates informational summaries for admin.
// Never makes decisions, never approves/rejects anything.
// =========================================================

/**
 * Pattern-based admin summary generator
 */
function generateAdminSummaryWithPatternEngine(data, summaryType) {
  const { overview = {}, bookings = [], disputes = [], services = [] } = data;

  if (summaryType === 'bookings') {
    const total = overview.totalBookings || bookings.length || 0;
    const active = overview.activeBookings || 0;
    const completed = overview.completedBookings || 0;
    const pending = overview.pendingVerification || 0;
    return {
      summaryType: 'bookings',
      headline: `Platform has ${total} total bookings with ${active} currently active.`,
      insights: [
        `${completed} bookings have been successfully completed to date.`,
        active > 0 ? `${active} bookings are currently in progress across various service stages.` : 'No bookings are currently in progress.',
        pending > 0 ? `${pending} technician verification requests are pending admin review.` : 'No pending verification requests.',
        `Payment volume stands at ₹${overview.totalPaymentVolume?.toLocaleString('en-IN') || '0'} with ${overview.successfulPayments || 0} successful transactions.`
      ],
      disclaimer: 'AI summary is informational only. All decisions must be made by authorized personnel.',
      isInformationalOnly: true,
      generatedAt: new Date().toISOString()
    };
  }

  if (summaryType === 'disputes') {
    const openDisputes = overview.openDisputes || disputes.filter((d) => d.status === 'OPEN').length || 0;
    const totalDisputes = disputes.length || 0;
    return {
      summaryType: 'disputes',
      headline: `${openDisputes} open dispute(s) currently require admin attention.`,
      insights: [
        totalDisputes > 0 ? `${totalDisputes} disputes recorded on the platform.` : 'No disputes have been recorded.',
        openDisputes > 0
          ? `${openDisputes} dispute(s) are open and may need manual review and resolution.`
          : 'All disputes have been resolved or closed.',
        'Disputes are resolved via admin review only. AI cannot make dispute decisions.'
      ],
      disclaimer: 'AI summary is informational only. Dispute resolution must be performed by admin.',
      isInformationalOnly: true,
      generatedAt: new Date().toISOString()
    };
  }

  if (summaryType === 'service_trends') {
    const totalServices = services.length || overview.totalServices || 0;
    const totalCustomers = overview.totalCustomers || 0;
    const totalTechnicians = overview.totalTechnicians || 0;
    return {
      summaryType: 'service_trends',
      headline: `ServiceHub currently offers ${totalServices} active services with ${totalTechnicians} verified technicians serving ${totalCustomers} customers.`,
      insights: [
        `${totalServices} services are currently available on the platform.`,
        `${totalTechnicians} technicians are registered; only verified technicians receive customer requests.`,
        `${totalCustomers} customers are registered on the platform.`,
        overview.failedPayments > 0
          ? `${overview.failedPayments} failed payment(s) recorded — may indicate checkout flow issues worth reviewing.`
          : 'No failed payments reported recently.'
      ],
      disclaimer: 'AI summary is informational only and does not imply any automated action.',
      isInformationalOnly: true,
      generatedAt: new Date().toISOString()
    };
  }

  return {
    summaryType: summaryType || 'general',
    headline: 'ServiceHub platform operational summary.',
    insights: [
      `Total customers: ${overview.totalCustomers || 0}`,
      `Total technicians: ${overview.totalTechnicians || 0}`,
      `Active bookings: ${overview.activeBookings || 0}`,
      `Open disputes: ${overview.openDisputes || 0}`
    ],
    disclaimer: 'AI summary is informational only.',
    isInformationalOnly: true,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Admin AI Summary — Feature 3
 * @param {Object} data - Platform data snapshot (overview, bookings, disputes, services)
 * @param {string} summaryType - 'bookings' | 'disputes' | 'service_trends' | 'general'
 * @param {Object} [options]
 * @returns {Promise<Object>}
 */
const generateAdminSummary = async (data, summaryType = 'general', options = {}) => {
  try {
    if (getGeminiApiKey() && !options.forcePatternEngine) {
      const result = await callGeminiAdminSummary(data, summaryType);
      result.fallbackUsed = false;
      result.engine = 'gemini';
      return result;
    }
    const result = generateAdminSummaryWithPatternEngine(data, summaryType);
    result.fallbackUsed = false;
    result.engine = 'pattern_engine';
    return result;
  } catch (err) {
    console.warn('[AIService] Admin summary failed, falling back to pattern engine:', err.message);
    try {
      const fallback = generateAdminSummaryWithPatternEngine(data, summaryType);
      fallback.fallbackUsed = true;
      fallback.engine = 'pattern_engine';
      return fallback;
    } catch (fallbackErr) {
      return {
        summaryType,
        headline: 'Platform summary unavailable.',
        insights: ['AI summary service temporarily unavailable. Please review the dashboard data directly.'],
        disclaimer: 'AI summary is informational only.',
        isInformationalOnly: true,
        fallbackUsed: true,
        generatedAt: new Date().toISOString()
      };
    }
  }
};

/**
 * Gemini-powered admin summary (optional)
 */
const callGeminiAdminSummary = async (data, summaryType) => {
  const apiKey = getGeminiApiKey();
  const model = getGeminiModel();
  const { overview = {} } = data;
  const contextStr = JSON.stringify({
    totalCustomers: overview.totalCustomers || 0,
    totalTechnicians: overview.totalTechnicians || 0,
    activeBookings: overview.activeBookings || 0,
    completedBookings: overview.completedBookings || 0,
    totalPaymentVolume: overview.totalPaymentVolume || 0,
    openDisputes: overview.openDisputes || 0,
    pendingVerification: overview.pendingVerification || 0
  });

  const prompt = `You are an informational assistant for ServiceHub, an Indian home services platform.
Summarize the following platform statistics for the admin dashboard.
Summary type requested: ${summaryType}
Platform data: ${contextStr}

Rules:
- Be concise and factual. 
- Do NOT make decisions, recommendations about business actions, or suggest approving/rejecting anything.
- Provide 3-4 brief insights.
- Respond ONLY with a valid JSON object:
{
  "summaryType": "${summaryType}",
  "headline": "One sentence summary",
  "insights": ["insight 1", "insight 2", "insight 3"],
  "disclaimer": "AI summary is informational only.",
  "isInformationalOnly": true,
  "generatedAt": "${new Date().toISOString()}"
}
Do NOT output markdown.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.15, responseMimeType: 'application/json' }
    }),
    signal: AbortSignal.timeout(6000)
  });
  if (!response.ok) throw new Error(`Gemini HTTP ${response.status}`);
  const json = await response.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty Gemini response');
  const clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const parsed = JSON.parse(clean);
  parsed.isInformationalOnly = true;
  return parsed;
};

module.exports = {
  classifyServiceRequest,
  validateAiClassification,
  classifyWithPatternEngine,
  assistEstimate,
  generateAdminSummary,
  ALLOWED_CATEGORIES,
  ALLOWED_URGENCIES,
  ADVISORY_DISCLAIMER
};


