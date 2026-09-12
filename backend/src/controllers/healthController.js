const { checkDbHealth } = require('../config/database');

const getHealth = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'ServiceHub API is running'
  });
};

const getDbHealth = async (req, res) => {
  const dbHealth = await checkDbHealth();

  if (dbHealth.isHealthy) {
    return res.status(200).json({
      success: true,
      database: dbHealth.state,
      name: dbHealth.name,
      host: dbHealth.host,
      ping: 'ok',
      latencyMs: dbHealth.pingTimeMs
    });
  }

  return res.status(503).json({
    success: false,
    database: dbHealth.state,
    error: dbHealth.error || 'Database connection error'
  });
};

module.exports = {
  getHealth,
  getDbHealth
};
