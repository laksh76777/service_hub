const { auth } = require('../config/firebase');
const User = require('../models/User');
const { USER_ROLES, USER_STATUS } = require('../utils/constants');

/**
 * Middleware to require and verify Firebase ID tokens.
 * Obtains Firebase UID strictly from verified token and ensures MongoDB user exists.
 */
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No Bearer token provided in Authorization header.'
      });
    }

    const token = authHeader.split('Bearer ')[1]?.trim();
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token is empty.'
      });
    }

    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch (verifyError) {
      console.error('[Auth Middleware] Token verification failed:', verifyError.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid, expired, or unverified authentication token.'
      });
    }

    // Securely obtain verified UID and token details
    const { uid: firebaseUid, email, name: tokenName } = decodedToken;
    req.firebaseUser = decodedToken;

    // Lookup user in MongoDB by verified Firebase UID
    let user = await User.findOne({ firebaseUid });

    // If user does not exist in MongoDB, create the profile on first authenticated access
    if (!user) {
      const fallbackName = tokenName || (email ? email.split('@')[0] : 'User');
      user = await User.create({
        firebaseUid,
        email: email || `${firebaseUid}@servicehub.local`,
        name: fallbackName,
        phone: null,
        role: USER_ROLES.CUSTOMER, // Security: Default to CUSTOMER, never trust unverified input
        status: USER_STATUS.ACTIVE
      });
      console.log(`[Auth Middleware] Created initial MongoDB profile for Firebase UID: ${firebaseUid}`);
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('[Auth Middleware] Error in requireAuth:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal authentication error: ' + error.message
    });
  }
};

/**
 * Middleware to enforce role-based access control.
 * Uses req.user.role loaded securely from MongoDB.
 * @param  {...string} roles - Allowed roles (e.g. 'CUSTOMER', 'PROVIDER', 'ADMIN')
 */
const requireRole = (...roles) => {
  const allowedRoles = roles.flat().map((r) => String(r).toUpperCase());

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required before verifying role authorization.'
      });
    }

    const currentRole = (req.user.role || '').toUpperCase();

    if (!allowedRoles.includes(currentRole)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access requires one of [${allowedRoles.join(', ')}] role(s). Current role: ${req.user.role || 'NONE'}.`
      });
    }

    next();
  };
};

module.exports = {
  requireAuth,
  requireRole
};
