const { BOOKING_STATUS, USER_ROLES } = require('./constants');

/**
 * Strict transition map defining permitted destination states and allowed actor roles.
 */
const ALLOWED_TRANSITIONS = {
  [BOOKING_STATUS.REQUESTED]: {
    [BOOKING_STATUS.ACCEPTED]: [USER_ROLES.PROVIDER, USER_ROLES.ADMIN],
    [BOOKING_STATUS.CANCELLED_BY_PROVIDER]: [USER_ROLES.PROVIDER, USER_ROLES.ADMIN],
    [BOOKING_STATUS.CANCELLED_BY_CUSTOMER]: [USER_ROLES.CUSTOMER, USER_ROLES.ADMIN]
  },
  [BOOKING_STATUS.ACCEPTED]: {
    [BOOKING_STATUS.SCHEDULED]: [USER_ROLES.PROVIDER, USER_ROLES.ADMIN],
    [BOOKING_STATUS.CANCELLED_BY_CUSTOMER]: [USER_ROLES.CUSTOMER, USER_ROLES.ADMIN],
    [BOOKING_STATUS.CANCELLED_BY_PROVIDER]: [USER_ROLES.PROVIDER, USER_ROLES.ADMIN]
  },
  [BOOKING_STATUS.SCHEDULED]: {
    [BOOKING_STATUS.TECHNICIAN_ARRIVED]: [USER_ROLES.PROVIDER, USER_ROLES.ADMIN],
    [BOOKING_STATUS.SCHEDULED]: [USER_ROLES.PROVIDER, USER_ROLES.CUSTOMER, USER_ROLES.ADMIN], // Rescheduled
    [BOOKING_STATUS.CANCELLED_BY_CUSTOMER]: [USER_ROLES.CUSTOMER, USER_ROLES.ADMIN],
    [BOOKING_STATUS.CANCELLED_BY_PROVIDER]: [USER_ROLES.PROVIDER, USER_ROLES.ADMIN]
  },
  [BOOKING_STATUS.TECHNICIAN_ARRIVED]: {
    [BOOKING_STATUS.IN_PROGRESS]: [USER_ROLES.PROVIDER, USER_ROLES.ADMIN],
    [BOOKING_STATUS.DISPUTED]: [USER_ROLES.CUSTOMER, USER_ROLES.PROVIDER, USER_ROLES.ADMIN]
  },
  [BOOKING_STATUS.IN_PROGRESS]: {
    [BOOKING_STATUS.COMPLETION_PENDING]: [USER_ROLES.PROVIDER, USER_ROLES.ADMIN],
    [BOOKING_STATUS.DISPUTED]: [USER_ROLES.CUSTOMER, USER_ROLES.PROVIDER, USER_ROLES.ADMIN]
  },
  [BOOKING_STATUS.COMPLETION_PENDING]: {
    [BOOKING_STATUS.CUSTOMER_VERIFIED]: [USER_ROLES.CUSTOMER, USER_ROLES.PROVIDER, USER_ROLES.ADMIN],
    [BOOKING_STATUS.DISPUTED]: [USER_ROLES.CUSTOMER, USER_ROLES.ADMIN]
  },
  [BOOKING_STATUS.CUSTOMER_VERIFIED]: {
    [BOOKING_STATUS.COMPLETED]: [USER_ROLES.CUSTOMER, USER_ROLES.PROVIDER, USER_ROLES.ADMIN],
    [BOOKING_STATUS.DISPUTED]: [USER_ROLES.CUSTOMER, USER_ROLES.ADMIN]
  },
  [BOOKING_STATUS.DISPUTED]: {
    [BOOKING_STATUS.COMPLETED]: [USER_ROLES.ADMIN],
    [BOOKING_STATUS.CANCELLED_BY_CUSTOMER]: [USER_ROLES.ADMIN],
    [BOOKING_STATUS.CANCELLED_BY_PROVIDER]: [USER_ROLES.ADMIN]
  },
  // Terminal states
  [BOOKING_STATUS.CANCELLED_BY_CUSTOMER]: {},
  [BOOKING_STATUS.CANCELLED_BY_PROVIDER]: {},
  [BOOKING_STATUS.COMPLETED]: {}
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
    return [BOOKING_STATUS.REQUESTED, BOOKING_STATUS.ACCEPTED, BOOKING_STATUS.SCHEDULED].includes(currentStatus);
  }
  if (actorRole === USER_ROLES.PROVIDER) {
    return [BOOKING_STATUS.REQUESTED, BOOKING_STATUS.ACCEPTED, BOOKING_STATUS.SCHEDULED].includes(currentStatus);
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
