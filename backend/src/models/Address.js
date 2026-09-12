const mongoose = require('mongoose');

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
    streetAddress: {
      type: String,
      required: [true, 'Street address is required'],
      trim: true
    },
    unit: {
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
    zipCode: {
      type: String,
      required: [true, 'Zip code is required'],
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

addressSchema.index({ location: '2dsphere' });
addressSchema.index({ userId: 1, zipCode: 1 });

module.exports = mongoose.model('Address', addressSchema);
