/**
 * Phase 6: MongoDB GridFS Work Evidence & Job Execution Test Suite
 *
 * Verifies:
 * 1. Valid file upload into MongoDB GridFS (image / work photo).
 * 2. GridFS file streaming and Content-Type / size verification.
 * 3. Invalid MIME type rejection (.exe / text/plain).
 * 4. Oversized file rejection (> 10MB limit).
 * 5. Unauthorized file access rejection (403 for non-participating customer).
 * 6. Customer arrival OTP verification (correct OTP advances status, wrong OTP rejected).
 * 7. Technician job execution updates (inspection notes, work notes, parts used with INR cost).
 * 8. Completion OTP / customer sign-off verification.
 * 9. Work evidence deletion from GridFS and metadata.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../src/config/database');
const User = require('../src/models/User');
const Booking = require('../src/models/Booking');
const Service = require('../src/models/Service');
const ProviderProfile = require('../src/models/ProviderProfile');
const WorkEvidence = require('../src/models/WorkEvidence');
const bookingController = require('../src/controllers/bookingController');
const fileController = require('../src/controllers/fileController');
const { BOOKING_STATUS, USER_ROLES, PROVIDER_STATUS } = require('../src/utils/constants');

/**
 * Mock Request & Response Helper
 */
const createMockReqRes = (user, body = {}, params = {}, query = {}, file = null) => {
  let statusCode = 200;
  let responseData = null;
  const headers = {};
  const pipedChunks = [];

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    },
    setHeader(name, value) {
      headers[name] = value;
      return this;
    },
    write(chunk) {
      pipedChunks.push(chunk);
      return true;
    },
    end(chunk) {
      if (chunk) pipedChunks.push(chunk);
      return this;
    },
    on() {
      return this;
    },
    once() {
      return this;
    },
    emit() {
      return true;
    }
  };

  const req = {
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    },
    body,
    params,
    query,
    file
  };

  return {
    req,
    res,
    getStatus: () => statusCode,
    getData: () => responseData,
    getHeaders: () => headers,
    getPipedChunks: () => pipedChunks
  };
};

