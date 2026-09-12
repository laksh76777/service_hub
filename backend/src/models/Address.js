const mongoose = require('mongoose');

const PINCODE_REGEX = /^[1-9][0-9]{5}$/;

const addressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ['home', 'work', 'job_site', 'billing'],
      default: 'home'
    },
    label: {
      type: String,
      trim: true,
      default: 'home'
    },
    // Primary Indian address fields
    addressLine1: {
      type: String,
      trim: true
    },
    addressLine2: {
      type: String,
      trim: true
    },
    locality: {
      type: String,
      trim: true
    },
    landmark: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      index: true
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true
    },
    pincode: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          if (!v) return false;
          return PINCODE_REGEX.test(v.trim());
        },
        message: (props) => `${props.value} is not a valid 6-digit Indian PIN code.`
      },
      index: true
    },

    // Backward-compatible alias fields
    streetAddress: {
      type: String,
      trim: true
    },
    unit: {
      type: String,
      trim: true
    },
    zipCode: {
      type: String,
      trim: true,
      index: true
    },

    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0]
      }
    }
  },
  {
    timestamps: true,
    collection: 'addresses'
  }
);

// Backward-compatible synchronization hook
addressSchema.pre('validate', function () {
  // Sync addressLine1 <-> streetAddress
  if (this.addressLine1 && !this.streetAddress) {
    this.streetAddress = this.addressLine1;
  } else if (this.streetAddress && !this.addressLine1) {
    this.addressLine1 = this.streetAddress;
  }

  // Sync addressLine2 <-> unit
  if (this.addressLine2 && !this.unit) {
    this.unit = this.addressLine2;
  } else if (this.unit && !this.addressLine2) {
    this.addressLine2 = this.unit;
  }

  // Sync pincode <-> zipCode
  if (this.pincode && !this.zipCode) {
    this.zipCode = this.pincode;
  } else if (this.zipCode && !this.pincode) {
    this.pincode = this.zipCode;
  }

  // Ensure streetAddress is populated if addressLine1 exists
  if (!this.streetAddress && this.addressLine1) {
    this.streetAddress = this.addressLine1;
  }
});

addressSchema.index({ location: '2dsphere' });
addressSchema.index({ userId: 1, pincode: 1 });
addressSchema.index({ userId: 1, zipCode: 1 });

module.exports = mongoose.model('Address', addressSchema);
