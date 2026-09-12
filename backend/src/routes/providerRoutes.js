const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { USER_ROLES } = require('../utils/constants');
const providerController = require('../controllers/providerController');

// Router for public provider discovery (/api/providers)
const publicRouter = express.Router();
publicRouter.get('/', providerController.getPublicProviders);
publicRouter.get('/:id', providerController.getPublicProviderById);

// Router for technician self-management (/api/technician and /api/provider)
const portalRouter = express.Router();
portalRouter.use(requireAuth);
portalRouter.use(requireRole(USER_ROLES.TECHNICIAN, 'PROVIDER'));

portalRouter.get('/profile', providerController.getMyProviderProfile);
portalRouter.patch('/profile', providerController.updateMyProviderProfile);
portalRouter.get('/services', providerController.getMyServices);
portalRouter.post('/services', providerController.addServiceOffering);
portalRouter.patch('/services/:serviceId', providerController.updateServiceOffering);
portalRouter.delete('/services/:serviceId', providerController.removeServiceOffering);

module.exports = {
  publicRouter,
  portalRouter
};
