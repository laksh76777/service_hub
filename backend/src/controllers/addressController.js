const Address = require('../models/Address');

const PINCODE_REGEX = /^[1-9][0-9]{5}$/;

/**
 * Get all saved addresses for authenticated user
 * GET /api/addresses
 */
const getMyAddresses = async (req, res) => {
  try {
    const addresses = await Address.find({ userId: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      count: addresses.length,
      addresses
    });
  } catch (error) {
    console.error('Error fetching addresses:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch saved addresses.'
    });
  }
};

/**
 * Save a new address for authenticated user
 * POST /api/addresses
 */
const saveAddress = async (req, res) => {
  try {
    const {
      type = 'home',
      addressLine1,
      streetAddress,
      addressLine2,
      unit,
      locality,
      landmark,
      city,
      state,
      pincode,
      zipCode
    } = req.body;

    const line1 = addressLine1 || streetAddress;
    const pin = pincode || zipCode;

    if (!line1 || !city || !state || !pin) {
      return res.status(400).json({
        success: false,
        message: 'addressLine1, city, state, and 6-digit pincode are required.'
      });
    }

    if (!PINCODE_REGEX.test(pin.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 6-digit Indian PIN code (e.g. 560001).'
      });
    }

    const address = new Address({
      userId: req.user._id,
      type: ['home', 'work', 'job_site', 'billing'].includes(type) ? type : 'home',
      addressLine1: line1.trim(),
      streetAddress: line1.trim(),
      addressLine2: (addressLine2 || unit || '').trim(),
      unit: (unit || addressLine2 || '').trim(),
      locality: (locality || '').trim(),
      landmark: (landmark || '').trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pin.trim(),
      zipCode: pin.trim()
    });

    await address.save();

    return res.status(201).json({
      success: true,
      message: 'Address saved successfully.',
      address
    });
  } catch (error) {
    console.error('Error saving address:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to save address.'
    });
  }
};

/**
 * Delete a saved address
 * DELETE /api/addresses/:id
 */
const deleteAddress = async (req, res) => {
  try {
    const address = await Address.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found or unauthorized.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Address removed successfully.'
    });
  } catch (error) {
    console.error('Error deleting address:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete address.'
    });
  }
};

module.exports = {
  getMyAddresses,
  saveAddress,
  deleteAddress
};
