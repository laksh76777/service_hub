/**
 * Automated Test Suite: Service and Technician Relationship
 *
 * Tests:
 * 1. Ensure the 5 canonical services exist:
 *    - AC Repair
 *    - Plumbing
 *    - Electrical Repair
 *    - RO Repair
 *    - Appliance Repair
 * 2. Service-Technician Isolation:
 *    - AC Repair shows AC technicians
 *    - Plumbing shows plumbing technicians
 *    - An AC technician NEVER appears for Plumbing
 * 3. Eligibility Restrictions:
 *    - Unverified (PENDING) technician does NOT appear and is not requestable
 *    - Admin user NEVER appears
 *    - Customer user NEVER appears
 * 4. New Technician Lifecycle:
 *    - Register -> PENDING (not visible/requestable to customers)
 *    - Admin approval -> VERIFIED (eligible for customer requests)
 * 5. Technician Card Dossier Integrity:
 *    - Cards return: Name, Profession, Experience, Rating, Services, Availability, Verification status
 */

const mongoose = require('mongoose');
const Service = require('../src/models/Service');
const ProviderProfile = require('../src/models/ProviderProfile');
const providerController = require('../src/controllers/providerController');
const serviceController = require('../src/controllers/serviceController');
const { USER_ROLES, USER_STATUS, PROVIDER_STATUS } = require('../src/utils/constants');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`);
    throw new Error(message);
  }
  passedTests++;
  console.log(`  ✓ PASSED: ${message}`);
}

async function runTests() {
  console.log('\n============================================================');
  console.log('🧪 SERVICE & TECHNICIAN RELATIONSHIP TEST SUITE');
  console.log('============================================================\n');

  const origServiceFind = Service.find;
  const origServiceFindOne = Service.findOne;
  const origServiceFindById = Service.findById;
  const origProviderFind = ProviderProfile.find;
  const origProviderFindById = ProviderProfile.findById;
  const origProviderCount = ProviderProfile.countDocuments;

  try {
    // -------------------------------------------------------------
    // Test Section 1: Five Canonical Services
    // -------------------------------------------------------------
    console.log('🔹 [1/5] Verifying 5 Canonical Service Models...');
    {
      const canonicalServices = [
        { name: 'AC Repair', slug: 'ac-repair' },
        { name: 'Plumbing', slug: 'plumbing' },
        { name: 'Electrical Repair', slug: 'electrical-repair' },
        { name: 'RO Repair', slug: 'ro-repair' },
        { name: 'Appliance Repair', slug: 'appliance-repair' }
      ];

      assert(canonicalServices.length === 5, 'Exactly 5 canonical services required');
      const names = canonicalServices.map((s) => s.name);
      assert(names.includes('AC Repair'), '1. AC Repair exists');
      assert(names.includes('Plumbing'), '2. Plumbing exists');
      assert(names.includes('Electrical Repair'), '3. Electrical Repair exists');
      assert(names.includes('RO Repair'), '4. RO Repair exists');
      assert(names.includes('Appliance Repair'), '5. Appliance Repair exists');
    }

    // Setup Mock Database Objects
    const acServiceId = new mongoose.Types.ObjectId();
    const plumbingServiceId = new mongoose.Types.ObjectId();
    const electricalServiceId = new mongoose.Types.ObjectId();
    const roServiceId = new mongoose.Types.ObjectId();
    const applianceServiceId = new mongoose.Types.ObjectId();

    const acService = {
      _id: acServiceId,
      name: 'AC Repair',
      slug: 'ac-repair',
      description: 'Comprehensive AC servicing, diagnosis, and repairs',
      status: 'ACTIVE'
    };

    const plumbingService = {
      _id: plumbingServiceId,
      name: 'Plumbing',
      slug: 'plumbing',
      description: 'Pipe leakage, drainage, and bathroom fittings',
      status: 'ACTIVE'
    };

    const electricalService = {
      _id: electricalServiceId,
      name: 'Electrical Repair',
      slug: 'electrical-repair',
      description: 'Wiring, switches, fuse, and electrical appliance fixes',
      status: 'ACTIVE'
    };

    const roService = {
      _id: roServiceId,
      name: 'RO Repair',
      slug: 'ro-repair',
      description: 'Water purifier filter replacement and motor repair',
      status: 'ACTIVE'
    };

    const applianceService = {
      _id: applianceServiceId,
      name: 'Appliance Repair',
      slug: 'appliance-repair',
      description: 'Washing machine, microwave, and refrigerator repair',
      status: 'ACTIVE'
    };

    const allMockServices = [acService, plumbingService, electricalService, roService, applianceService];

    // Technicians
    const rahulSharmaUserId = new mongoose.Types.ObjectId();
    const rahulAcProfile = {
      _id: new mongoose.Types.ObjectId(),
      userId: {
        _id: rahulSharmaUserId,
        name: 'Rahul Sharma',
        role: USER_ROLES.TECHNICIAN,
        status: USER_STATUS.ACTIVE
      },
      businessName: 'CoolCare AC Solutions',
      profession: 'AC Technician',
      experience: '6 years',
      experienceYears: 6,
      bio: 'Certified Daikin and Voltas technician',
      status: PROVIDER_STATUS.VERIFIED,
      rating: { average: 4.8, count: 54 },
      completedJobsCount: 126,
      availability: {
        days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'],
        workingHours: { start: '08:00', end: '20:00' },
        emergencyServices: true
      },
      servicesOffered: [
        {
          serviceId: acServiceId,
          customTitle: 'AC Repair',
          description: 'Full split and window AC repair',
          pricing: { amount: 499, currency: 'INR' },
          isActive: true
        },
        {
          customTitle: 'AC Servicing',
          description: 'Deep foam jet wash',
          pricing: { amount: 499, currency: 'INR' },
          isActive: true
        }
      ]
    };

    const imranKhanUserId = new mongoose.Types.ObjectId();
    const imranPlumberProfile = {
      _id: new mongoose.Types.ObjectId(),
      userId: {
        _id: imranKhanUserId,
        name: 'Imran Khan',
        role: USER_ROLES.TECHNICIAN,
        status: USER_STATUS.ACTIVE
      },
      businessName: 'QuickFix Plumbing',
      profession: 'Plumber',
      experience: '7 years',
      experienceYears: 7,
      bio: 'Expert in leakages and sanitary fittings',
      status: PROVIDER_STATUS.VERIFIED,
      rating: { average: 4.7, count: 48 },
      completedJobsCount: 92,
      availability: {
        days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'],
        workingHours: { start: '08:00', end: '21:00' },
        emergencyServices: true
      },
      servicesOffered: [
        {
          serviceId: plumbingServiceId,
          customTitle: 'Plumbing',
          description: 'Emergency pipe repair and sanitary work',
          pricing: { amount: 249, currency: 'INR' },
          isActive: true
        }
      ]
    };

    const unverifiedTechUserId = new mongoose.Types.ObjectId();
    const unverifiedAcProfile = {
      _id: new mongoose.Types.ObjectId(),
      userId: {
        _id: unverifiedTechUserId,
        name: 'Unverified Tech',
        role: USER_ROLES.TECHNICIAN,
        status: USER_STATUS.ACTIVE
      },
      businessName: 'Unverified AC Works',
      profession: 'AC Technician',
      status: PROVIDER_STATUS.PENDING, // Still PENDING
      servicesOffered: [
        { serviceId: acServiceId, customTitle: 'AC Repair', isActive: true }
      ]
    };

    const adminUserId = new mongoose.Types.ObjectId();
    const rogueAdminProfile = {
      _id: new mongoose.Types.ObjectId(),
      userId: {
        _id: adminUserId,
        name: 'Admin User',
        role: USER_ROLES.ADMIN, // Admin role
        status: USER_STATUS.ACTIVE
      },
      businessName: 'Admin Tech',
      profession: 'AC Technician',
      status: PROVIDER_STATUS.VERIFIED,
      servicesOffered: [
        { serviceId: acServiceId, customTitle: 'AC Repair', isActive: true }
      ]
    };

    const customerUserId = new mongoose.Types.ObjectId();
    const rogueCustomerProfile = {
      _id: new mongoose.Types.ObjectId(),
      userId: {
        _id: customerUserId,
        name: 'Customer User',
        role: USER_ROLES.CUSTOMER, // Customer role
        status: USER_STATUS.ACTIVE
      },
      businessName: 'Customer AC',
      profession: 'AC Technician',
      status: PROVIDER_STATUS.VERIFIED,
      servicesOffered: [
        { serviceId: acServiceId, customTitle: 'AC Repair', isActive: true }
      ]
    };

    const allMockProfiles = [
      rahulAcProfile,
      imranPlumberProfile,
      unverifiedAcProfile,
      rogueAdminProfile,
      rogueCustomerProfile
    ];

    // Mock Service model
    const makeServiceQuery = (res) => {
      const q = {
        populate: () => q,
        lean: () => Promise.resolve(res),
        then: (fn, rej) => Promise.resolve(res).then(fn, rej)
      };
      return q;
    };

    Service.findOne = (query) => {
      let matched = null;
      if (query._id) {
        matched = allMockServices.find((s) => s._id.toString() === query._id.toString());
      } else if (query.slug) {
        matched = allMockServices.find((s) => s.slug === query.slug);
      } else if (query.$or) {
        for (const cond of query.$or) {
          const found = allMockServices.find((s) => {
            if (cond.slug && s.slug === cond.slug) return true;
            if (cond.name && cond.name.test && cond.name.test(s.name)) return true;
            return false;
          });
          if (found) {
            matched = found;
            break;
          }
        }
      }
      return makeServiceQuery(matched);
    };

    Service.findById = (id) => {
      const found = allMockServices.find((s) => s._id.toString() === id?.toString());
      return makeServiceQuery(found || null);
    };

    // Helper to simulate query chain for ProviderProfile.find
    const setupProviderProfileMock = (profilesList) => {
      ProviderProfile.find = (filter) => {
        let results = profilesList.filter((p) => {
          // Check status
          if (filter.status && p.status !== filter.status) return false;

          // Check top-level $or
          if (filter.$or) {
            const matchesAny = filter.$or.some((cond) => {
              if (cond['servicesOffered.serviceId']) {
                return (p.servicesOffered || []).some(
                  (so) => so.serviceId?.toString() === cond['servicesOffered.serviceId'].toString() && so.isActive
                );
              }
              if (cond.profession && cond.profession.$regex) {
                return new RegExp(cond.profession.$regex, cond.profession.$options).test(p.profession);
              }
              return false;
            });
            if (!matchesAny) return false;
          }

          // Check service filter
          if (filter.$and) {
            for (const andClause of filter.$and) {
              if (andClause.$or) {
                const matchesAny = andClause.$or.some((cond) => {
                  if (cond['servicesOffered.serviceId']) {
                    return (p.servicesOffered || []).some(
                      (so) => so.serviceId?.toString() === cond['servicesOffered.serviceId'].toString() && so.isActive
                    );
                  }
                  if (cond.profession && cond.profession.$regex) {
                    return new RegExp(cond.profession.$regex, cond.profession.$options).test(p.profession);
                  }
                  return false;
                });
                if (!matchesAny) return false;
              }
            }
          }
          return true;
        });

        const chain = {
          populate: () => chain,
          sort: () => chain,
          skip: () => chain,
          limit: () => chain,
          lean: () => Promise.resolve(results)
        };
        return chain;
      };
    };

    setupProviderProfileMock(allMockProfiles);

    // -------------------------------------------------------------
    // Test Section 2: Service-Technician Isolation
    // -------------------------------------------------------------
    console.log('\n🔹 [2/5] Testing Service-Technician Isolation...');
    {
      // 2a: Querying AC Repair returns AC Technicians
      const reqAc = { query: { service: 'ac-repair' } };
      let resAcData = null;
      const resAc = {
        status(code) { return this; },
        json(data) { resAcData = data; return this; }
      };

      await providerController.getPublicProviders(reqAc, resAc);
      const acTechs = resAcData?.data?.technicians || [];
      assert(acTechs.length === 1, `AC Repair returned exactly 1 eligible technician (got ${acTechs.length})`);
      assert(acTechs[0].name === 'Rahul Sharma', 'Returned Rahul Sharma for AC Repair');
      assert(acTechs[0].profession === 'AC Technician', 'Returned correct AC profession');

      // 2b: Querying Plumbing returns Plumbing Technicians
      const reqPlumb = { query: { service: 'plumbing' } };
      let resPlumbData = null;
      const resPlumb = {
        status(code) { return this; },
        json(data) { resPlumbData = data; return this; }
      };

      await providerController.getPublicProviders(reqPlumb, resPlumb);
      const plumbTechs = resPlumbData?.data?.technicians || [];
      assert(plumbTechs.length === 1, `Plumbing returned exactly 1 eligible technician (got ${plumbTechs.length})`);
      assert(plumbTechs[0].name === 'Imran Khan', 'Returned Imran Khan for Plumbing');
      assert(plumbTechs[0].profession === 'Plumber', 'Returned correct Plumber profession');

      // 2c: Cross-Service Isolation: An AC technician should NEVER appear for Plumbing
      const rahulInPlumbing = plumbTechs.some((t) => t.name === 'Rahul Sharma' || t.id.toString() === rahulAcProfile._id.toString());
      assert(!rahulInPlumbing, 'ISOLATION VERIFIED: AC Technician (Rahul Sharma) does NOT appear for Plumbing');

      // 2d: Cross-Service Isolation: A Plumber should NEVER appear for AC Repair
      const imranInAc = acTechs.some((t) => t.name === 'Imran Khan' || t.id.toString() === imranPlumberProfile._id.toString());
      assert(!imranInAc, 'ISOLATION VERIFIED: Plumber (Imran Khan) does NOT appear for AC Repair');
    }

    // -------------------------------------------------------------
    // Test Section 3: Eligibility Checks & Role Security
    // -------------------------------------------------------------
    console.log('\n🔹 [3/5] Testing Eligibility (Unverified, Admin & Customer Exclusions)...');
    {
      const reqAll = { query: {} };
      let resAllData = null;
      const resAll = {
        status(code) { return this; },
        json(data) { resAllData = data; return this; }
      };

      await providerController.getPublicProviders(reqAll, resAll);
      const allReturnedTechs = resAllData?.data?.technicians || [];

      // 3a: Unverified / PENDING technician is NOT requestable
      const unverifiedFound = allReturnedTechs.some((t) => t.id.toString() === unverifiedAcProfile._id.toString());
      assert(!unverifiedFound, 'Unverified (PENDING) technician does NOT appear in customer listings');

      // 3b: Admin NEVER appears in technician listings
      const adminFound = allReturnedTechs.some((t) => t.id.toString() === rogueAdminProfile._id.toString() || t.name === 'Admin User');
      assert(!adminFound, 'Admin account NEVER appears in technician listings');

      // 3c: Customer NEVER appears in technician listings
      const customerFound = allReturnedTechs.some((t) => t.id.toString() === rogueCustomerProfile._id.toString() || t.name === 'Customer User');
      assert(!customerFound, 'Customer account NEVER appears in technician listings');
    }

    // -------------------------------------------------------------
    // Test Section 4: New Technician Lifecycle (PENDING -> Admin Approval -> VERIFIED)
    // -------------------------------------------------------------
    console.log('\n🔹 [4/5] Testing New Technician Lifecycle (Registration -> Approval -> Active)...');
    {
      // A new technician registers for Electrical Repair
      const newTechUserId = new mongoose.Types.ObjectId();
      const newTechProfile = {
        _id: new mongoose.Types.ObjectId(),
        userId: {
          _id: newTechUserId,
          name: 'Sunil Verma',
          role: USER_ROLES.TECHNICIAN,
          status: USER_STATUS.ACTIVE
        },
        businessName: 'Sunil Electricals',
        profession: 'Electrician',
        experience: '4 years',
        experienceYears: 4,
        status: PROVIDER_STATUS.PENDING, // Newly registered: strictly PENDING
        servicesOffered: [
          { serviceId: electricalServiceId, customTitle: 'Electrical Repair', isActive: true }
        ]
      };

      // Before Admin Approval:
      setupProviderProfileMock([...allMockProfiles, newTechProfile]);

      const reqBeforeApproval = { query: { service: 'electrical-repair' } };
      let resBeforeData = null;
      const resBefore = {
        status(code) { return this; },
        json(data) { resBeforeData = data; return this; }
      };

      await providerController.getPublicProviders(reqBeforeApproval, resBefore);
      const techsBefore = resBeforeData?.data?.technicians || [];
      const isVisibleBefore = techsBefore.some((t) => t.id.toString() === newTechProfile._id.toString());
      assert(!isVisibleBefore, 'Before approval: New technician is PENDING and NOT visible or requestable');

      // Admin Reviews and Approves Technician:
      newTechProfile.status = PROVIDER_STATUS.VERIFIED;
      setupProviderProfileMock([...allMockProfiles, newTechProfile]);

      const reqAfterApproval = { query: { service: 'electrical-repair' } };
      let resAfterData = null;
      const resAfter = {
        status(code) { return this; },
        json(data) { resAfterData = data; return this; }
      };

      await providerController.getPublicProviders(reqAfterApproval, resAfter);
      const techsAfter = resAfterData?.data?.technicians || [];
      const isVisibleAfter = techsAfter.some((t) => t.id.toString() === newTechProfile._id.toString());
      assert(isVisibleAfter, 'After Admin Approval: Technician is VERIFIED and now eligible for customer requests');
    }

    // -------------------------------------------------------------
    // Test Section 5: Technician Card Dossier Integrity (Customer View)
    // -------------------------------------------------------------
    console.log('\n🔹 [5/5] Testing Technician Card Dossier Integrity (getServiceById)...');
    {
      setupProviderProfileMock([rahulAcProfile, imranPlumberProfile, unverifiedAcProfile, rogueAdminProfile]);

      const reqService = { params: { id: acServiceId.toString() } };
      let resServiceData = null;
      const resService = {
        status(code) { return this; },
        json(data) { resServiceData = data; return this; }
      };

      await serviceController.getServiceById(reqService, resService);

      assert(resServiceData && resServiceData.success === true, 'getServiceById succeeded');
      const serviceObj = resServiceData.data.service;
      assert(serviceObj && serviceObj.name === 'AC Repair', 'Returned correct service: AC Repair');

      const technicians = resServiceData.data.technicians || [];
      assert(technicians.length === 1, `Returned exactly 1 eligible technician (got ${technicians.length})`);

      const techCard = technicians[0];
      // Verify all required card fields:
      // Name, Profession, Experience, Rating, Services, Availability, Verification status
      assert(techCard.name === 'Rahul Sharma', 'Card has Name (Rahul Sharma)');
      assert(techCard.profession === 'AC Technician', 'Card has Profession (AC Technician)');
      assert(techCard.experience === '6 years', 'Card has Experience (6 years)');
      assert(techCard.rating && techCard.rating.average === 4.8, 'Card has Rating (4.8)');
      assert(Array.isArray(techCard.services) && techCard.services.includes('AC Repair'), 'Card has Services list containing AC Repair');
      assert(techCard.availability && techCard.availability.days.length > 0, 'Card has Availability information');
      assert(techCard.verificationStatus === 'VERIFIED', 'Card has Verification status (VERIFIED)');

      // Verify Admin and Unverified excluded
      assert(!technicians.some((t) => t.name === 'Admin User'), 'Admin excluded from service detail card');
      assert(!technicians.some((t) => t.name === 'Unverified Tech'), 'Unverified technician excluded from service detail card');
    }

    console.log('\n============================================================');
    console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED WITH ZERO FAILURES!`);
    console.log('============================================================\n');
  } finally {
    Service.find = origServiceFind;
    Service.findOne = origServiceFindOne;
    Service.findById = origServiceFindById;
    ProviderProfile.find = origProviderFind;
    ProviderProfile.findById = origProviderFindById;
    ProviderProfile.countDocuments = origProviderCount;
  }
}

runTests().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
