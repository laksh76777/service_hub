const { Queue } = require('bullmq');
const { getRedisClient, isRedisAvailable } = require('../config/redis');

// Standard BullMQ configuration
const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000
  },
  removeOnComplete: 100,
  removeOnFail: 500
};

// Queue names
const QUEUE_NAMES = {
  NOTIFICATIONS: 'notifications-queue',
  INVOICE: 'invoice-pdf-queue',
  WARRANTY: 'warranty-reminders-queue',
  CLEANUP: 'cleanup-queue'
};

class QueueManager {
  constructor() {
    this.queues = {};
    this.inMemoryJobs = [];
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;

    try {
      const connection = getRedisClient();

      // Initialize BullMQ queues
      for (const [key, queueName] of Object.entries(QUEUE_NAMES)) {
        this.queues[queueName] = new Queue(queueName, {
          connection,
          defaultJobOptions
        });
      }
      this.isInitialized = true;
    } catch (err) {
      console.warn('[QueueManager] Redis offline, running in resilient in-memory mode.');
    }
  }

  /**
   * Universal job dispatch helper
   */
  async addJob(queueName, jobName, data = {}, options = {}) {
    this.init();

    const jobPayload = {
      queueName,
      jobName,
      data,
      options: { ...defaultJobOptions, ...options },
      timestamp: new Date()
    };

    if (isRedisAvailable() && this.queues[queueName]) {
      try {
        return await this.queues[queueName].add(jobName, data, jobPayload.options);
      } catch (err) {
        console.warn(`[QueueManager] Failed to enqueue to Redis ${queueName}, fallback to in-memory:`, err.message);
      }
    }

    // Resilient in-memory execution / tracking
    this.inMemoryJobs.push(jobPayload);
    // Execute asynchronously in next event loop tick
    setImmediate(async () => {
      try {
        const workers = require('./workers');
        await workers.executeInMemory(jobPayload);
      } catch (execErr) {
        console.error(`[QueueManager:InMemory] Job execution error:`, execErr.message);
      }
    });

    return {
      id: `mem-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      name: jobName,
      data
    };
  }

  // Specialized dispatchers
  async addNotificationJob(data) {
    return this.addJob(QUEUE_NAMES.NOTIFICATIONS, 'send-notification', data);
  }

  async addInvoiceJob(data) {
    return this.addJob(QUEUE_NAMES.INVOICE, 'generate-invoice-pdf', data);
  }

  async addWarrantyReminderJob(data = {}) {
    return this.addJob(QUEUE_NAMES.WARRANTY, 'check-warranty-reminders', data);
  }

  async addCleanupJob(data = {}) {
    return this.addJob(QUEUE_NAMES.CLEANUP, 'run-cleanup', data);
  }

  async closeAll() {
    for (const queue of Object.values(this.queues)) {
      try {
        await queue.close();
      } catch (e) {}
    }
  }
}

const queueManager = new QueueManager();

module.exports = {
  queueManager,
  QUEUE_NAMES
};
