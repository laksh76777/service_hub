const ServiceCategory = require('../models/ServiceCategory');
const Service = require('../models/Service');
const ProviderProfile = require('../models/ProviderProfile');
const User = require('../models/User');
const Address = require('../models/Address');
const Booking = require('../models/Booking');
const {
  USER_ROLES,
  USER_STATUS,
  PROVIDER_STATUS,
  SERVICE_PRICING_TYPE,
  BOOKING_STATUS
} = require('./constants');

const seedMarketplaceData = async () => {
  try {
    console.log('[Seed] Ensuring Indian marketplace categories and services...');

    // 1. Categories
    const categoriesData = [
      {
        name: 'AC Servicing & Repair',
        slug: 'ac-servicing-repair',
        icon: '❄️',
        description: 'Split & window AC deep jet cleaning, gas charging, cooling coil repair, and installation'
      },
      {
        name: 'Plumbing',
        slug: 'plumbing',
        icon: '🔧',
        description: 'Pipes, tap leakage, drainage clearance, water tank cleaning, and sanitary fittings'
      },
      {
        name: 'Electrical Repair',
        slug: 'electrical-repair',
        icon: '⚡',
        description: 'MCB switches, wiring repair, inverter setup, ceiling fans, and appliance power points'
      },
      {
        name: 'RO Water Purifier',
        slug: 'ro-water-purifier',
        icon: '💧',
        description: 'Complete filter replacement, membrane change, booster pump repair, and servicing'
      },
      {
        name: 'Appliance Repair',
        slug: 'appliance-repair',
        icon: '🧺',
        description: 'Washing machine, refrigerator, microwave, and geyser heating element diagnosis'
      },
      {
        name: 'Electronics & Gadgets',
        slug: 'electronics-repair',
        icon: '💻',
        description: 'Smart TV screen and power board, laptop servicing, display repair, and OS diagnostics'
      },
      {
        name: 'Carpentry & Woodwork',
        slug: 'carpentry-woodwork',
        icon: '🪚',
        description: 'Door lock repair, modular kitchen hinges, wooden furniture assembly, and polishing'
      },
      {
        name: 'Painting & Waterproofing',
        slug: 'painting-waterproofing',
        icon: '🎨',
        description: 'Interior wall repainting, exterior primer, ceiling dampness, and waterproofing'
      }
    ];

    const catMap = {};
    for (const cat of categoriesData) {
      const savedCat = await ServiceCategory.findOneAndUpdate(
        { slug: cat.slug },
        { $set: cat },
        { upsert: true, new: true }
      );
      catMap[cat.slug] = savedCat._id;
    }

    // 2. Services
    const servicesData = [
      // 5 Canonical Primary Services
      {
        categoryId: catMap['ac-servicing-repair'],
        name: 'AC Repair',
        slug: 'ac-repair',
        description: 'Complete inspection, diagnostics, gas charging, cooling coil fix, and spare part replacement for all AC brands.',
        estimatedPriceRange: { min: 499, max: 1999, currency: 'INR' }
      },
      {
        categoryId: catMap['plumbing'],
        name: 'Plumbing',
        slug: 'plumbing',
        description: 'Expert plumbing services for pipeline leaks, tap & valve fixes, drain blockages, and bathroom sanitary fittings.',
        estimatedPriceRange: { min: 249, max: 999, currency: 'INR' }
      },
      {
        categoryId: catMap['electrical-repair'],
        name: 'Electrical Repair',
        slug: 'electrical-repair',
        description: 'Certified electrical repair for short circuits, MCB breaker trips, switchboard issues, and wiring faults.',
        estimatedPriceRange: { min: 249, max: 899, currency: 'INR' }
      },
      {
        categoryId: catMap['ro-water-purifier'],
        name: 'RO Repair',
        slug: 'ro-repair',
        description: 'RO water purifier servicing, multi-stage filter replacement, booster pump repair, and digital TDS water testing.',
        estimatedPriceRange: { min: 399, max: 1499, currency: 'INR' }
      },
      {
        categoryId: catMap['appliance-repair'],
        name: 'Appliance Repair',
        slug: 'appliance-repair',
        description: 'Comprehensive home appliance diagnosis and repair for refrigerators, washing machines, and geysers.',
        estimatedPriceRange: { min: 349, max: 1299, currency: 'INR' }
      },

      // AC Detailed Services
      {
        categoryId: catMap['ac-servicing-repair'],
        name: 'AC Inspection & Diagnostics',
        slug: 'ac-inspection-diagnostics',
        description: 'Comprehensive 25-point inspection, electrical load check, airflow analysis, and quote.',
        estimatedPriceRange: { min: 199, max: 399, currency: 'INR' }
      },
      {
        categoryId: catMap['ac-servicing-repair'],
        name: 'Split AC Deep Foam Jet Servicing',
        slug: 'split-ac-deep-foam-jet-servicing',
        description: 'High-pressure foam jet wash for indoor cooling coil and outdoor condenser unit.',
        estimatedPriceRange: { min: 499, max: 899, currency: 'INR' }
      },
      {
        categoryId: catMap['ac-servicing-repair'],
        name: 'AC Repair & Part Replacement',
        slug: 'ac-repair-part-replacement',
        description: 'Diagnosis and repair for cooling failures, PCB issues, sensor replacement, and noise fix.',
        estimatedPriceRange: { min: 799, max: 1899, currency: 'INR' }
      },
      {
        categoryId: catMap['ac-servicing-repair'],
        name: 'AC Installation & Uninstallation',
        slug: 'ac-installation-uninstallation',
        description: 'Professional wall bracket mounting, copper piping vacuuming, core drilling, and testing.',
        estimatedPriceRange: { min: 1499, max: 2499, currency: 'INR' }
      },
      {
        categoryId: catMap['ac-servicing-repair'],
        name: 'AC Refrigerant Gas Refill & Leak Fix',
        slug: 'ac-gas-charging-leak-diagnosis',
        description: 'Nitrogen pressure testing, copper brazing for leak seal, and complete R32/R410A refrigerant charge.',
        estimatedPriceRange: { min: 1499, max: 2899, currency: 'INR' }
      },

      // Plumbing
      {
        categoryId: catMap['plumbing'],
        name: 'Plumbing Visit & Inspection',
        slug: 'plumbing-general-visit-inspection',
        description: 'On-site diagnosis for pipeline leaks, low water pressure, and fixture problems.',
        estimatedPriceRange: { min: 249, max: 499, currency: 'INR' }
      },
      {
        categoryId: catMap['plumbing'],
        name: 'Tap & Pipe Leakage Repair',
        slug: 'tap-pipe-leakage-repair',
        description: 'Fix leaking bathroom/kitchen taps, replace washers, connection pipes and angle valves.',
        estimatedPriceRange: { min: 299, max: 699, currency: 'INR' }
      },
      {
        categoryId: catMap['plumbing'],
        name: 'Drainage & Pipe Blockage Removal',
        slug: 'drainage-pipe-blockage-removal',
        description: 'Snaking and chemical clearance of blocked kitchen sinks, wash basins, and bathroom traps.',
        estimatedPriceRange: { min: 399, max: 899, currency: 'INR' }
      },
      {
        categoryId: catMap['plumbing'],
        name: 'Bathroom Sanitary Fittings & Faucet Setup',
        slug: 'bathroom-sanitary-fittings-setup',
        description: 'Mounting of showers, health faucets, Jaguar/Kohler mixers, wash basins, and western commodes.',
        estimatedPriceRange: { min: 499, max: 1299, currency: 'INR' }
      },
      {
        categoryId: catMap['plumbing'],
        name: 'Overhead Water Tank Cleaning',
        slug: 'overhead-water-tank-cleaning',
        description: 'Multi-stage de-sludging, high-pressure washing, and antibacterial treatment for water tanks.',
        estimatedPriceRange: { min: 799, max: 1799, currency: 'INR' }
      },

      // Electrical
      {
        categoryId: catMap['electrical-repair'],
        name: 'Electrical Visit & Fault Diagnosis',
        slug: 'electrical-general-visit-diagnosis',
        description: 'Safety inspection for power trips, short circuits, voltage fluctuations, and load checks.',
        estimatedPriceRange: { min: 299, max: 599, currency: 'INR' }
      },
      {
        categoryId: catMap['electrical-repair'],
        name: 'Switchboard, Socket & MCB Fuse Repair',
        slug: 'switchboard-mcb-fuse-repair',
        description: 'Replacement of burnt switches, power sockets, miniature circuit breakers (MCBs), and fuses.',
        estimatedPriceRange: { min: 249, max: 699, currency: 'INR' }
      },
      {
        categoryId: catMap['electrical-repair'],
        name: 'Ceiling Fan Installation & Repair',
        slug: 'ceiling-fan-installation-repair',
        description: 'Mounting, regulator replacement, bearing greasing, and noise troubleshooting for ceiling fans.',
        estimatedPriceRange: { min: 199, max: 499, currency: 'INR' }
      },
      {
        categoryId: catMap['electrical-repair'],
        name: 'Concealed House Wiring & Circuit Tracing',
        slug: 'concealed-house-wiring-repair',
        description: 'Phase wire pulling, inverter line wiring, earthing installation, and distribution board repair.',
        estimatedPriceRange: { min: 499, max: 1499, currency: 'INR' }
      },

      // RO
      {
        categoryId: catMap['ro-water-purifier'],
        name: 'RO Purifier Complete Filter Replacement',
        slug: 'ro-purifier-filter-replacement',
        description: 'Replacement of sediment filter, pre-carbon, post-carbon blocks, and TDS calibration.',
        estimatedPriceRange: { min: 649, max: 1499, currency: 'INR' }
      },

      // Appliances
      {
        categoryId: catMap['appliance-repair'],
        name: 'Refrigerator Cooling & Compressor Diagnosis',
        slug: 'refrigerator-cooling-compressor-diagnosis',
        description: 'Thermostat testing, relay replacement, cooling coil defrosting, and gas recharging.',
        estimatedPriceRange: { min: 399, max: 1199, currency: 'INR' }
      },
      {
        categoryId: catMap['appliance-repair'],
        name: 'Washing Machine Spin & Drain Diagnostic',
        slug: 'washing-machine-spin-drain-diagnostic',
        description: 'Motor belt check, drain pump blockage clearance, vibration damper adjustment, and PCB check.',
        estimatedPriceRange: { min: 349, max: 849, currency: 'INR' }
      },
      {
        categoryId: catMap['appliance-repair'],
        name: 'Geyser / Water Heater Element Repair',
        slug: 'geyser-water-heater-element-repair',
        description: 'Thermostat testing, replacement of scaled heating element, sacrificial anode check, and wiring fix.',
        estimatedPriceRange: { min: 399, max: 999, currency: 'INR' }
      },

      // Electronics
      {
        categoryId: catMap['electronics-repair'],
        name: 'Smart TV Screen & Power Board Repair',
        slug: 'smart-tv-power-display-repair',
        description: 'Power supply board capacitor fix, backlight LED strip replacement, and HDMI port repair.',
        estimatedPriceRange: { min: 499, max: 1999, currency: 'INR' }
      },
      {
        categoryId: catMap['electronics-repair'],
        name: 'Laptop Diagnosis, OS & Hardware Servicing',
        slug: 'laptop-diagnosis-hardware-servicing',
        description: 'Thermal paste reapplication, fan cleanup, RAM/SSD upgrade, hinge repair, and OS fix.',
        estimatedPriceRange: { min: 399, max: 1499, currency: 'INR' }
      }
    ];

    const srvMap = {};
    for (const srv of servicesData) {
      const savedSrv = await Service.findOneAndUpdate(
        { slug: srv.slug },
        { $set: srv },
        { upsert: true, new: true }
      );
      srvMap[srv.slug] = savedSrv;
    }

    console.log(`[Seed] Successfully synchronized ${categoriesData.length} categories and ${servicesData.length} services.`);

    // =========================================================================
    // 3. DEMO ACCOUNTS SETUP
    // =========================================================================
    console.log('[Seed] Synchronizing demo users (Admin, Customer, 3 Technicians)...');

    // 3a. Demo Admin Account (abc@gmail.com)
    const adminUser = await User.findOneAndUpdate(
      { email: 'abc@gmail.com' },
      {
        $setOnInsert: { firebaseUid: 'demo_admin_uid_abc' },
        $set: {
          name: 'System Administrator',
          role: USER_ROLES.ADMIN,
          status: USER_STATUS.ACTIVE
        }
      },
      { upsert: true, new: true }
    );
    console.log(`[Seed] Demo Admin ready: ${adminUser.email} (Role: ${adminUser.role})`);

    // 3b. Demo Customer Account (laksh@gmail.com)
    const customerUser = await User.findOneAndUpdate(
      { email: 'laksh@gmail.com' },
      {
        $setOnInsert: { firebaseUid: 'demo_customer_uid_laksh' },
        $set: {
          name: 'Laksh Suthar',
          phone: '+91 98765 12345',
          role: USER_ROLES.CUSTOMER,
          status: USER_STATUS.ACTIVE
        }
      },
      { upsert: true, new: true }
    );
    console.log(`[Seed] Demo Customer ready: ${customerUser.email} (Name: ${customerUser.name})`);

    // Customer Saved Demo Address
    const customerAddress = await Address.findOneAndUpdate(
      { userId: customerUser._id, label: 'home' },
      {
        $set: {
          userId: customerUser._id,
          label: 'home',
          addressLine1: '42, 2nd Cross, 12th Main Road',
          addressLine2: 'Indiranagar Stage 2',
          locality: 'Indiranagar',
          landmark: 'Near Defence Colony Park',
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: '560038',
          isDefault: true
        }
      },
      { upsert: true, new: true }
    );
    console.log(`[Seed] Demo Customer saved address ready: ${customerAddress.addressLine1}, ${customerAddress.city}`);

    // 3c. TECHNICIAN 1: Rahul Sharma (CoolCare Services - AC Technician)
    const techUser1 = await User.findOneAndUpdate(
      { email: 'ac@gmail.com' },
      {
        $setOnInsert: { firebaseUid: 'demo_tech_uid_ac' },
        $set: {
          name: 'Rahul Sharma',
          phone: '+91 98765 43210',
          role: USER_ROLES.TECHNICIAN,
          status: USER_STATUS.ACTIVE
        }
      },
      { upsert: true, new: true }
    );

    // Keep legacy alias in sync for backward compatibility with older test suites
    await User.findOneAndUpdate(
      { email: 'ac.tech@servicehub.demo' },
      { $set: { name: 'Rahul Sharma', role: USER_ROLES.TECHNICIAN, status: USER_STATUS.ACTIVE } },
      { upsert: true }
    );

    await ProviderProfile.findOneAndUpdate(
      { userId: techUser1._id },
      {
        $set: {
          userId: techUser1._id,
          businessName: 'CoolCare AC Solutions',
          profession: 'AC Technician',
          experience: '6 years',
          experienceYears: 6,
          bio: 'Professional AC Technician with 6 years experience in Bengaluru. Certified multi-brand expert for Daikin, Voltas, LG, and Hitachi. 100% genuine parts and 30-day workmanship guarantee.',
          licenseNumber: 'KA-HVAC-2021',
          insuranceDetails: { provider: 'HDFC ERGO Commercial Insurance', policyNumber: 'HE-9021-HVAC' },
          categories: [catMap['ac-servicing-repair']],
          status: PROVIDER_STATUS.VERIFIED,
          serviceArea: {
            cities: ['Bengaluru', 'Indiranagar', 'Whitefield', 'Koramangala'],
            pincodes: ['560001', '560038', '560066', '560034'],
            zipCodes: ['560001', '560038', '560066', '560034'],
            radiusKm: 25
          },
          availability: {
            days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
            workingHours: { start: '08:00', end: '20:00' },
            emergencyServices: true,
            noticeHours: 4
          },
          servicesOffered: [
            {
              serviceId: srvMap['ac-repair']._id,
              customTitle: 'AC Repair',
              description: 'Complete inspection, diagnostics, gas charging, cooling coil fix, and spare part replacement for all AC brands.',
              pricing: { type: SERVICE_PRICING_TYPE.FIXED, amount: 499, currency: 'INR' },
              isActive: true
            },
            {
              serviceId: srvMap['ac-inspection-diagnostics']._id,
              customTitle: 'AC Inspection & Complete Diagnosis Visit',
              description: 'Comprehensive 25-point inspection, gas pressure test, and diagnostic report.',
              pricing: { type: SERVICE_PRICING_TYPE.FIXED, amount: 199, currency: 'INR' },
              isActive: true
            },
            {
              serviceId: srvMap['split-ac-deep-foam-jet-servicing']._id,
              customTitle: 'Split AC Deep Foam Jet Servicing',
              description: 'Deep high pressure cleaning for indoor cooling coil, blower, and outdoor condenser.',
              pricing: { type: SERVICE_PRICING_TYPE.FIXED, amount: 499, currency: 'INR' },
              isActive: true
            },
            {
              serviceId: srvMap['ac-repair-part-replacement']._id,
              customTitle: 'Expert AC Repair & Part Replacement',
              description: 'Fix cooling failures, PCB issues, sensor replacement, and noise troubleshooting.',
              pricing: { type: SERVICE_PRICING_TYPE.FIXED, amount: 799, currency: 'INR' },
              isActive: true
            },
            {
              serviceId: srvMap['ac-installation-uninstallation']._id,
              customTitle: 'AC Installation & Heavy Mounting',
              description: 'Professional wall bracket mounting, copper vacuuming, core drilling, and test run.',
              pricing: { type: SERVICE_PRICING_TYPE.FIXED, amount: 1499, currency: 'INR' },
              isActive: true
            },
            {
              serviceId: srvMap['ac-gas-charging-leak-diagnosis']._id,
              customTitle: 'AC Refrigerant Gas Charging & Leak Seal',
              description: 'Nitrogen leak testing, copper pipe brazing, and complete R32/R410A gas top-up.',
              pricing: { type: SERVICE_PRICING_TYPE.FIXED, amount: 1899, currency: 'INR' },
              isActive: true
            }
          ],
          rating: { average: 4.8, count: 54 },
          completedJobsCount: 126
        }
      },
      { upsert: true, new: true }
    );
    console.log(`[Seed] Demo Technician 1 ready: Rahul Sharma (ac@gmail.com - AC Technician)`);

    // 3d. TECHNICIAN 2: Imran Khan (QuickFix Plumbing - Plumber)
    const techUser2 = await User.findOneAndUpdate(
      { email: 'plumber@gmail.com' },
      {
        $setOnInsert: { firebaseUid: 'demo_tech_uid_plumber' },
        $set: {
          name: 'Imran Khan',
          phone: '+91 98123 45678',
          role: USER_ROLES.TECHNICIAN,
          status: USER_STATUS.ACTIVE
        }
      },
      { upsert: true, new: true }
    );

    await User.findOneAndUpdate(
      { email: 'plumber@servicehub.demo' },
      { $set: { name: 'Imran Khan', role: USER_ROLES.TECHNICIAN, status: USER_STATUS.ACTIVE } },
      { upsert: true }
    );

    await ProviderProfile.findOneAndUpdate(
      { userId: techUser2._id },
      {
        $set: {
          userId: techUser2._id,
          businessName: 'QuickFix Plumbing',
          profession: 'Plumber',
          experience: '7 years',
          experienceYears: 7,
          bio: 'Experienced plumbing technician with 7 years serving Bengaluru apartments and homes. Specialist in concealed pipe leakage, tap repairs, overhead tank cleanups, and bathroom fittings.',
          licenseNumber: 'KA-PLUMB-2020',
          insuranceDetails: { provider: 'ICICI Lombard Commercial', policyNumber: 'IL-8832-PL' },
          categories: [catMap['plumbing']],
          status: PROVIDER_STATUS.VERIFIED,
          serviceArea: {
            cities: ['Bengaluru', 'Koramangala', 'HSR Layout', 'BTM Layout'],
            pincodes: ['560001', '560034', '560102', '560068'],
            zipCodes: ['560001', '560034', '560102', '560068'],
            radiusKm: 25
          },
          availability: {
            days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'],
            workingHours: { start: '08:00', end: '21:00' },
            emergencyServices: true,
            noticeHours: 2
          },
          servicesOffered: [
            {
              serviceId: srvMap['plumbing']._id,
              customTitle: 'Plumbing',
              description: 'Expert plumbing services for pipeline leaks, tap & valve fixes, drain blockages, and bathroom sanitary fittings.',
              pricing: { type: SERVICE_PRICING_TYPE.STARTING_AT, amount: 249, currency: 'INR' },
              isActive: true
            },
            {
              serviceId: srvMap['plumbing-general-visit-inspection']._id,
              customTitle: 'Plumbing Visit & Inspection Call',
              description: 'Quick diagnosis of domestic water leakage, pipe joints, and flow check.',
              pricing: { type: SERVICE_PRICING_TYPE.STARTING_AT, amount: 249, currency: 'INR' },
              isActive: true
            },
            {
              serviceId: srvMap['tap-pipe-leakage-repair']._id,
              customTitle: 'Tap Leakage & Valve Replacement',
              description: 'Precision repairs for kitchen and bathroom mixer taps, spindle replacements.',
              pricing: { type: SERVICE_PRICING_TYPE.FIXED, amount: 299, currency: 'INR' },
              isActive: true
            },
            {
              serviceId: srvMap['drainage-pipe-blockage-removal']._id,
              customTitle: 'Pipe Blockage & Drain Clearance',
              description: 'Manual and motorized snake clearance for blocked sinks, wash basins, and traps.',
              pricing: { type: SERVICE_PRICING_TYPE.FIXED, amount: 399, currency: 'INR' },
              isActive: true
            },
            {
              serviceId: srvMap['bathroom-sanitary-fittings-setup']._id,
              customTitle: 'Bathroom Sanitary Fittings Setup',
              description: 'Installation of health faucets, overhead showers, towel rods, and wash basins.',
              pricing: { type: SERVICE_PRICING_TYPE.FIXED, amount: 499, currency: 'INR' },
              isActive: true
            }
          ],
          rating: { average: 4.7, count: 48 },
          completedJobsCount: 92
        }
      },
      { upsert: true, new: true }
    );
    console.log(`[Seed] Demo Technician 2 ready: Imran Khan (plumber@gmail.com - Plumber)`);

    // 3e. TECHNICIAN 3: Arjun Patel (PowerFix Electricals - Electrician)
    const techUser3 = await User.findOneAndUpdate(
      { email: 'electrician@gmail.com' },
      {
        $setOnInsert: { firebaseUid: 'demo_tech_uid_electrician' },
        $set: {
          name: 'Arjun Patel',
          phone: '+91 98987 65432',
          role: USER_ROLES.TECHNICIAN,
          status: USER_STATUS.ACTIVE
        }
      },
      { upsert: true, new: true }
    );

    await User.findOneAndUpdate(
      { email: 'electrician@servicehub.demo' },
      { $set: { name: 'Arjun Patel', role: USER_ROLES.TECHNICIAN, status: USER_STATUS.ACTIVE } },
      { upsert: true }
    );

    await ProviderProfile.findOneAndUpdate(
      { userId: techUser3._id },
      {
        $set: {
          userId: techUser3._id,
          businessName: 'PowerFix Electricals',
          profession: 'Electrician',
          experience: '5 years',
          experienceYears: 5,
          bio: 'Licensed electrical technician with 5 years experience across Bengaluru. Rapid dispatch for MCB tripping, ceiling fans, power point wiring, switchboard fix, and inverter installation.',
          licenseNumber: 'KA-ELEC-2022',
          insuranceDetails: { provider: 'National Insurance Trade Shield', policyNumber: 'NI-4412-ELEC' },
          categories: [catMap['electrical-repair']],
          status: PROVIDER_STATUS.VERIFIED,
          serviceArea: {
            cities: ['Bengaluru', 'Jayanagar', 'JP Nagar', 'Electronic City'],
            pincodes: ['560001', '560011', '560078', '560100'],
            zipCodes: ['560001', '560011', '560078', '560100'],
            radiusKm: 30
          },
          availability: {
            days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
            workingHours: { start: '08:30', end: '20:30' },
            emergencyServices: true,
            noticeHours: 3
          },
          servicesOffered: [
            {
              serviceId: srvMap['electrical-repair']._id,
              customTitle: 'Electrical Repair',
              description: 'Certified electrical repair for short circuits, MCB breaker trips, switchboard issues, and wiring faults.',
              pricing: { type: SERVICE_PRICING_TYPE.STARTING_AT, amount: 249, currency: 'INR' },
              isActive: true
            },
            {
              serviceId: srvMap['electrical-general-visit-diagnosis']._id,
              customTitle: 'Electrical Visit & Fault Diagnosis Call',
              description: 'General inspection for power failure, earthing check, and load balance testing.',
              pricing: { type: SERVICE_PRICING_TYPE.STARTING_AT, amount: 299, currency: 'INR' },
              isActive: true
            },
            {
              serviceId: srvMap['switchboard-mcb-fuse-repair']._id,
              customTitle: 'Switch, Socket & MCB Breaker Repair',
              description: 'Replacing burnt switchboards, 16A appliance points, and MCB circuit breaker trips.',
              pricing: { type: SERVICE_PRICING_TYPE.FIXED, amount: 249, currency: 'INR' },
              isActive: true
            },
            {
              serviceId: srvMap['ceiling-fan-installation-repair']._id,
              customTitle: 'Ceiling Fan Installation & Repair',
              description: 'Ceiling fan balancing, rod mounting, regulator replacement, and bearing repair.',
              pricing: { type: SERVICE_PRICING_TYPE.FIXED, amount: 199, currency: 'INR' },
              isActive: true
            },
            {
              serviceId: srvMap['concealed-house-wiring-repair']._id,
              customTitle: 'Concealed House Wiring & Circuit Tracing',
              description: 'New phase wire pulling, short circuit isolation, and distribution board cleanup.',
              pricing: { type: SERVICE_PRICING_TYPE.STARTING_AT, amount: 499, currency: 'INR' },
              isActive: true
            }
          ],
          rating: { average: 4.9, count: 62 },
          completedJobsCount: 115
        }
      },
      { upsert: true, new: true }
    );
    console.log(`[Seed] Demo Technician 3 ready: Arjun Patel (electrician@gmail.com - Electrician)`);

    // 3f. TECHNICIAN 4: Suresh Verma (PureFlow RO Systems - RO Technician)
    const techUser4 = await User.findOneAndUpdate(
      { email: 'ro@gmail.com' },
      {
        $setOnInsert: { firebaseUid: 'demo_tech_uid_ro' },
        $set: {
          name: 'Suresh Verma',
          phone: '+91 97654 32109',
          role: USER_ROLES.TECHNICIAN,
          status: USER_STATUS.ACTIVE
        }
      },
      { upsert: true, new: true }
    );

    await ProviderProfile.findOneAndUpdate(
      { userId: techUser4._id },
      {
        $set: {
          userId: techUser4._id,
          businessName: 'PureFlow RO Systems',
          profession: 'RO Technician',
          experience: '4 years',
          experienceYears: 4,
          bio: 'Certified water purification specialist with 4 years experience. Expertise in Kent, Aquaguard, Pureit, and Livpure. Comprehensive filter replacement, membrane descaling, booster pump testing, and digital TDS calibration.',
          licenseNumber: 'KA-RO-2023',
          insuranceDetails: { provider: 'Bajaj Allianz General Insurance', policyNumber: 'BA-7719-RO' },
          categories: [catMap['ro-water-purifier']],
          status: PROVIDER_STATUS.VERIFIED,
          serviceArea: {
            cities: ['Bengaluru', 'Hebbal', 'Yelahanka', 'Malleshwaram'],
            pincodes: ['560001', '560003', '560024', '560064'],
            zipCodes: ['560001', '560003', '560024', '560064'],
            radiusKm: 25
          },
          availability: {
            days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
            workingHours: { start: '09:00', end: '19:00' },
            emergencyServices: false,
            noticeHours: 3
          },
          servicesOffered: [
            {
              serviceId: srvMap['ro-repair']._id,
              customTitle: 'RO Repair',
              description: 'RO water purifier servicing, multi-stage filter replacement, booster pump repair, and digital TDS water testing.',
              pricing: { type: SERVICE_PRICING_TYPE.FIXED, amount: 399, currency: 'INR' },
              isActive: true
            },
            {
              serviceId: srvMap['ro-purifier-filter-replacement']._id,
              customTitle: 'RO Purifier Complete Filter Replacement & Service',
              description: 'Sediment, carbon block, and post-carbon filter renewal with TDS quality calibration.',
              pricing: { type: SERVICE_PRICING_TYPE.FIXED, amount: 649, currency: 'INR' },
              isActive: true
            }
          ],
          rating: { average: 4.8, count: 41 },
          completedJobsCount: 84
        }
      },
      { upsert: true, new: true }
    );
    console.log(`[Seed] Demo Technician 4 ready: Suresh Verma (ro@gmail.com - RO Technician)`);

    // 3g. TECHNICIAN 5: Vikram Singh (SmartCare Home Appliances - Home Appliance Technician)
    const techUser5 = await User.findOneAndUpdate(
      { email: 'appliance@gmail.com' },
      {
        $setOnInsert: { firebaseUid: 'demo_tech_uid_appliance' },
        $set: {
          name: 'Vikram Singh',
          phone: '+91 96543 21098',
          role: USER_ROLES.TECHNICIAN,
          status: USER_STATUS.ACTIVE
        }
      },
      { upsert: true, new: true }
    );

    await ProviderProfile.findOneAndUpdate(
      { userId: techUser5._id },
      {
        $set: {
          userId: techUser5._id,
          businessName: 'SmartCare Home Appliances',
          profession: 'Home Appliance Technician',
          experience: '8 years',
          experienceYears: 8,
          bio: 'Master home appliance technician with 8 years hands-on field experience. Specialist in double-door refrigerators, front/top load washing machines, microwave ovens, and storage geysers. Genuine spare parts guaranteed.',
          licenseNumber: 'KA-APPL-2019',
          insuranceDetails: { provider: 'Tata AIG General Insurance', policyNumber: 'TA-9921-APPL' },
          categories: [catMap['appliance-repair']],
          status: PROVIDER_STATUS.VERIFIED,
          serviceArea: {
            cities: ['Bengaluru', 'Indiranagar', 'Bellandur', 'Marathahalli'],
            pincodes: ['560001', '560037', '560038', '560103'],
            zipCodes: ['560001', '560037', '560038', '560103'],
            radiusKm: 30
          },
          availability: {
            days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'],
            workingHours: { start: '08:00', end: '20:00' },
            emergencyServices: true,
            noticeHours: 2
          },
          servicesOffered: [
            {
              serviceId: srvMap['appliance-repair']._id,
              customTitle: 'Appliance Repair',
              description: 'Comprehensive home appliance diagnosis and repair for refrigerators, washing machines, and geysers.',
              pricing: { type: SERVICE_PRICING_TYPE.STARTING_AT, amount: 349, currency: 'INR' },
              isActive: true
            },
            {
              serviceId: srvMap['refrigerator-cooling-compressor-diagnosis']._id,
              customTitle: 'Refrigerator Cooling & Compressor Diagnostics',
              description: 'Relay, thermostat, cooling gas, and fan motor diagnostic inspection.',
              pricing: { type: SERVICE_PRICING_TYPE.STARTING_AT, amount: 399, currency: 'INR' },
              isActive: true
            },
            {
              serviceId: srvMap['washing-machine-spin-drain-diagnostic']._id,
              customTitle: 'Washing Machine Spin & Drain Diagnostic',
              description: 'Vibration, motor belt, drain pump blockage, and electronic PCB check.',
              pricing: { type: SERVICE_PRICING_TYPE.FIXED, amount: 349, currency: 'INR' },
              isActive: true
            },
            {
              serviceId: srvMap['geyser-water-heater-element-repair']._id,
              customTitle: 'Geyser / Water Heater Heating Element Fix',
              description: 'Thermostat replacement, tank descaling, and heating element repair.',
              pricing: { type: SERVICE_PRICING_TYPE.FIXED, amount: 399, currency: 'INR' },
              isActive: true
            }
          ],
          rating: { average: 4.9, count: 75 },
          completedJobsCount: 140
        }
      },
      { upsert: true, new: true }
    );
    console.log(`[Seed] Demo Technician 5 ready: Vikram Singh (appliance@gmail.com - Home Appliance Technician)`);

    // =========================================================================
    // 4. DEMO END-TO-END FLOW SAMPLE BOOKING
    // =========================================================================
    const existingDemoBooking = await Booking.findOne({
      customerId: customerUser._id,
      providerId: techUser1._id,
      problemDescription: 'AC is running but not cooling properly.'
    });

    if (!existingDemoBooking) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await Booking.create({
        bookingNumber: 'BK-1042-8821',
        customerId: customerUser._id,
        providerId: techUser1._id,
        serviceId: srvMap['ac-repair-part-replacement']._id,
        status: BOOKING_STATUS.REQUESTED,
        address: {
          addressLine1: customerAddress.addressLine1,
          addressLine2: customerAddress.addressLine2,
          locality: customerAddress.locality,
          landmark: customerAddress.landmark,
          city: customerAddress.city,
          state: customerAddress.state,
          pincode: customerAddress.pincode
        },
        scheduledDate: tomorrow,
        preferredTimeSlot: 'Morning (09:00 - 12:00)',
        problemDescription: 'AC is running but not cooling properly.',
        pricing: {
          estimatedTotal: 799,
          currency: 'INR'
        },
        statusHistory: [
          {
            previousStatus: null,
            newStatus: BOOKING_STATUS.REQUESTED,
            changedAt: new Date(),
            actor: {
              userId: customerUser._id,
              role: USER_ROLES.CUSTOMER,
              name: customerUser.name
            },
            reason: 'Customer submitted AC service request'
          }
        ]
      });
      console.log(`[Seed] Pre-seeded demo booking created: Laksh Suthar -> CoolCare Services (AC Repair)`);
    }

    console.log('[Seed] All Indian demo data and demo accounts synchronized successfully.');
  } catch (error) {
    console.error('[Seed] Error seeding marketplace data:', error.message);
  }
};

module.exports = { seedMarketplaceData };
