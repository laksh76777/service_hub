const USER_ROLES = Object.freeze({
  CUSTOMER: 'customer',
  PROVIDER: 'provider',
  ADMIN: 'admin'
});

const USER_STATUS = Object.freeze({
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  PENDING_VERIFICATION: 'pending_verification',
  DEACTIVATED: 'deactivated'
});

const PROVIDER_STATUS = Object.freeze({
  PENDING_APPROVAL: 'pending_approval',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended'
});

const SERVICE_CATEGORY_STATUS = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive'
});

const SERVICE_STATUS = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive'
});

const SERVICE_REQUEST_STATUS = Object.freeze({
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  REVIEWING: 'reviewing',
  ESTIMATED: 'estimated',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired'
});

const BOOKING_STATUS = Object.freeze({
  REQUESTED: 'requested',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  DISPUTED: 'disputed'
});

const ESTIMATE_STATUS = Object.freeze({
  DRAFT: 'draft',
  SENT: 'sent',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  REVISED: 'revised'
});

const ESTIMATE_ITEM_TYPE = Object.freeze({
  LABOR: 'labor',
  MATERIAL: 'material',
  EQUIPMENT: 'equipment',
  FEE: 'fee',
  OTHER: 'other'
});

const JOB_UPDATE_TYPE = Object.freeze({
  INSPECTION: 'inspection',
  WORK_STARTED: 'work_started',
  MILESTONE_REACHED: 'milestone_reached',
  SCOPE_CHANGE_REQUESTED: 'scope_change_requested',
  WORK_COMPLETED: 'work_completed',
  VERIFICATION_SUBMITTED: 'verification_submitted'
});

const INVOICE_STATUS = Object.freeze({
  DRAFT: 'draft',
  ISSUED: 'issued',
  PARTIALLY_PAID: 'partially_paid',
  PAID: 'paid',
  OVERDUE: 'overdue',
  VOID: 'void',
  REFUNDED: 'refunded'
});

const INVOICE_ITEM_TYPE = Object.freeze({
  LABOR: 'labor',
  MATERIAL: 'material',
  CHANGE_ORDER: 'change_order',
  FEE: 'fee',
  TAX: 'tax'
});

const PAYMENT_STATUS = Object.freeze({
  PENDING: 'pending',
  AUTHORIZED: 'authorized',
  CAPTURED: 'captured',
  FAILED: 'failed',
  REFUNDED: 'refunded'
});

const PAYMENT_METHOD = Object.freeze({
  RAZORPAY: 'razorpay',
  BANK_TRANSFER: 'bank_transfer',
  CASH: 'cash',
  CARD: 'card',
  UPI: 'upi'
});

const REFUND_STATUS = Object.freeze({
  PENDING: 'pending',
  PROCESSED: 'processed',
  REJECTED: 'rejected'
});

const WARRANTY_STATUS = Object.freeze({
  ACTIVE: 'active',
  EXPIRED: 'expired',
  CLAIMED: 'claimed',
  VOID: 'void'
});

const WARRANTY_CLAIM_STATUS = Object.freeze({
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  INSPECTION_SCHEDULED: 'inspection_scheduled',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  RESOLVED: 'resolved'
});

const DISPUTE_STATUS = Object.freeze({
  OPEN: 'open',
  UNDER_INVESTIGATION: 'under_investigation',
  MEDIATION: 'mediation',
  RESOLVED_CUSTOMER_FAVOR: 'resolved_customer_favor',
  RESOLVED_PROVIDER_FAVOR: 'resolved_provider_favor',
  CLOSED: 'closed'
});

const DISPUTE_REASON = Object.freeze({
  QUALITY_OF_WORK: 'quality_of_work',
  INCOMPLETE_WORK: 'incomplete_work',
  BILLING_DISCREPANCY: 'billing_discrepancy',
  DAMAGE_CAUSED: 'damage_caused',
  UNPROFESSIONAL_CONDUCT: 'unprofessional_conduct',
  OTHER: 'other'
});

const NOTIFICATION_TYPE = Object.freeze({
  BOOKING_UPDATE: 'booking_update',
  ESTIMATE_RECEIVED: 'estimate_received',
  ESTIMATE_APPROVED: 'estimate_approved',
  JOB_STARTED: 'job_started',
  JOB_COMPLETED: 'job_completed',
  PAYMENT_SUCCESS: 'payment_success',
  WARRANTY_ALERT: 'warranty_alert',
  DISPUTE_UPDATE: 'dispute_update',
  SYSTEM: 'system'
});

const LEDGER_ENTRY_TYPE = Object.freeze({
  PAYMENT_RECEIVED: 'payment_received',
  PROVIDER_PAYOUT: 'provider_payout',
  PLATFORM_COMMISSION: 'platform_commission',
  TAX_WITHHELD: 'tax_withheld',
  REFUND_ISSUED: 'refund_issued',
  ADJUSTMENT: 'adjustment'
});

module.exports = {
  USER_ROLES,
  USER_STATUS,
  PROVIDER_STATUS,
  SERVICE_CATEGORY_STATUS,
  SERVICE_STATUS,
  SERVICE_REQUEST_STATUS,
  BOOKING_STATUS,
  ESTIMATE_STATUS,
  ESTIMATE_ITEM_TYPE,
  JOB_UPDATE_TYPE,
  INVOICE_STATUS,
  INVOICE_ITEM_TYPE,
  PAYMENT_STATUS,
  PAYMENT_METHOD,
  REFUND_STATUS,
  WARRANTY_STATUS,
  WARRANTY_CLAIM_STATUS,
  DISPUTE_STATUS,
  DISPUTE_REASON,
  NOTIFICATION_TYPE,
  LEDGER_ENTRY_TYPE
};
