const { classifyServiceRequest } = require('../services/aiService');

/**
 * Controller for AI-assisted service request classification
 */
const classifyRequest = async (req, res, next) => {
  try {
    const { description } = req.body;

    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Problem description is required and cannot be empty.'
      });
    }

    const classification = await classifyServiceRequest(description);

    return res.status(200).json({
      success: true,
      data: classification
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  classifyRequest
};
