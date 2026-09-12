/**
 * Standalone Seed Script for Demo Accounts & Marketplace Catalog
 * Run with: npm run seed:demo
 * 
 * Synchronizes:
 * 1. Demo Administrator (abc@gmail.com)
 * 2. Demo Customer (laksh@gmail.com) with saved Bengaluru address
 * 3. 3 Demo Technicians (ac.tech@servicehub.demo, plumber@servicehub.demo, electrician@servicehub.demo)
 * 4. 8 Service Categories & 19 Services with realistic INR (₹) pricing
 * 5. Pre-seeded demo booking for end-to-end testing
 * 6. If FIREBASE_API_KEY is present, automatically provisions Firebase Auth accounts and binds UIDs.
 */

require('dotenv').config();
const { connectDB, disconnectDB } = require('../src/config/database');
const { seedMarketplaceData } = require('../src/utils/seedData');
const User = require('../src/models/User');

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY;

const DEMO_ACCOUNTS = [
  {
    email: 'abc@gmail.com',
    password: process.env.DEMO_PASSWORD || '123456',
    role: 'ADMIN',
    name: 'System Administrator'
  },
  {
    email: 'laksh@gmail.com',
    password: process.env.DEMO_PASSWORD || '123456',
    role: 'CUSTOMER',
    name: 'Laksh Suthar'
  },
  {
    email: 'ac@gmail.com',
    password: process.env.DEMO_PASSWORD || '123456',
    role: 'TECHNICIAN',
    name: 'Rahul Sharma'
  },
  {
    email: 'plumber@gmail.com',
    password: process.env.DEMO_PASSWORD || '123456',
    role: 'TECHNICIAN',
    name: 'Imran Khan'
  },
  {
    email: 'electrician@gmail.com',
    password: process.env.DEMO_PASSWORD || '123456',
    role: 'TECHNICIAN',
    name: 'Arjun Patel'
  },
  {
    email: 'ro@gmail.com',
    password: process.env.DEMO_PASSWORD || '123456',
    role: 'TECHNICIAN',
    name: 'Suresh Verma'
  },
  {
    email: 'appliance@gmail.com',
    password: process.env.DEMO_PASSWORD || '123456',
    role: 'TECHNICIAN',
    name: 'Vikram Singh'
  },
  // Legacy aliases
  {
    email: 'ac.tech@servicehub.demo',
    password: process.env.DEMO_PASSWORD || '123456',
    role: 'TECHNICIAN',
    name: 'Rahul Sharma'
  },
  {
    email: 'plumber@servicehub.demo',
    password: process.env.DEMO_PASSWORD || '123456',
    role: 'TECHNICIAN',
    name: 'Imran Khan'
  },
  {
    email: 'electrician@servicehub.demo',
    password: process.env.DEMO_PASSWORD || '123456',
    role: 'TECHNICIAN',
    name: 'Arjun Patel'
  }
];

const callIdentityToolkit = async (endpoint, payload) => {
  if (!FIREBASE_API_KEY) return null;
  const url = `https://identitytoolkit.googleapis.com/v1/${endpoint}?key=${FIREBASE_API_KEY}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
};

const syncFirebaseAccounts = async () => {
  if (!FIREBASE_API_KEY) {
    console.log('\n[Firebase Provisioner] FIREBASE_API_KEY not detected. Skipping automatic Firebase Auth account provisioning.');
    console.log('You can manually create the demo users in the Firebase Console (Authentication -> Users).');
    return;
  }

  console.log('\n[Firebase Provisioner] Checking and provisioning demo accounts in Firebase Authentication...');

  for (const acc of DEMO_ACCOUNTS) {
    try {
      // 1. Attempt signUp
      const signUpRes = await callIdentityToolkit('accounts:signUp', {
        email: acc.email,
        password: acc.password,
        returnSecureToken: true
      });

      let firebaseUid = null;

      if (signUpRes?.ok && signUpRes.data?.localId) {
        firebaseUid = signUpRes.data.localId;
        console.log(`✓ Firebase account created: ${acc.email} (UID: ${firebaseUid})`);
      } else if (signUpRes?.data?.error?.message?.includes('EMAIL_EXISTS')) {
        // Account already exists in Firebase Auth, sign in to retrieve UID
        const signInRes = await callIdentityToolkit('accounts:signInWithPassword', {
          email: acc.email,
          password: acc.password,
          returnSecureToken: true
        });

        if (signInRes?.ok && signInRes.data?.localId) {
          firebaseUid = signInRes.data.localId;
          console.log(`✓ Firebase account already exists: ${acc.email} (UID: ${firebaseUid})`);
        } else {
          console.log(`ℹ Firebase account exists for ${acc.email}. UID will be bound automatically upon next user login.`);
        }
      } else {
        console.log(`ℹ Note for ${acc.email}: ${signUpRes?.data?.error?.message || 'Will be provisioned manually'}`);
      }

      // If we acquired UID, sync it into MongoDB user record immediately
      if (firebaseUid) {
        await User.updateOne({ email: acc.email }, { $set: { firebaseUid } });
      }
    } catch (err) {
      console.warn(`[Firebase Provisioner] Warning for ${acc.email}:`, err.message);
    }
  }
};

const run = async () => {
  console.log('====================================================');
  console.log('STARTING DEMO ENVIRONMENT SEED & INITIALIZATION');
  console.log('====================================================\n');

  try {
    await connectDB();
    await seedMarketplaceData();
    await syncFirebaseAccounts();

    console.log('\n====================================================');
    console.log('DEMO ACCOUNTS REFERENCE SUMMARY:');
    console.log('====================================================');
    console.log('1. ADMIN:');
    console.log('   Email:    abc@gmail.com');
    console.log('   Role:     ADMIN\n');
    console.log('2. CUSTOMER:');
    console.log('   Email:    laksh@gmail.com');
    console.log('   Name:     Laksh Suthar');
    console.log('   Location: Indiranagar, Bengaluru (560038)');
    console.log('   Role:     CUSTOMER\n');
    console.log('3. TECHNICIAN 1 (AC):');
    console.log('   Email:    ac.tech@servicehub.demo');
    console.log('   Name:     Rahul Sharma (CoolCare Services)');
    console.log('   Role:     PROVIDER (4.8★, Verified)\n');
    console.log('4. TECHNICIAN 2 (Plumbing):');
    console.log('   Email:    plumber@servicehub.demo');
    console.log('   Name:     Imran Khan (QuickFix Plumbing)');
    console.log('   Role:     PROVIDER (4.7★, Verified)\n');
    console.log('5. TECHNICIAN 3 (Electrical):');
    console.log('   Email:    electrician@servicehub.demo');
    console.log('   Name:     Arjun Patel (PowerFix Electricals)');
    console.log('   Role:     PROVIDER (4.9★, Verified)\n');
    console.log('Password for all demo accounts: 123456 (local/demo environment)');
    console.log('====================================================\n');

    process.exitCode = 0;
  } catch (error) {
    console.error('\n❌ Seed process failed:', error);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
    process.exit();
  }
};

run();
