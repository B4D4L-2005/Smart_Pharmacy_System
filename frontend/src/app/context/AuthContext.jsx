import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api.js';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check authentication on startup
  useEffect(() => {
    async function checkAuth() {
      if (api.auth.isAuthenticated()) {
        try {
          const profileData = await api.auth.getProfile();
          setUser(profileData);
        } catch (error) {
          console.error('[Auth startup error] token invalid or expired:', error);
          api.auth.logout();
          setUser(null);
        }
      }
      setLoading(false);
    }
    checkAuth();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const data = await api.auth.login(email, password);
      setUser(data.user);
      return data;
    } catch (error) {
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (signUpData) => {
    setLoading(true);
    try {
      const data = await api.auth.signup(signUpData);
      setUser(data.user);
      return data;
    } catch (error) {
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginWithOTP = async (phoneNumber, otpCode) => {
    setLoading(true);
    try {
      const data = await api.auth.verifyOTPLogin(phoneNumber, otpCode);
      setUser(data.user);
      return data;
    } catch (error) {
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signupWithOTP = async (signUpData) => {
    setLoading(true);
    try {
      const data = await api.auth.verifyOTPRegister(signUpData);
      setUser(data.user);

      // Backup registered user credentials locally for auto-restoration upon Render instance spin-downs
      localStorage.setItem(`rxsmart_user_backup_${signUpData.phoneNumber}`, JSON.stringify(signUpData));

      return data;
    } catch (error) {
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    api.auth.logout();
    setUser(null);
  };

  const refreshProfile = async () => {
    try {
      const profileData = await api.auth.getProfile();
      setUser(profileData);
    } catch (error) {
      console.error('[Refresh profile error]:', error);
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const data = await api.auth.updateProfile(profileData);
      setUser(data.user);
      return data;
    } catch (error) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, loginWithOTP, signupWithOTP, logout, refreshProfile, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
