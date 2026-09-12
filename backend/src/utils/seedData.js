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

    console.log('[Seed] Seeding marketplace categories and services...');

    const categoriesData = [
      { name: 'Plumbing', slug: 'plumbing', icon: '🔧', description: 'Pipes, leaks, drains, water heaters, and fixture installations' },
      { name: 'Electrical', slug: 'electrical', icon: '⚡', description: 'Panel upgrades, smart lighting, EV chargers, and certified wiring' },
      { name: 'HVAC', slug: 'hvac', icon: '❄️', description: 'AC repair, seasonal heating tune-ups, heat pumps, and duct maintenance' },
      { name: 'Carpentry', slug: 'carpentry', icon: '🪚', description: 'Custom cabinets, interior framing, trim, deck and structural woodwork' },
      { name: 'Painting', slug: 'painting', icon: '🎨', description: 'Interior walls, exterior trim, drywall patching, and surface priming' },
      { name: 'Roofing', slug: 'roofing', icon: '🏠', description: 'Shingle repairs, leak detection, flashing, and gutter installations' }
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
        name: 'Emergency Pipe & Leak Repair',
        slug: 'emergency-pipe-leak-repair',
        description: 'Rapid diagnosis and repair of ruptured pipes, leaking valves, and supply line failures.',
        estimatedPriceRange: { min: 80, max: 250, currency: 'USD' }
      },
      {
        categoryId: catMap['plumbing'],
        name: 'Water Heater Installation & Flush',
        slug: 'water-heater-installation-flush',
        description: 'Complete replacement or preventative maintenance descaling of tankless and standard water heaters.',
        estimatedPriceRange: { min: 150, max: 500, currency: 'USD' }
      },
      {
        categoryId: catMap['plumbing'],
        name: 'Drain Snaking & Sewer Clearing',
        slug: 'drain-snaking-sewer-clearing',
        description: 'Motorized auger and camera inspection for stubborn mainline backups and kitchen drains.',
        estimatedPriceRange: { min: 90, max: 300, currency: 'USD' }
      },
      // Electrical
      {
        categoryId: catMap['electrical'],
        name: 'Electrical Panel Upgrade & Rewiring',
        slug: 'electrical-panel-upgrade-rewiring',
        description: 'Modern 200A breaker panel upgrades, subpanel additions, and whole-home code compliance rewiring.',
        estimatedPriceRange: { min: 250, max: 800, currency: 'USD' }
      },
      {
        categoryId: catMap['electrical'],
        name: 'EV Charger Installation',
        slug: 'ev-charger-installation',
        description: 'Dedicated 240V Level 2 charger circuit installation for all electric vehicle brands.',
        estimatedPriceRange: { min: 180, max: 450, currency: 'USD' }
      },
      // HVAC
      {
        categoryId: catMap['hvac'],
        name: 'Central AC Seasonal Tune-Up',
        slug: 'central-ac-seasonal-tune-up',
        description: 'Refrigerant pressure checks, condenser cleaning, capacitor test, and airflow calibration.',
        estimatedPriceRange: { min: 90, max: 220, currency: 'USD' }
      },
      {
        categoryId: catMap['hvac'],
        name: 'Furnace & Heat Pump Repair',
        slug: 'furnace-heat-pump-repair',
        description: 'Thermostat troubleshooting, blower motor repair, and heat exchanger safety inspection.',
        estimatedPriceRange: { min: 120, max: 400, currency: 'USD' }
      },
      // Carpentry
      {
        categoryId: catMap['carpentry'],
        name: 'Custom Cabinetry & Shelving',
        slug: 'custom-cabinetry-shelving',
        description: 'Built-in bookshelf, closet organization, and kitchen cabinet repair or trim installation.',
        estimatedPriceRange: { min: 200, max: 700, currency: 'USD' }
      },
      // Painting
      {
        categoryId: catMap['painting'],
        name: 'Interior Room Painting',
        slug: 'interior-room-painting',
        description: 'Surface prep, baseboard taping, two-coat premium finish for residential living spaces.',
        estimatedPriceRange: { min: 180, max: 650, currency: 'USD' }
      },
      // Roofing
      {
        categoryId: catMap['roofing'],
        name: 'Roof Shingle & Leak Repair',
        slug: 'roof-shingle-leak-repair',
        description: 'Replacement of wind-damaged shingles, valley flashing seal, and watertight roof patch.',
        estimatedPriceRange: { min: 150, max: 550, currency: 'USD' }
      }
    ];

    const createdServices = await Service.insertMany(servicesData);
    console.log(`[Seed] Successfully seeded ${createdCategories.length} categories and ${createdServices.length} services.`);

    // Seed 2 demo verified service providers if none exist
    const demoUser1 = await User.findOne({ email: 'apex.pro@servicehub.local' }) || await User.create({
      firebaseUid: 'demo_provider_uid_apex',
      name: 'Marcus Vance (Apex Heating & Electric)',
      email: 'apex.pro@servicehub.local',
      phone: '+1-555-0144',
      role: USER_ROLES.PROVIDER,
      status: USER_STATUS.ACTIVE
    });

    const demoUser2 = await User.findOne({ email: 'precision.pipe@servicehub.local' }) || await User.create({
      firebaseUid: 'demo_provider_uid_precision',
      name: 'Elena Rostova (Precision Plumbing Pros)',
      email: 'precision.pipe@servicehub.local',
      phone: '+1-555-0189',
      role: USER_ROLES.PROVIDER,
      status: USER_STATUS.ACTIVE
    });

    const existingP1 = await ProviderProfile.findOne({ userId: demoUser1._id });
    if (!existingP1) {
      await ProviderProfile.create({
        userId: demoUser1._id,
        businessName: 'Apex Heating, Cooling & Electrical',
        bio: 'Licensed Master Electrician & HVAC specialist with 14+ years serving the metro area. Guaranteed code compliance.',
        licenseNumber: 'EL-90281-MAST',
        insuranceDetails: { provider: 'Travelers General', policyNumber: 'TRV-8942-01' },
        categories: [catMap['electrical'], catMap['hvac']],
        status: PROVIDER_STATUS.VERIFIED,
        serviceArea: {
          cities: ['Downtown', 'North Metro', 'Silver Lake', 'Highland Park'],
          zipCodes: ['10001', '10002', '10003', '90026'],
          radiusKm: 30
        },
        availability: {
          days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
          workingHours: { start: '08:00', end: '19:00' },
          emergencyServices: true,
          noticeHours: 12
        },
        servicesOffered: [
          {
            serviceId: createdServices[3]._id, // Electrical Panel Upgrade
            customTitle: 'Certified 200A Panel Replacement',
            description: 'Full teardown and new Siemens breaker panel installation with municipal inspection sign-off.',
            pricing: { type: SERVICE_PRICING_TYPE.FIXED, amount: 480, currency: 'USD' },
            isActive: true
          },
          {
            serviceId: createdServices[5]._id, // Central AC Tune-Up
            customTitle: 'Comprehensive Spring AC Tune-Up',
            description: 'Full 21-point HVAC inspection, filter replacement, and condenser coil wash.',
            pricing: { type: SERVICE_PRICING_TYPE.STARTING_AT, amount: 99, currency: 'USD' },
            isActive: true
          }
        ],
        rating: { average: 4.9, count: 64 },
        completedJobsCount: 112
      });
    }

    const existingP2 = await ProviderProfile.findOne({ userId: demoUser2._id });
    if (!existingP2) {
      await ProviderProfile.create({
        userId: demoUser2._id,
        businessName: 'Precision Pipe & Drain Works',
        bio: 'Residential & commercial plumbing experts specializing in trenchless pipe repairs, emergency water stops, and sewer inspection.',
        licenseNumber: 'PL-3829-LIC',
        insuranceDetails: { provider: 'State Farm Commercial', policyNumber: 'SF-5501-PL' },
        categories: [catMap['plumbing']],
        status: PROVIDER_STATUS.VERIFIED,
        serviceArea: {
          cities: ['Downtown', 'West Hills', 'Eastside', 'Southbay'],
          zipCodes: ['10001', '10004', '90026', '90210'],
          radiusKm: 40
        },
        availability: {
          days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SUNDAY'],
          workingHours: { start: '07:30', end: '20:00' },
          emergencyServices: true,
          noticeHours: 6
        },
        servicesOffered: [
          {
            serviceId: createdServices[0]._id, // Emergency Leak Repair
            customTitle: 'Rapid Response Pipe Leak Detection & Stop',
            description: 'Thermal camera moisture tracking and copper/PEX pipe repair with 90-day warranty.',
            pricing: { type: SERVICE_PRICING_TYPE.STARTING_AT, amount: 89, currency: 'USD' },
            isActive: true
          },
          {
            serviceId: createdServices[2]._id, // Drain Snaking
            customTitle: 'Heavy-Duty Mainline Sewer Rooter',
            description: 'Electric snake clearance up to 100ft with complementary video drain inspection.',
            pricing: { type: SERVICE_PRICING_TYPE.FIXED, amount: 140, currency: 'USD' },
            isActive: true
          }
        ],
        rating: { average: 4.8, count: 48 },
        completedJobsCount: 89
      });
    }

    console.log('[Seed] Demo verified providers seeded successfully.');
  } catch (error) {
    console.error('[Seed] Error seeding marketplace data:', error.message);
  }
};

module.exports = { seedMarketplaceData };
