const mongoose = require('mongoose');
const User = require('../models/User');
const ProviderProfile = require('../models/ProviderProfile');
const Address = require('../models/Address');
const Booking = require('../models/Booking');
const notificationService = require('../services/notificationService');
const { USER_ROLES, USER_STATUS, PROVIDER_STATUS, NOTIFICATION_TYPE } = require('../utils/constants');

/**
 * GET /api/users/me
 * Retrieves current authenticated user's profile from MongoDB.
 */
const getMe = async (req, res) => {
  try {
    const user = req.user;

    const baseUser = {
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
    };

    let profileData = {};

    if (user.role === USER_ROLES.CUSTOMER) {
      const addresses = await Address.find({ userId: user._id }).sort({ isDefault: -1, createdAt: -1 }).lean();
      const bookingsCount = await Booking.countDocuments({ customerId: user._id });
      profileData = {
        role: USER_ROLES.CUSTOMER,
        personalInfo: {
          name: user.name,
          email: user.email,
          phone: user.phone
        },
        addresses: addresses || [],
        bookingsCount: bookingsCount || 0,
        accountSettings: {
          notificationsEnabled: true
        }
      };
    } else if (user.role === USER_ROLES.TECHNICIAN || user.role === 'PROVIDER') {
      const techProfile = await ProviderProfile.findOne({ userId: user._id })
        .populate('categories', 'name slug icon')
        .populate('servicesOffered.serviceId', 'name slug')
        .lean();

      profileData = {
        role: USER_ROLES.TECHNICIAN,
        name: user.name,
        profession: techProfile?.profession || 'General Service Technician',
        experience: techProfile?.experience || '1 year',
        experienceYears: techProfile?.experienceYears || 1,
        services: techProfile?.servicesOffered || [],
        availability: techProfile?.availability || {},
        bio: techProfile?.bio || '',
        rating: techProfile?.rating || { average: 5.0, count: 0 },
        verificationStatus: techProfile?.verificationStatus || techProfile?.status || PROVIDER_STATUS.PENDING,
        completedJobs: techProfile?.completedJobsCount || 0,
        businessName: techProfile?.businessName || '',
        serviceArea: techProfile?.serviceArea || {}
      };
    } else if (user.role === USER_ROLES.ADMIN) {
      profileData = {
        role: USER_ROLES.ADMIN,
        name: user.name,
        email: user.email,
        adminAccountInfo: {
          accessLevel: 'PLATFORM_ADMINISTRATOR',
          superAdmin: true,
          dashboardAccess: true,
          verifiedAt: user.createdAt
        },
        accountSettings: {
          auditLogsEnabled: true,
          notificationsEnabled: true
        }
      };
    }

    return res.status(200).json({
      success: true,
      data: {
        user: baseUser,
        profile: profileData
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

    if (!user && firebaseUser) {
      user = await User.findOne({ firebaseUid: firebaseUser.uid });
      if (!user && firebaseUser.email) {
        user = await User.findOne({ email: firebaseUser.email.toLowerCase().trim() });
      }
      if (!user) {
        user = await User.create({
          firebaseUid: firebaseUser.uid,
          email: firebaseUser.email ? firebaseUser.email.toLowerCase().trim() : `${firebaseUser.uid}@servicehub.local`,
          name: firebaseUser.name || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'User'),
          phone: null,
          role: USER_ROLES.CUSTOMER,
          status: USER_STATUS.ACTIVE
        });
      }
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unable to identify user context for synchronization.'
      });
    }

    const {
      name,
      phone,
      role: requestedRole,
      businessName,
      profession,
      experience,
      experienceYears,
      bio,
      city,
      services
    } = req.body;

    if (name && typeof name === 'string' && name.trim()) {
      user.name = name.trim();
    }

    if (phone !== undefined) {
      user.phone = phone ? String(phone).trim() : null;
    }

    // Role assignment security check during initial registration
    if (requestedRole) {
      const normalizedRole = String(requestedRole).toUpperCase();
      // Only allow CUSTOMER or TECHNICIAN during signup; ADMIN can never be self-assigned!
      if (normalizedRole === USER_ROLES.TECHNICIAN || normalizedRole === 'TECHNICIAN' || normalizedRole === 'PROVIDER') {
        user.role = USER_ROLES.TECHNICIAN;

        // Ensure a Technician profile exists for the contractor with PENDING verification status
        let existingProfile = await ProviderProfile.findOne({ userId: user._id });
        const profileData = {
          userId: user._id,
          businessName: businessName?.trim() || `${user.name}'s Technical Services`,
          profession: profession?.trim() || 'Home Service Technician',
          experience: experience?.trim() || `${experienceYears || 1} years`,
          experienceYears: Number(experienceYears) || parseInt(experience, 10) || 1,
          bio: bio?.trim() || '',
          status: existingProfile ? existingProfile.status : PROVIDER_STATUS.PENDING,
          verificationStatus: existingProfile ? existingProfile.verificationStatus : PROVIDER_STATUS.PENDING
        };

        if (city && city.trim()) {
          profileData.serviceArea = {
            cities: [city.trim()],
            radiusKm: 25
          };
        }

        if (existingProfile) {
          Object.assign(existingProfile, profileData);
          await existingProfile.save();
        } else {
          await ProviderProfile.create(profileData);

          // Notify Admins: Technician registration & verification request
          try {
            if (mongoose.connection.readyState === 1 || User.find !== mongoose.Model.find) {
              const adminUsers = await User.find({ role: USER_ROLES.ADMIN });
              for (const admin of adminUsers) {
                await notificationService.notify({
                  recipientId: admin._id,
                  senderId: user._id,
                  type: NOTIFICATION_TYPE.TECHNICIAN_REGISTERED,
                  title: 'Technician Registration',
                  message: `New technician ${user.name} registered as ${profileData.profession}. Pending admin verification.`,
                  data: { technicianId: user._id, link: '/admin/dashboard#technicians' }
                });
                await notificationService.notify({
                  recipientId: admin._id,
                  senderId: user._id,
                  type: NOTIFICATION_TYPE.VERIFICATION_REQUESTED,
                  title: 'Verification Request',
                  message: `Technician ${user.name} submitted profile for verification.`,
                  data: { technicianId: user._id, link: '/admin/dashboard#technicians' }
                });
              }
            }
          } catch (notifErr) {
            console.warn('[UserController] Admin notification error:', notifErr.message);
          }
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
