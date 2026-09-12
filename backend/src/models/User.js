const mongoose = require('mongoose');
const { USER_ROLES, USER_STATUS } = require('../utils/constants');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    phone: {
      type: String,
      trim: true,
      sparse: true,
      index: true
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true
    },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.CUSTOMER,
      index: true
    },
    status: {
      type: String,
      enum: Object.values(USER_STATUS),
      default: USER_STATUS.PENDING_VERIFICATION,
      index: true
    },
    avatarUrl: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true,
    collection: 'users'
  }
);

module.exports = mongoose.model('User', userSchema);
