const mongoose = require('mongoose');
const { USER_ROLES, USER_STATUS } = require('../utils/constants');

const userSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      required: [true, 'Firebase UID is required'],
      unique: true,
      trim: true,
      index: true
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
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
      default: null
    },
    role: {
      type: String,
      enum: ['CUSTOMER', 'TECHNICIAN', 'ADMIN', 'PROVIDER'],
      default: USER_ROLES.CUSTOMER,
      index: true
    },
    status: {
      type: String,
      enum: Object.values(USER_STATUS),
      default: USER_STATUS.ACTIVE,
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

// Virtual for id if needed
userSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

userSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);

