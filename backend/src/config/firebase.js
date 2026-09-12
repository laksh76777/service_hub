const { initializeApp, getApps, getApp, cert, applicationDefault } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const config = require('./environment');

let app;

if (getApps().length === 0) {
  let credential = null;

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const serviceAccount = typeof process.env.FIREBASE_SERVICE_ACCOUNT === 'string'
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
        : process.env.FIREBASE_SERVICE_ACCOUNT;
      credential = cert(serviceAccount);
      console.log('[Firebase Admin] Authenticated using service account credentials.');
    } catch (err) {
      console.warn('[Firebase Admin] Warning: Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:', err.message);
    }
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      credential = applicationDefault();
      console.log('[Firebase Admin] Authenticated using application default credentials.');
    } catch (err) {
      console.warn('[Firebase Admin] Warning: Failed to load GOOGLE_APPLICATION_CREDENTIALS:', err.message);
    }
  }

  const initOptions = {
    projectId: config.firebaseProjectId
  };

  if (credential) {
    initOptions.credential = credential;
  }

  app = initializeApp(initOptions);
  console.log(`[Firebase Admin] Initialized for project: ${config.firebaseProjectId}`);
} else {
  app = getApp();
}

const auth = getAuth(app);

module.exports = {
  app,
  auth
};