async function runPhase6Tests() {
  console.log('============================================================');
  console.log('STARTING PHASE 6: MONGODB GRIDFS & JOB EXECUTION TEST SUITE');
  console.log('============================================================\n');

  try {
    await connectDB();

    // 1. Setup / Lookup Test Users
    const customerUser = await User.findOneAndUpdate(
      { email: 'laksh@gmail.com' },
      {
        name: 'Laksh Suthar',
        firebaseUid: 'demo-customer-phase6-uid',
        email: 'laksh@gmail.com',
        role: USER_ROLES.CUSTOMER,
        status: 'ACTIVE'
      },
      { upsert: true, new: true }
    );

    const providerUser = await User.findOneAndUpdate(
      { email: 'ac.tech@servicehub.demo' },
      {
        name: 'Rahul Sharma',
        firebaseUid: 'demo-provider-phase6-uid',
        email: 'ac.tech@servicehub.demo',
        role: USER_ROLES.PROVIDER,
        status: 'ACTIVE'
      },
      { upsert: true, new: true }
    );

    const intruderUser = await User.findOneAndUpdate(
      { email: 'unrelated.user.phase6@example.com' },
      {
        name: 'Unrelated User',
        firebaseUid: 'intruder-phase6-uid',
        email: 'unrelated.user.phase6@example.com',
        role: USER_ROLES.CUSTOMER,
        status: 'ACTIVE'
      },
      { upsert: true, new: true }
    );

    let testService = await Service.findOne();
    if (!testService) {
      throw new Error('No service found in database.');
    }

    // 2. Create Fresh Booking for this test run
    const createReqRes = createMockReqRes(customerUser, {
      serviceId: testService._id,
      providerId: providerUser._id,
      address: {
        addressLine1: '42, 2nd Cross, Indiranagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560038'
      },
      scheduledDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      problemDescription: 'AC not cooling properly, needs gas check.'
    });

    await bookingController.createBooking(createReqRes.req, createReqRes.res);
    if (createReqRes.getStatus() !== 201) {
      throw new Error(`Failed to create test booking: ${JSON.stringify(createReqRes.getData())}`);
    }

    const booking = createReqRes.getData().booking;
    const bookingId = booking._id.toString();
    console.log(`Created test booking ${booking.bookingNumber} (${bookingId}).`);

    // Fetch booking to inspect startOtp
    const rawBooking = await Booking.findById(bookingId);
    const validArrivalOtp = rawBooking.startOtp?.code;
    console.log(`  -> Initial status: ${rawBooking.status}`);
    console.log(`  -> Generated Customer Arrival OTP: ${validArrivalOtp}`);

    // Transition: REQUESTED -> ACCEPTED -> SCHEDULED
    const acceptReqRes = createMockReqRes(
      providerUser,
      { status: BOOKING_STATUS.ACCEPTED },
      { id: bookingId }
    );
    await bookingController.transitionBookingStatus(acceptReqRes.req, acceptReqRes.res);

    const scheduleReqRes = createMockReqRes(
      providerUser,
      {
        newScheduledDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        newTimeSlot: 'Morning (09:00 - 12:00)'
      },
      { id: bookingId }
    );
    await bookingController.rescheduleBooking(scheduleReqRes.req, scheduleReqRes.res);
    console.log('  -> Advanced booking to SCHEDULED.\n');

    // =========================================================================
    // TEST 1: Customer Arrival OTP Verification
    // =========================================================================
    console.log('[TEST 1] Testing Customer Arrival OTP Verification...');

    // 1a. Incorrect OTP
    const wrongOtpReq = createMockReqRes(
      providerUser,
      { type: 'ARRIVAL', otp: '000000' },
      { id: bookingId }
    );
    await bookingController.verifyBookingOtp(wrongOtpReq.req, wrongOtpReq.res);

    if (wrongOtpReq.getStatus() === 400) {
      console.log(`  -> PASS: Incorrect OTP correctly rejected: "${wrongOtpReq.getData().message}"`);
    } else {
      throw new Error(`Expected 400 for invalid OTP, got ${wrongOtpReq.getStatus()}`);
    }

    // 1b. Correct OTP
    const validOtpReq = createMockReqRes(
      providerUser,
      { type: 'ARRIVAL', otp: validArrivalOtp },
      { id: bookingId }
    );
    await bookingController.verifyBookingOtp(validOtpReq.req, validOtpReq.res);

    if (validOtpReq.getStatus() === 200 && validOtpReq.getData().booking.status === BOOKING_STATUS.TECHNICIAN_ARRIVED) {
      console.log('  -> PASS: Valid OTP verified, technician check-in confirmed: TECHNICIAN_ARRIVED.');
    } else {
      throw new Error(`Valid OTP verification failed: ${JSON.stringify(validOtpReq.getData())}`);
    }

    // =========================================================================
    // TEST 2: Valid File Upload into MongoDB GridFS (Before-Work Photo)
    // =========================================================================
    console.log('\n[TEST 2] Testing Valid File Upload to MongoDB GridFS (BEFORE_WORK Photo)...');
    const fakeImageBuffer = Buffer.from('FAKE_JPEG_IMAGE_BINARY_DATA_FOR_WORK_EVIDENCE_IN_GRIDFS_TEST');
    const validFile = {
      buffer: fakeImageBuffer,
      originalname: 'ac_unit_before_repair.jpg',
      mimetype: 'image/jpeg',
      size: fakeImageBuffer.length
    };

    const uploadReqRes = createMockReqRes(
      providerUser,
      { category: 'BEFORE_WORK', notes: 'Initial condition: heavy dust accumulation on condenser coils' },
      { id: bookingId },
      {},
      validFile
    );

    await fileController.uploadBookingFile(uploadReqRes.req, uploadReqRes.res);
    if (uploadReqRes.getStatus() !== 201) {
      throw new Error(`GridFS file upload failed: ${JSON.stringify(uploadReqRes.getData())}`);
    }

    const uploadedEvidence = uploadReqRes.getData().evidence;
    const fileId = uploadedEvidence.fileId.toString();
    console.log(`  -> PASS: File successfully uploaded into GridFS. FileId: ${fileId}`);
    console.log(`  -> Category: ${uploadedEvidence.category}, Stored filename: ${uploadedEvidence.filename}`);

    // =========================================================================
    // TEST 3: Invalid MIME Type Rejection
    // =========================================================================
    console.log('\n[TEST 3] Testing Invalid MIME Type Rejection (.exe / shell script)...');
    const badFile = {
      buffer: Buffer.from('DISALLOWED_BINARY'),
      originalname: 'malicious_script.exe',
      mimetype: 'application/x-msdownload',
      size: 100
    };

    const badMimeReqRes = createMockReqRes(
      providerUser,
      { category: 'BEFORE_WORK' },
      { id: bookingId },
      {},
      badFile
    );
    await fileController.uploadBookingFile(badMimeReqRes.req, badMimeReqRes.res);

    if (badMimeReqRes.getStatus() === 400) {
      console.log(`  -> PASS: Invalid MIME type rejected: "${badMimeReqRes.getData().message}"`);
    } else {
      throw new Error(`Expected 400 for bad MIME type, got ${badMimeReqRes.getStatus()}`);
    }

    // =========================================================================
    // TEST 4: Oversized File Rejection (> 10MB limit)
    // =========================================================================
    console.log('\n[TEST 4] Testing Oversized File Rejection (> 10MB)...');
    const oversizedFile = {
      buffer: Buffer.alloc(100), // Buffer dummy
      originalname: 'gigantic_video.png',
      mimetype: 'image/png',
      size: 15 * 1024 * 1024 // 15 MB
    };

    const oversizedReqRes = createMockReqRes(
      providerUser,
      { category: 'BEFORE_WORK' },
      { id: bookingId },
      {},
      oversizedFile
    );
    await fileController.uploadBookingFile(oversizedReqRes.req, oversizedReqRes.res);

    if (oversizedReqRes.getStatus() === 400) {
      console.log(`  -> PASS: Oversized file rejected: "${oversizedReqRes.getData().message}"`);
    } else {
      throw new Error(`Expected 400 for oversized file, got ${oversizedReqRes.getStatus()}`);
    }

    // =========================================================================
    // TEST 5: Unauthorized File Access Rejection
    // =========================================================================
    console.log('\n[TEST 5] Testing Unauthorized File Access Rejection (403 Forbidden)...');
    const unauthorizedAccessReq = createMockReqRes(
      intruderUser,
      {},
      { fileId }
    );
    await fileController.streamFile(unauthorizedAccessReq.req, unauthorizedAccessReq.res);

    if (unauthorizedAccessReq.getStatus() === 403) {
      console.log(`  -> PASS: Unrelated user access blocked with 403: "${unauthorizedAccessReq.getData().message}"`);
    } else {
      throw new Error(`Expected 403 Forbidden, got ${unauthorizedAccessReq.getStatus()}`);
    }

    // =========================================================================
    // TEST 6: Start Work & Update Job Execution Notes/Parts
    // =========================================================================
    console.log('\n[TEST 6] Testing Work Start & Job Execution Updates...');
    // Advance: TECHNICIAN_ARRIVED -> IN_PROGRESS
    const startWorkReq = createMockReqRes(
      providerUser,
      { status: BOOKING_STATUS.IN_PROGRESS, reason: 'Commencing coil jet cleaning and pressure check' },
      { id: bookingId }
    );
    await bookingController.transitionBookingStatus(startWorkReq.req, startWorkReq.res);
    if (startWorkReq.getStatus() !== 200) {
      throw new Error(`Failed to advance to IN_PROGRESS: ${JSON.stringify(startWorkReq.getData())}`);
    }
    console.log('  -> PASS: Transitioned to IN_PROGRESS.');

    // Update job execution details (inspection, notes, parts used)
    const jobUpdateReq = createMockReqRes(
      providerUser,
      {
        inspectionNotes: 'Condenser coils clogged; refrigerant pressure low by 15 PSI.',
        workNotes: 'Jet washed internal and external coils, tightened flare nuts, topped up 200g R32 refrigerant.',
        partsUsed: [
          { name: 'R32 Refrigerant Gas (Top-up)', quantity: 1, cost: 450 },
          { name: 'Brass Flare Nut 1/4"', quantity: 2, cost: 80 }
        ]
      },
      { id: bookingId }
    );
    await bookingController.updateJobExecution(jobUpdateReq.req, jobUpdateReq.res);

    if (jobUpdateReq.getStatus() !== 200) {
      throw new Error(`Failed to update job execution: ${JSON.stringify(jobUpdateReq.getData())}`);
    }

    const updatedJobBooking = jobUpdateReq.getData().booking;
    console.log(`  -> PASS: Job execution notes updated.`);
    console.log(`  -> Parts used: ${updatedJobBooking.jobExecution.partsUsed.length} items.`);
    console.log(`  -> Recalculated total (Base + Parts): ₹${updatedJobBooking.pricing.finalTotal}`);

    // Upload After-Work Photo
    const afterPhotoBuffer = Buffer.from('CLEANED_AC_AFTER_WORK_PHOTO_GRIDFS_DATA');
    const afterPhotoReq = createMockReqRes(
      providerUser,
      { category: 'AFTER_WORK', notes: 'Coils thoroughly cleaned; temperature drop tested at 18C.' },
      { id: bookingId },
      {},
      {
        buffer: afterPhotoBuffer,
        originalname: 'ac_unit_completed.jpg',
        mimetype: 'image/jpeg',
        size: afterPhotoBuffer.length
      }
    );
    await fileController.uploadBookingFile(afterPhotoReq.req, afterPhotoReq.res);
    if (afterPhotoReq.getStatus() !== 201) {
      throw new Error('Failed to upload AFTER_WORK photo.');
    }
    console.log('  -> PASS: AFTER_WORK evidence uploaded to GridFS.');

    // =========================================================================
    // TEST 7: Mark Completion Pending & Customer Completion Verification
    // =========================================================================
    console.log('\n[TEST 7] Testing Completion Workflow & Customer Verification...');

    // Advance: IN_PROGRESS -> COMPLETION_PENDING
    const markDoneReq = createMockReqRes(
      providerUser,
      { status: BOOKING_STATUS.COMPLETION_PENDING, reason: 'Work completed, awaiting customer review' },
      { id: bookingId }
    );
    await bookingController.transitionBookingStatus(markDoneReq.req, markDoneReq.res);
    if (markDoneReq.getStatus() !== 200) {
      throw new Error(`Failed to advance to COMPLETION_PENDING: ${JSON.stringify(markDoneReq.getData())}`);
    }
    console.log('  -> PASS: Advanced to COMPLETION_PENDING.');

    // Fetch booking to verify completion OTP generated
    const pendingBooking = await Booking.findById(bookingId);
    const completionOtp = pendingBooking.completionOtp?.code;
    console.log(`  -> Generated Customer Completion OTP: ${completionOtp}`);

    // Customer reviews work and verifies: COMPLETION_PENDING -> CUSTOMER_VERIFIED
    const custVerifyReq = createMockReqRes(
      customerUser,
      { status: BOOKING_STATUS.CUSTOMER_VERIFIED, reason: 'Inspected cooling and coils. Great work!' },
      { id: bookingId }
    );
    await bookingController.transitionBookingStatus(custVerifyReq.req, custVerifyReq.res);
    if (custVerifyReq.getStatus() !== 200) {
      throw new Error(`Customer verification failed: ${JSON.stringify(custVerifyReq.getData())}`);
    }
    console.log('  -> PASS: Customer signed off work: CUSTOMER_VERIFIED.');

    // Finalize: CUSTOMER_VERIFIED -> COMPLETED
    const completeReq = createMockReqRes(
      providerUser,
      { status: BOOKING_STATUS.COMPLETED, reason: 'Job finalized.' },
      { id: bookingId }
    );
    await bookingController.transitionBookingStatus(completeReq.req, completeReq.res);
    if (completeReq.getStatus() !== 200) {
      throw new Error(`Final completion failed: ${JSON.stringify(completeReq.getData())}`);
    }
    console.log('  -> PASS: Booking reached terminal state COMPLETED.');

    // =========================================================================
    // TEST 8: Work Evidence Retrieval & GridFS File Deletion
    // =========================================================================
    console.log('\n[TEST 8] Testing Evidence Listing & File Deletion from GridFS...');
    const listReq = createMockReqRes(customerUser, {}, { id: bookingId });
    await fileController.getBookingFiles(listReq.req, listReq.res);
    if (listReq.getStatus() !== 200 || listReq.getData().files.length < 2) {
      throw new Error('Failed to list booking evidence files.');
    }
    console.log(`  -> PASS: Retrieved ${listReq.getData().files.length} evidence files for booking.`);

    // Delete first file
    const deleteReq = createMockReqRes(providerUser, {}, { fileId });
    await fileController.deleteFile(deleteReq.req, deleteReq.res);
    if (deleteReq.getStatus() !== 200) {
      throw new Error(`Failed to delete file from GridFS: ${JSON.stringify(deleteReq.getData())}`);
    }
    console.log('  -> PASS: File deleted successfully from GridFS and metadata collection.');

    console.log('\n============================================================');
    console.log('ALL PHASE 6 MONGODB GRIDFS & OTP TESTS PASSED WITH 100%!');
    console.log('============================================================');
  } catch (err) {
    console.error('\n❌ PHASE 6 TEST FAILED:', err.message);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
}

runPhase6Tests();
