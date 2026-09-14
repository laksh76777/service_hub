import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  // Firebase Web config is public client configuration. Vercel variables override
  // these defaults when configured for a deployment environment.
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCCl_eYC1CNu4qwjXKfc8wtIEWmXuFr6Js',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'studio-9993233645-6a791.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'studio-9993233645-6a791',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'studio-9993233645-6a791.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '984209843324',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:984209843324:web:9da4af7c7a64d03ca8d5f9'
};

// Initialize Firebase once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export { app, auth };
