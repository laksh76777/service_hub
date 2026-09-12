const { BOOKING_STATUS, USER_ROLES } = require('./constants');

/**
 * Strict transition map defining permitted destination states and allowed actor roles.
 */
const ALLOWED_TRANSITIONS = {
  [BOOKING_STATUS.REQUESTED]: {
    [BOOKING_STATUS.ACCEPTED]: [USER_ROLES.TECHNICIAN, 'PROVIDER', USER_ROLES.ADMIN],
    [BOOKING_STATUS.REJECTED]: [USER_ROLES.TECHNICIAN, 'PROVIDER', USER_ROLES.ADMIN],
    [BOOKING_STATUS.CANCELLED]: [USER_ROLES.CUSTOMER, USER_ROLES.ADMIN]
  },
  [BOOKING_STATUS.ACCEPTED]: {
    [BOOKING_STATUS.SCHEDULED]: [USER_ROLES.TECHNICIAN, 'PROVIDER', USER_ROLES.ADMIN],
    [BOOKING_STATUS.INSPECTION]: [USER_ROLES.TECHNICIAN, 'PROVIDER', USER_ROLES.ADMIN],
    [BOOKING_STATUS.CANCELLED]: [USER_ROLES.CUSTOMER, USER_ROLES.TECHNICIAN, 'PROVIDER', USER_ROLES.ADMIN]
  },
  [BOOKING_STATUS.SCHEDULED]: {
    [BOOKING_STATUS.INSPECTION]: [USER_ROLES.TECHNICIAN, 'PROVIDER', USER_ROLES.ADMIN],
    [BOOKING_STATUS.SCHEDULED]: [USER_ROLES.TECHNICIAN, 'PROVIDER', USER_ROLES.CUSTOMER, USER_ROLES.ADMIN], // Rescheduled
    [BOOKING_STATUS.CANCELLED]: [USER_ROLES.CUSTOMER, USER_ROLES.TECHNICIAN, 'PROVIDER', USER_ROLES.ADMIN]
  },
  [BOOKING_STATUS.INSPECTION]: {
    [BOOKING_STATUS.ESTIMATE_PENDING]: [USER_ROLES.TECHNICIAN, 'PROVIDER', USER_ROLES.ADMIN],
    [BOOKING_STATUS.ESTIMATE_SUBMITTED]: [USER_ROLES.TECHNICIAN, 'PROVIDER', USER_ROLES.ADMIN],
    [BOOKING_STATUS.WORK_IN_PROGRESS]: [USER_ROLES.TECHNICIAN, 'PROVIDER', USER_ROLES.ADMIN],
    [BOOKING_STATUS.CANCELLED]: [USER_ROLES.CUSTOMER, USER_ROLES.TECHNICIAN, 'PROVIDER', USER_ROLES.ADMIN]
  },
  [BOOKING_STATUS.ESTIMATE_PENDING]: {
    [BOOKING_STATUS.ESTIMATE_SUBMITTED]: [USER_ROLES.TECHNICIAN, 'PROVIDER', USER_ROLES.ADMIN],
    [BOOKING_STATUS.CANCELLED]: [USER_ROLES.CUSTOMER, USER_ROLES.TECHNICIAN, 'PROVIDER', USER_ROLES.ADMIN]
  },
  [BOOKING_STATUS.ESTIMATE_SUBMITTED]: {
    [BOOKING_STATUS.ESTIMATE_APPROVED]: [USER_ROLES.CUSTOMER, USER_ROLES.ADMIN],
    [BOOKING_STATUS.PAYMENT_PENDING]: [USER_ROLES.CUSTOMER, USER_ROLES.ADMIN],
    [BOOKING_STATUS.CANCELLED]: [USER_ROLES.CUSTOMER, USER_ROLES.ADMIN]
  },
  [BOOKING_STATUS.ESTIMATE_APPROVED]: {
    [BOOKING_STATUS.PAYMENT_PENDING]: [USER_ROLES.TECHNICIAN, 'PROVIDER', USER_ROLES.CUSTOMER, USER_ROLES.ADMIN],
    [BOOKING_STATUS.WORK_IN_PROGRESS]: [USER_ROLES.TECHNICIAN, 'PROVIDER', USER_ROLES.ADMIN],
    [BOOKING_STATUS.CANCELLED]: [USER_ROLES.CUSTOMER, USER_ROLES.ADMIN]
  },
  [BOOKING_STATUS.PAYMENT_PENDING]: {
    [BOOKING_STATUS.PAYMENT_SUCCESS]: [USER_ROLES.CUSTOMER, USER_ROLES.ADMIN],
    [BOOKING_STATUS.CANCELLED]: [USER_ROLES.CUSTOMER, USER_ROLES.ADMIN]
  },
  [BOOKING_STATUS.PAYMENT_SUCCESS]: {
    [BOOKING_STATUS.WORK_IN_PROGRESS]: [USER_ROLES.TECHNICIAN, 'PROVIDER', USER_ROLES.ADMIN]
  },
  [BOOKING_STATUS.WORK_IN_PROGRESS]: {
    [BOOKING_STATUS.WORK_COMPLETED]: [USER_ROLES.TECHNICIAN, 'PROVIDER', USER_ROLES.ADMIN],
    [BOOKING_STATUS.CANCELLED]: [USER_ROLES.ADMIN]
  },
  [BOOKING_STATUS.WORK_COMPLETED]: {
    [BOOKING_STATUS.CUSTOMER_CONFIRMED]: [USER_ROLES.CUSTOMER, USER_ROLES.ADMIN],
    [BOOKING_STATUS.CANCELLED]: [USER_ROLES.ADMIN]
  },
  [BOOKING_STATUS.CUSTOMER_CONFIRMED]: {
    [BOOKING_STATUS.INVOICED]: [USER_ROLES.TECHNICIAN, 'PROVIDER', USER_ROLES.ADMIN, USER_ROLES.CUSTOMER]
  },
  // Terminal states
  [BOOKING_STATUS.REJECTED]: {},
  [BOOKING_STATUS.CANCELLED]: {},
  [BOOKING_STATUS.INVOICED]: {}
};

