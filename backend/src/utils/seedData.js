const ServiceCategory = require('../models/ServiceCategory');
const Service = require('../models/Service');
const ProviderProfile = require('../models/ProviderProfile');
const User = require('../models/User');
const { USER_ROLES, USER_STATUS, PROVIDER_STATUS, SERVICE_PRICING_TYPE } = require('./constants');

const seedMarketplaceData = async () => {
  try {
    const categoryCount = await ServiceCategory.countDocuments();
    if (categoryCount > 0) {
      return; // Already seeded
    }

    console.log('[Seed] Seeding Indian marketplace categories and services...');

    const categoriesData = [
      { name: 'Plumbing', slug: 'plumbing', icon: '🔧', description: 'Pipes, tap leakage, drainage clearance, water tank cleaning, and sanitary fittings' },
      { name: 'Electrical Repair', slug: 'electrical-repair', icon: '⚡', description: 'MCB switches, wiring repair, inverter setup, ceiling fans, and appliance points' },
      { name: 'AC Servicing & Repair', slug: 'ac-servicing-repair', icon: '❄️', description: 'Split AC deep jet cleaning, gas charging, cooling coil repair, and installation' },
      { name: 'RO Water Purifier', slug: 'ro-water-purifier', icon: '💧', description: 'Complete filter replacement, membrane change, booster pump repair, and servicing' },
      { name: 'Appliance Repair', slug: 'appliance-repair', icon: '🧺', description: 'Washing machine, refrigerator, microwave, and geyser heating element diagnosis' },
      { name: 'Carpentry & Woodwork', slug: 'carpentry-woodwork', icon: '🪚', description: 'Door lock repair, modular kitchen hinges, wooden furniture assembly, and polishing' },
      { name: 'Painting & Waterproofing', slug: 'painting-waterproofing', icon: '🎨', description: 'Interior wall repainting, exterior primer, ceiling dampness, and waterproofing' }
    ];

    const createdCategories = await ServiceCategory.insertMany(categoriesData);
    const catMap = {};
    createdCategories.forEach((c) => {
      catMap[c.slug] = c._id;
    });

    const servicesData = [
      // Plumbing
      {
        categoryId: catMap['plumbing'],
        name: 'Tap & Pipe Leakage Repair',
        slug: 'tap-pipe-leakage-repair',
        description: 'Fix leaking bathroom/kitchen taps, replace washers, repair connection pipes and angle valves.',
        estimatedPriceRange: { min: 249, max: 599, currency: 'INR' }
      },
      {
        categoryId: catMap['plumbing'],
        name: 'Drainage & Pipe Blockage Removal',
        slug: 'drainage-pipe-blockage-removal',
        description: 'Snaking and chemical clearance of blocked kitchen sinks, wash basins, and balcony gully traps.',
        estimatedPriceRange: { min: 399, max: 899, currency: 'INR' }
      },
      {
        categoryId: catMap['plumbing'],
        name: 'Overhead Water Tank Cleaning',
        slug: 'overhead-water-tank-cleaning',
        description: 'Multi-stage de-sludging, high-pressure washing, antibacterial UV treatment for sintex and RCC tanks.',
        estimatedPriceRange: { min: 799, max: 1799, currency: 'INR' }
      },
      // Electrical
      {
        categoryId: catMap['electrical-repair'],
        name: 'Switchboard & MCB Fuse Repair',
        slug: 'switchboard-mcb-fuse-repair',
        description: 'Replacement of burnt switches, sockets, miniature circuit breakers (MCBs), and short-circuit tracing.',
        estimatedPriceRange: { min: 299, max: 699, currency: 'INR' }
      },
      {
        categoryId: catMap['electrical-repair'],
        name: 'Ceiling Fan Installation & Repair',
        slug: 'ceiling-fan-installation-repair',
        description: 'Mounting, regulator replacement, bearing greasing, and noise troubleshooting for ceiling and exhaust fans.',
        estimatedPriceRange: { min: 199, max: 499, currency: 'INR' }
      },
      // AC
      {
        categoryId: catMap['ac-servicing-repair'],
        name: 'Split AC Deep Foam Jet Servicing',
        slug: 'split-ac-deep-foam-jet-servicing',
        description: 'High-pressure foam jet wash for indoor cooling coil and outdoor condenser, drain tray antibacterial wash.',
        estimatedPriceRange: { min: 499, max: 899, currency: 'INR' }
      },
      {
        categoryId: catMap['ac-servicing-repair'],
        name: 'AC Gas Charging & Leak Diagnosis',
        slug: 'ac-gas-charging-leak-diagnosis',
        description: 'Nitrogen pressure testing, copper brazing for leak seal, vacuuming, and complete R32/R410A refrigerant recharge.',
        estimatedPriceRange: { min: 1499, max: 2799, currency: 'INR' }
      },
      // RO
      {
        categoryId: catMap['ro-water-purifier'],
        name: 'RO Purifier Complete Filter Replacement',
        slug: 'ro-purifier-filter-replacement',
        description: 'Replacement of sediment filter, pre-carbon, post-carbon blocks, and TDS level calibration.',
        estimatedPriceRange: { min: 649, max: 1499, currency: 'INR' }
      },
      // Appliances
      {
        categoryId: catMap['appliance-repair'],
        name: 'Geyser / Water Heater Element Repair',
        slug: 'geyser-water-heater-element-repair',
        description: 'Thermostat testing, replacement of scaled heating element, sacrificial anode check, and wiring fix.',
        estimatedPriceRange: { min: 399, max: 999, currency: 'INR' }
      },
      {
        categoryId: catMap['appliance-repair'],
        name: 'Washing Machine Spin & Drain Diagnostic',
        slug: 'washing-machine-spin-drain-diagnostic',
        description: 'Motor belt check, drain pump blockage clearance, vibration damper adjustment, and PCB power check.',
        estimatedPriceRange: { min: 349, max: 849, currency: 'INR' }
      }
    ];

    const createdServices = await Service.insertMany(servicesData);
    console.log(`[Seed] Successfully seeded ${createdCategories.length} categories and ${createdServices.length} Indian services.`);

    // Seed 2 demo verified Indian service providers if none exist
    const demoUser1 = (await User.findOne({ email: 'sharma.electricals@servicehub.local' })) || (await User.create({
      firebaseUid: 'demo_provider_uid_sharma',
      name: 'Rajesh Sharma',
      email: 'sharma.electricals@servicehub.local',
      phone: '+91 98765 43210',
      role: USER_ROLES.PROVIDER,
      status: USER_STATUS.ACTIVE
    }));

    const demoUser2 = (await User.findOne({ email: 'verma.plumbing@servicehub.local' })) || (await User.create({
      firebaseUid: 'demo_provider_uid_verma',
      name: 'Sunil Verma',
      email: 'verma.plumbing@servicehub.local',
      phone: '+91 98123 45678',
      role: USER_ROLES.PROVIDER,
      status: USER_STATUS.ACTIVE
    }));

    const existingP1 = await ProviderProfile.findOne({ userId: demoUser1._id });
    if (!existingP1) {
      await ProviderProfile.create({
        userId: demoUser1._id,
        businessName: 'Sharma Electricals & AC Care',
        bio: 'Certified electrical and air conditioning specialist with 12+ years serving residential societies across Bengaluru. 100% genuine parts and verified warranty.',
        licenseNumber: 'KA-ELEC-9028',
        insuranceDetails: { provider: 'HDFC ERGO General Insurance', policyNumber: 'HE-90281-COM' },
        categories: [catMap['electrical-repair'], catMap['ac-servicing-repair']],
        status: PROVIDER_STATUS.VERIFIED,
        serviceArea: {
          cities: ['Bengaluru', 'Electronic City', 'Whitefield', 'Indiranagar'],
          pincodes: ['560001', '560034', '560038', '560100', '560102'],
          zipCodes: ['560001', '560034', '560038', '560100', '560102'],
          radiusKm: 25
        },
        availability: {
          days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
          workingHours: { start: '08:30', end: '19:30' },
          emergencyServices: true,
          noticeHours: 4
        },
        servicesOffered: [
          {
            serviceId: createdServices[3]._id, // Switchboard & MCB Repair
            customTitle: 'MCB & Power Point Replacement with Inspection',
            description: 'Genuine Havells/Schneider MCB replacement with load testing and insulation check.',
            pricing: { type: SERVICE_PRICING_TYPE.FIXED, amount: 349, currency: 'INR' },
            isActive: true
          },
          {
            serviceId: createdServices[5]._id, // Split AC Foam Jet Servicing
            customTitle: 'Intense Foam Jet Deep Cleaning for Split AC',
            description: 'Includes indoor unit jacket washing, outdoor unit pressure spray, and temperature check.',
            pricing: { type: SERVICE_PRICING_TYPE.FIXED, amount: 549, currency: 'INR' },
            isActive: true
          }
        ],
        rating: { average: 4.9, count: 68 },
        completedJobsCount: 142
      });
    }

    const existingP2 = await ProviderProfile.findOne({ userId: demoUser2._id });
    if (!existingP2) {
      await ProviderProfile.create({
        userId: demoUser2._id,
        businessName: 'Verma Plumbing & Sanitary Care',
        bio: 'Trusted residential plumbing team specializing in concealed pipe leak detection, blockage removal, overhead tank cleaning, and sanitary fittings.',
        licenseNumber: 'KA-PLUMB-3829',
        insuranceDetails: { provider: 'ICICI Lombard Commercial', policyNumber: 'IL-5501-PL' },
        categories: [catMap['plumbing']],
        status: PROVIDER_STATUS.VERIFIED,
        serviceArea: {
          cities: ['Bengaluru', 'Koramangala', 'HSR Layout', 'BTM Layout'],
          pincodes: ['560001', '560034', '560068', '560095'],
          zipCodes: ['560001', '560034', '560068', '560095'],
          radiusKm: 30
        },
        availability: {
          days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SUNDAY'],
          workingHours: { start: '08:00', end: '20:00' },
          emergencyServices: true,
          noticeHours: 2
        },
        servicesOffered: [
          {
            serviceId: createdServices[0]._id, // Tap & Pipe Leakage Repair
            customTitle: 'Rapid Response Tap Leakage & Valve Repair',
            description: 'Complete inspection of bathroom and kitchen pipelines with Kohler/Jaguar compatible fittings.',
            pricing: { type: SERVICE_PRICING_TYPE.STARTING_AT, amount: 299, currency: 'INR' },
            isActive: true
          },
          {
            serviceId: createdServices[1]._id, // Drainage & Blockage Removal
            customTitle: 'Motorized Kitchen & Bathroom Drain Clearance',
            description: 'Thorough auger clearance up to 30 feet to clear grease, food waste, and hair debris.',
            pricing: { type: SERVICE_PRICING_TYPE.FIXED, amount: 449, currency: 'INR' },
            isActive: true
          }
        ],
        rating: { average: 4.8, count: 52 },
        completedJobsCount: 97
      });
    }

    console.log('[Seed] Indian demo verified providers seeded successfully.');
  } catch (error) {
    console.error('[Seed] Error seeding marketplace data:', error.message);
  }
};

module.exports = { seedMarketplaceData };
