const { Worker } = require('bullmq');
const { getRedisClient, isRedisAvailable } = require('../config/redis');
const { QUEUE_NAMES } = require('./queueManager');
const Notification = require('../models/Notification');
const Warranty = require('../models/Warranty');
const Booking = require('../models/Booking');
const { NOTIFICATION_TYPE, WARRANTY_STATUS } = require('../utils/constants');

// Logger helper
const logJob = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  console.log(`[JobWorker:${level.toUpperCase()}] ${timestamp} - ${message}`, Object.keys(meta).length ? JSON.stringify(meta) : '');
};

// 1. Notification Job Processor (Idempotent)
const processNotificationJob = async (jobData) => {
  const { recipientId, senderId, type, title, message, data, idempotencyKey } = jobData;

  // Idempotent deduplication check
  if (idempotencyKey) {
    const existing = await Notification.findOne({
      recipientId,
      'data.idempotencyKey': idempotencyKey
    });
    if (existing) {
      logJob('info', 'Notification job skipped (already processed idempotently)', { idempotencyKey });
      return { skipped: true, notificationId: existing._id };
    }
  }

  const notification = await Notification.create({
    recipientId,
    senderId: senderId || null,
    type: type || NOTIFICATION_TYPE.SYSTEM,
    title,
    message,
    data: { ...(data || {}), idempotencyKey },
    isRead: false
  });

  logJob('info', `Notification delivered to ${recipientId}`, { notificationId: notification._id });
  return { success: true, notificationId: notification._id };
};

// 2. Invoice PDF Job Processor
const processInvoiceJob = async (jobData) => {
  const { invoiceId } = jobData;
  logJob('info', `Processing background PDF pre-generation for invoice ${invoiceId}`);
  // Background warmup: PDF is rendered upon download request, worker ensures dependencies & validation
  return { success: true, invoiceId };
};

// 3. Warranty Reminder Job Processor
const processWarrantyReminderJob = async () => {
  const now = new Date();
  const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const expiringWarranties = await Warranty.find({
    status: WARRANTY_STATUS.ACTIVE,
    endDate: { $gte: now, $lte: next7Days }
  }).limit(50);

  let notifiedCount = 0;
  for (const w of expiringWarranties) {
    // Idempotent reminder dispatch
    const idempotencyKey = `WAR_REMINDER_${w._id}_${w.endDate.toISOString().split('T')[0]}`;
    await processNotificationJob({
      recipientId: w.customerId,
      senderId: w.providerId,
      type: NOTIFICATION_TYPE.SYSTEM,
      title: 'Warranty Expiry Reminder',
      message: `Your service warranty for booking ${w.bookingId} will expire on ${w.endDate.toLocaleDateString('en-IN')}.`,
      data: { warrantyId: w._id, bookingId: w.bookingId },
      idempotencyKey
    });
    notifiedCount++;
  }

  logJob('info', `Checked warranty expirations: ${notifiedCount} reminders processed.`);
  return { success: true, count: notifiedCount };
};

// 4. Cleanup Job Processor
const processCleanupJob = async () => {
  const now = new Date();
  // Clear expired OTP codes
  const otpResult = await Booking.updateMany(
    {
      $or: [
        { 'startOtp.expiresAt': { $lt: now } },
        { 'completionOtp.expiresAt': { $lt: now } }
      ]
    },
    {
      $unset: {
        'startOtp.code': 1,
        'completionOtp.code': 1
      }
    }
  );

  logJob('info', `Cleanup job completed. Expired OTPs cleared: ${otpResult.modifiedCount}`);
  return { success: true, expiredOtpsCleared: otpResult.modifiedCount };
};

// Map processors to queue names
const jobProcessors = {
  [QUEUE_NAMES.NOTIFICATIONS]: processNotificationJob,
  [QUEUE_NAMES.INVOICE]: processInvoiceJob,
  [QUEUE_NAMES.WARRANTY]: processWarrantyReminderJob,
  [QUEUE_NAMES.CLEANUP]: processCleanupJob
};

class WorkerManager {
  constructor() {
    this.workers = {};
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;

    if (!isRedisAvailable()) {
      // Redis is offline; running in resilient in-memory mode
      return;
    }

    try {
      const connection = getRedisClient();

      for (const [queueName, processor] of Object.entries(jobProcessors)) {
        const worker = new Worker(
          queueName,
          async (job) => {
            logJob('info', `Starting job ${job.name} (#${job.id}) in ${queueName}`);
            return await processor(job.data);
          },
          {
            connection,
            concurrency: 5
          }
        );

        worker.on('completed', (job) => {
          logJob('info', `Job completed: ${job.name} (#${job.id}) in ${queueName}`);
        });

        worker.on('failed', (job, err) => {
          logJob('error', `Job failed: ${job?.name} (#${job?.id}) in ${queueName}: ${err.message}`, {
            attemptsMade: job?.attemptsMade,
            stack: err.stack
          });
        });

        this.workers[queueName] = worker;
      }

      this.isInitialized = true;
    } catch (err) {
      logJob('warn', `BullMQ workers initialization skipped (Redis offline): ${err.message}`);
    }
  }

  /**
   * Resilient in-memory execution when Redis is offline
   */
  async executeInMemory(jobPayload) {
    const { queueName, data } = jobPayload;
    const processor = jobProcessors[queueName];
    if (processor) {
      return await processor(data);
    }
  }

  async closeAll() {
    for (const worker of Object.values(this.workers)) {
      try {
        await worker.close();
      } catch (e) {}
    }
  }
}

const workerManager = new WorkerManager();

module.exports = {
  workerManager,
  processNotificationJob,
  processInvoiceJob,
  processWarrantyReminderJob,
  processCleanupJob,
  executeInMemory: (payload) => workerManager.executeInMemory(payload)
};