/**
 * Validates whether a state transition is legal for the given actor role.
 *
 * @param {string} currentStatus - Current status of the booking
 * @param {string} nextStatus - Proposed next status
 * @param {string} actorRole - Role of the requesting user (CUSTOMER, PROVIDER, ADMIN)
 * @returns {{ allowed: boolean, reason?: string }}
 */
function validateStatusTransition(currentStatus, nextStatus, actorRole) {
  if (!currentStatus || !nextStatus) {
    return {
      allowed: false,
      reason: 'Both currentStatus and nextStatus are required.'
    };
  }

  // Same status without rescheduling is a no-op / invalid
  if (currentStatus === nextStatus && nextStatus !== BOOKING_STATUS.SCHEDULED) {
    return {
      allowed: false,
      reason: `Booking is already in '${currentStatus}' status.`
    };
  }

  const validNextStates = ALLOWED_TRANSITIONS[currentStatus];
  if (!validNextStates) {
    return {
      allowed: false,
      reason: `Unknown or invalid current status '${currentStatus}'.`
    };
  }

  const allowedRoles = validNextStates[nextStatus];
  if (!allowedRoles) {
    const possibleTargets = Object.keys(validNextStates).join(', ') || 'None (Terminal state)';
    return {
      allowed: false,
      reason: `Invalid transition from '${currentStatus}' to '${nextStatus}'. Allowed next states are: [${possibleTargets}].`
    };
  }

  if (!allowedRoles.includes(actorRole)) {
    return {
      allowed: false,
      reason: `Role '${actorRole}' is not authorized to transition booking from '${currentStatus}' to '${nextStatus}'. Required role(s): [${allowedRoles.join(', ')}].`
    };
  }

  return { allowed: true };
}

/**
 * Checks if a booking can be cancelled by the given actor role.
 */
function canCancelBooking(currentStatus, actorRole) {
  if (actorRole === USER_ROLES.CUSTOMER) {
    return [
      BOOKING_STATUS.REQUESTED,
      BOOKING_STATUS.ACCEPTED,
      BOOKING_STATUS.SCHEDULED,
      BOOKING_STATUS.INSPECTION,
      BOOKING_STATUS.ESTIMATE_PENDING,
      BOOKING_STATUS.ESTIMATE_SUBMITTED,
      BOOKING_STATUS.ESTIMATE_APPROVED,
      BOOKING_STATUS.PAYMENT_PENDING
    ].includes(currentStatus);
  }
  if (actorRole === USER_ROLES.TECHNICIAN || actorRole === 'PROVIDER' || actorRole === USER_ROLES.PROVIDER) {
    return [
      BOOKING_STATUS.REQUESTED,
      BOOKING_STATUS.ACCEPTED,
      BOOKING_STATUS.SCHEDULED,
      BOOKING_STATUS.INSPECTION,
      BOOKING_STATUS.ESTIMATE_PENDING
    ].includes(currentStatus);
  }
  if (actorRole === USER_ROLES.ADMIN) {
    return true;
  }
  return false;
}

/**
 * Checks if a booking can be rescheduled.
 */
function canRescheduleBooking(currentStatus) {
  return [BOOKING_STATUS.REQUESTED, BOOKING_STATUS.ACCEPTED, BOOKING_STATUS.SCHEDULED].includes(currentStatus);
}

module.exports = {
  ALLOWED_TRANSITIONS,
  validateStatusTransition,
  canCancelBooking,
  canRescheduleBooking
};
