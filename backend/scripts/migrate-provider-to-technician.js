const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const User = require('../src/models/User');
const Booking = require('../src/models/Booking');
const ProviderProfile = require('../src/models/ProviderProfile');
const { USER_ROLES } = require('../src/utils/constants');

async function migrate() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not defined in .env');
    process.exit(1);
  }

  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(uri);
  console.log('Connected.');

  // 1. Migrate Users with role 'PROVIDER' to 'TECHNICIAN'
  const userResult = await User.updateMany(
    { role: 'PROVIDER' },
    { $set: { role: 'TECHNICIAN' } }
  );
  console.log(`[Migration] Updated ${userResult.modifiedCount} users from PROVIDER to TECHNICIAN role.`);

  // 2. Sync all Bookings: ensure technicianId = providerId where technicianId is missing
  const bookings = await Booking.find({
    $or: [
      { technicianId: { $exists: false } },
      { technicianId: null }
    ]
  });
  let syncedBookings = 0;
  for (const b of bookings) {
    if (b.providerId) {
      b.technicianId = b.providerId;
      await b.save();
      syncedBookings++;
    }
  }
  console.log(`[Migration] Synchronized technicianId on ${syncedBookings} bookings.`);

  // 3. Ensure Admin users do NOT have a ProviderProfile or TechnicianProfile
  const adminUsers = await User.find({ role: 'ADMIN' });
  for (const admin of adminUsers) {
    const deleted = await ProviderProfile.deleteMany({ userId: admin._id });
    if (deleted.deletedCount > 0) {
      console.log(`[Migration] Removed ${deleted.deletedCount} erroneous provider profile(s) from Admin user ${admin.email}`);
    }
  }

  console.log('[Migration] Architectural migration completed successfully!');
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
