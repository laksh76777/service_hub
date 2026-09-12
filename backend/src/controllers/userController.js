const User = require('../models/User');
const ProviderProfile = require('../models/ProviderProfile');
const { USER_ROLES, PROVIDER_STATUS } = require('../utils/constants');

/**
 * GET /api/users/me
 * Retrieves current authenticated user's profile from MongoDB.
 */
const getMe = async (req, res) => {
  try {
    const user = req.user;
    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          firebaseUid: user.firebaseUid,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          status: user.status,
          avatarUrl: user.avatarUrl,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          emailVerified: !!req.firebaseUser?.email_verified
        }
      }
    });
  } catch (error) {
    console.error('[UserController] getMe error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve user profile: ' + error.message
    });
  }
};

/**
 * PATCH /api/users/me
 * Updates current authenticated user profile.
 * SECURITY: Strips and rejects any attempts to update role, status, firebaseUid, or email.
 */
const updateMe = async (req, res) => {
  try {
    const user = req.user;

    // Security: Only allow white-listed profile fields
    const allowedFields = ['name', 'phone', 'avatarUrl'];
    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (req.body.name && typeof req.body.name === 'string') {
      const trimmed = req.body.name.trim();
      if (!trimmed) {
        return res.status(400).json({
          success: false,
          message: 'Name cannot be empty.'
        });
      }
      updates.name = trimmed;
    }

    if (req.body.phone !== undefined) {
      updates.phone = req.body.phone ? String(req.body.phone).trim() : null;
    }

    // Explicit check: If arbitrary frontend sends role or status, reject privilege escalation
    if (req.body.role && req.body.role !== user.role) {
      console.warn(`[Security Alert] User ${user.firebaseUid} attempted to change role to ${req.body.role}. Ignored.`);
    }

    // Apply safe updates
    Object.assign(user, updates);
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'User profile updated successfully.',
      data: {
        user: {
          id: user._id,
          firebaseUid: user.firebaseUid,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          status: user.status,
          avatarUrl: user.avatarUrl,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          emailVerified: !!req.firebaseUser?.email_verified
        }
      }
    });
  } catch (error) {
    console.error('[UserController] updateMe error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update user profile: ' + error.message
    });
  }
};

/**
 * POST /api/users/sync
 * Syncs user profile upon registration or first login with optional initial role.
 * SECURITY: Only CUSTOMER and PROVIDER are allowed for initial registration; ADMIN is forbidden.
 */
const syncProfile = async (req, res) => {
  try {
    const firebaseUser = req.firebaseUser;
    let user = req.user;

    const { name, phone, role: requestedRole, businessName } = req.body;

    if (name && typeof name === 'string' && name.trim()) {
      user.name = name.trim();
    }

    if (phone !== undefined) {
      user.phone = phone ? String(phone).trim() : null;
    }

    // Role assignment security check during initial registration
    if (requestedRole) {
      const normalizedRole = String(requestedRole).toUpperCase();
      // Only allow CUSTOMER or PROVIDER during signup; ADMIN can never be self-assigned!
      if (normalizedRole === USER_ROLES.PROVIDER) {
        user.role = USER_ROLES.PROVIDER;
        
        // Ensure a ProviderProfile exists
        const existingProfile = await ProviderProfile.findOne({ userId: user._id });
        if (!existingProfile) {
          await ProviderProfile.create({
            userId: user._id,
            businessName: businessName?.trim() || `${user.name}'s Services`,
            status: PROVIDER_STATUS.PENDING
          });
        }
      } else if (normalizedRole === USER_ROLES.CUSTOMER) {
        user.role = USER_ROLES.CUSTOMER;
      } else {
        // Any other role (such as ADMIN) is rejected or defaults to CUSTOMER
        console.warn(`[Security Alert] Unauthorized role request attempted: ${requestedRole}. Defaulted to CUSTOMER.`);
        user.role = USER_ROLES.CUSTOMER;
      }
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'User profile synchronized successfully.',
      data: {
        user: {
          id: user._id,
          firebaseUid: user.firebaseUid,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          status: user.status,
          avatarUrl: user.avatarUrl,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          emailVerified: !!firebaseUser?.email_verified
        }
      }
    });
  } catch (error) {
    console.error('[UserController] syncProfile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to sync user profile: ' + error.message
    });
  }
};

module.exports = {
  getMe,
  updateMe,
  syncProfile
};
