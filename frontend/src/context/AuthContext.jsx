import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { getMe, syncUserProfile } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // Firebase user
  const [mongoUser, setMongoUser] = useState(null); // MongoDB User Profile
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch or sync user profile from backend MongoDB
  const fetchUserProfile = async (firebaseUser) => {
    if (!firebaseUser) {
      setMongoUser(null);
      return null;
    }
    try {
      const res = await getMe();
      if (res && res.data && res.data.user) {
        setMongoUser(res.data.user);
        return res.data.user;
      }
    } catch (err) {
      console.warn('[AuthContext] getMe failed, attempting sync:', err.message);
      try {
        const syncRes = await syncUserProfile({
          name: firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'User')
        });
        if (syncRes && syncRes.data && syncRes.data.user) {
          setMongoUser(syncRes.data.user);
          return syncRes.data.user;
        }
      } catch (syncErr) {
        console.error('[AuthContext] syncUserProfile failed:', syncErr.message);
      }
    }
    return null;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchUserProfile(currentUser);
      } else {
        setMongoUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Email/password login
  const login = async (email, password) => {
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const profile = await fetchUserProfile(userCredential.user);
      return { user: userCredential.user, profile };
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Email/password registration with profile creation
  const register = async (email, password, { name, role = 'CUSTOMER', phone = '', businessName = '' } = {}) => {
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const createdUser = userCredential.user;

      // Update Firebase displayName
      if (name) {
        await updateProfile(createdUser, { displayName: name });
      }

      // Send Firebase email verification
      try {
        await sendEmailVerification(createdUser);
      } catch (verifyErr) {
        console.warn('[AuthContext] Verification email trigger error:', verifyErr.message);
      }

      // Sync user profile to backend MongoDB (role is strictly checked server-side)
      let profile = null;
      try {
        const syncRes = await syncUserProfile({
          name: name || createdUser.displayName,
          phone,
          role: role.toUpperCase(),
          businessName
        });
        if (syncRes && syncRes.data && syncRes.data.user) {
          profile = syncRes.data.user;
          setMongoUser(profile);
        }
      } catch (syncErr) {
        console.error('[AuthContext] Profile sync on register error:', syncErr);
      }

      return { user: createdUser, profile };
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Sign out
  const logout = async () => {
    setError(null);
    try {
      await signOut(auth);
      setUser(null);
      setMongoUser(null);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Password reset email
  const resetPassword = async (email) => {
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Resend email verification
  const resendVerificationEmail = async () => {
    if (!auth.currentUser) {
      throw new Error('No user is currently signed in.');
    }
    await sendEmailVerification(auth.currentUser);
  };

  // Manually refresh user profile from backend
  const refreshUserProfile = async () => {
    if (auth.currentUser) {
      return await fetchUserProfile(auth.currentUser);
    }
    return null;
  };

  const value = {
    user,
    mongoUser,
    loading,
    error,
    login,
    register,
    logout,
    resetPassword,
    resendVerificationEmail,
    refreshUserProfile,
    isAuthenticated: !!user,
    isEmailVerified: !!user?.emailVerified,
    role: mongoUser?.role || 'CUSTOMER'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
