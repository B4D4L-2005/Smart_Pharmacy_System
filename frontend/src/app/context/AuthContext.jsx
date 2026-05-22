import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api.js';

const AuthContext = createContext();

function decodeToken(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const backupDatabaseLocally = async (emailToUse) => {
    const activeEmail = emailToUse || user?.email;
    if (!activeEmail) return;
    try {
      const dump = await api.db.export();
      localStorage.setItem(`rxsmart_db_backup_${activeEmail.toLowerCase()}`, JSON.stringify(dump));
      console.log(`[Backup Success] DB synchronized to localStorage for ${activeEmail}`);
    } catch (error) {
      console.warn('[Backup Warning] Failed to backup database locally:', error.message);
    }
  };

  // Check authentication on startup
  useEffect(() => {
    async function checkAuth() {
      if (api.auth.isAuthenticated()) {
        const token = localStorage.getItem('pharmacy_token');
        const decoded = decodeToken(token);
        const email = decoded?.email;
        
        try {
          const profileData = await api.auth.getProfile();
          setUser(profileData);
          if (email) {
            // Fetch backup in background after successful startup
            try {
              const dump = await api.db.export();
              localStorage.setItem(`rxsmart_db_backup_${email.toLowerCase()}`, JSON.stringify(dump));
            } catch (err) {}
          }
        } catch (error) {
          console.error('[Auth startup error] token invalid or expired:', error);
          
          const isUserNotFoundError = error.message && (
            error.message.includes('User not found') ||
            error.message.includes('not registered') ||
            error.message.includes('404')
          );
          
          if (isUserNotFoundError && email) {
            console.log(`[Auth Recovery] User not found but token exists. Wiped db detected. Attempting auto-restore for ${email}...`);
            const dbBackupStr = localStorage.getItem(`rxsmart_db_backup_${email.toLowerCase()}`);
            const userBackupStr = localStorage.getItem(`rxsmart_user_backup_${email.toLowerCase()}`);
            
            if (dbBackupStr || userBackupStr) {
              try {
                const dbBackup = dbBackupStr ? JSON.parse(dbBackupStr) : null;
                const userBackup = userBackupStr ? JSON.parse(userBackupStr) : {};
                
                const restorePayload = {
                  email: email,
                  username: userBackup.username || decoded.username || 'Store Owner',
                  shopName: userBackup.shopName || 'Smart Pharmacy Store',
                  shopPhone: userBackup.shopPhone || '0000000000',
                  shopAddress: userBackup.shopAddress || '',
                  gstin: userBackup.gstin || '',
                  password: userBackup.password || '',
                  dbBackup: dbBackup
                };
                
                await api.auth.restoreUser(restorePayload);
                console.log('[Auth Recovery] Auto-restore completed successfully. Retrying profile fetch...');
                
                const profileData = await api.auth.getProfile();
                setUser(profileData);
                
                // Resync
                try {
                  const dump = await api.db.export();
                  localStorage.setItem(`rxsmart_db_backup_${email.toLowerCase()}`, JSON.stringify(dump));
                } catch (e) {}
                
                setLoading(false);
                return;
              } catch (restoreError) {
                console.error('[Auth Recovery Error] Auto-restore failed:', restoreError);
              }
            }
          }
          
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
      
      // Save credentials backup locally
      const userBackupData = {
        email: data.user.email,
        username: data.user.username,
        shopName: data.user.shopDetails?.name || '',
        shopPhone: data.user.shopDetails?.phone || '',
        shopAddress: data.user.shopDetails?.address || '',
        gstin: data.user.shopDetails?.gstin || '',
        password: password
      };
      localStorage.setItem(`rxsmart_user_backup_${email.toLowerCase()}`, JSON.stringify(userBackupData));
      
      // Sync DB
      backupDatabaseLocally(email);
      
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
      
      localStorage.setItem(`rxsmart_user_backup_${signUpData.email.toLowerCase()}`, JSON.stringify(signUpData));
      backupDatabaseLocally(signUpData.email);
      
      return data;
    } catch (error) {
      setUser(null);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const loginWithOTP = async (email, otpCode) => {
    setLoading(true);
    try {
      const data = await api.auth.verifyOTPLogin(email, otpCode);
      setUser(data.user);
      
      const userBackupData = {
        email: data.user.email,
        username: data.user.username,
        shopName: data.user.shopDetails?.name || '',
        shopPhone: data.user.shopDetails?.phone || '',
        shopAddress: data.user.shopDetails?.address || '',
        gstin: data.user.shopDetails?.gstin || ''
      };
      const existingUserBackup = localStorage.getItem(`rxsmart_user_backup_${email.toLowerCase()}`);
      if (existingUserBackup) {
        try {
          const parsed = JSON.parse(existingUserBackup);
          userBackupData.password = parsed.password;
        } catch (e) {}
      }
      localStorage.setItem(`rxsmart_user_backup_${email.toLowerCase()}`, JSON.stringify(userBackupData));
      
      backupDatabaseLocally(email);
      
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

      localStorage.setItem(`rxsmart_user_backup_${signUpData.email.toLowerCase()}`, JSON.stringify(signUpData));
      backupDatabaseLocally(signUpData.email);

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
      if (profileData?.email) {
        backupDatabaseLocally(profileData.email);
      }
    } catch (error) {
      console.error('[Refresh profile error]:', error);
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const data = await api.auth.updateProfile(profileData);
      setUser(data.user);
      
      const email = data.user.email;
      const existingUserBackup = localStorage.getItem(`rxsmart_user_backup_${email.toLowerCase()}`);
      let password = '';
      if (existingUserBackup) {
        try {
          password = JSON.parse(existingUserBackup).password;
        } catch (e) {}
      }
      const userBackupData = {
        email: data.user.email,
        username: data.user.username,
        shopName: data.user.shopDetails?.name || '',
        shopPhone: data.user.shopDetails?.phone || '',
        shopAddress: data.user.shopDetails?.address || '',
        gstin: data.user.shopDetails?.gstin || '',
        password: password
      };
      localStorage.setItem(`rxsmart_user_backup_${email.toLowerCase()}`, JSON.stringify(userBackupData));
      
      backupDatabaseLocally(email);
      
      return data;
    } catch (error) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, loginWithOTP, signupWithOTP, logout, refreshProfile, updateProfile, backupDatabaseLocally }}>
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
