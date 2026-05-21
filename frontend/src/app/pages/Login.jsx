import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotification } from '../context/NotificationContext.jsx';
import { api } from '../lib/api.js';
import { Plus, Phone, MessageSquare } from 'lucide-react';

export function Login({ onNavigate }) {
  const { loginWithOTP } = useAuth();
  const { showToast } = useNotification();
  
  // OTP States
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [whatsappLink, setWhatsappLink] = useState('');
  
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!phone) {
      showToast('Please enter your phone number.', 'warning');
      return;
    }

    setLoading(true);
    try {
      let res;
      try {
        res = await api.auth.sendOTP(phone, false);
      } catch (err) {
        // If the backend has reset and the user is not found, restore the user silently using local backups
        if (err.message && (err.message.toLowerCase().includes('not registered') || err.message.toLowerCase().includes('not found'))) {
          const backupDataStr = localStorage.getItem(`rxsmart_user_backup_${phone}`);
          if (backupDataStr) {
            console.log('[Auth] Render database reset detected. Restoring user store profile...');
            const backupData = JSON.parse(backupDataStr);
            await api.auth.restoreUser({
              email: backupData.email,
              password: backupData.password,
              username: backupData.username,
              shopName: backupData.shopName,
              shopPhone: backupData.phoneNumber,
              shopAddress: backupData.shopAddress,
              gstin: backupData.gstin
            });
            // Retry sending OTP after restoration
            res = await api.auth.sendOTP(phone, false);
          } else {
            throw err;
          }
        } else {
          throw err;
        }
      }
      setOtpSent(true);
      showToast(`SMS Simulator: Verification code is ${res.otpCode} (valid for 2 mins)`, 'success');
    } catch (err) {
      showToast(err.message || 'Failed to send OTP code.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!phone || !otpCode) {
      showToast('Please enter the OTP verification code.', 'warning');
      return;
    }

    setLoading(true);
    try {
      await loginWithOTP(phone, otpCode);
      showToast('Phone number verified. Welcome back!', 'success');
      onNavigate('dashboard');
    } catch (err) {
      showToast(err.message || 'Verification failed. Invalid OTP code.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-outer-container">
      {/* Decors */}
      <div className="glow-sphere glow-sphere-1" />
      <div className="glow-sphere glow-sphere-2" />

      {/* Login Card */}
      <div 
        className="glass-panel auth-card animate-slide-up"
        style={{ maxWidth: '440px' }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <div 
            onClick={() => onNavigate('landing')}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              margin: '0 auto 16px auto',
              cursor: 'pointer'
            }}
          >
            <Plus size={28} strokeWidth={2.5} />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '6px' }}>Store Sign In</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Log in via OTP sent to your registered phone number</p>
        </div>

        {/* OTP Login Form */}
        <form onSubmit={otpSent ? handleVerifyOTP : handleSendOTP} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Phone Number */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>REGISTERED PHONE NUMBER</label>
            <div style={{ position: 'relative' }}>
              <Phone 
                size={16} 
                style={{ 
                  position: 'absolute', 
                  left: '14px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: 'var(--text-muted)' 
                }} 
              />
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={otpSent}
                className="glass-input"
                style={{ paddingLeft: '42px' }}
                required
              />
            </div>
          </div>
          {/* OTP Code input (Only show after sent) */}
          {otpSent && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>ENTER 6-DIGIT OTP</label>
              <div style={{ position: 'relative' }}>
                <MessageSquare 
                  size={16} 
                  style={{ 
                    position: 'absolute', 
                    left: '14px', 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    color: 'var(--text-muted)' 
                  }} 
                />
                <input
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="glass-input"
                  style={{ paddingLeft: '42px', fontFamily: 'monospace', letterSpacing: '4px', fontSize: '16px' }}
                  required
                />
              </div>



              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Simulated SMS OTP</span>
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                >
                  Change Phone Number
                </button>
              </div>
            </div>
          )}
          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="glass-btn glass-btn-primary"
            style={{ width: '100%', marginTop: '8px' }}
          >
            {loading ? 'Processing...' : otpSent ? 'Verify & Sign In' : 'Send Verification OTP'}
          </button>
        </form>

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          fontSize: '13px',
          color: 'var(--text-secondary)',
          borderTop: '1px solid var(--border-glass)',
          paddingTop: '16px'
        }}>
          Need to configure a new store?{' '}
          <button
            onClick={() => onNavigate('signup')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              fontWeight: '700',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Register here
          </button>
        </div>
      </div>
    </div>
  );
}
export default Login;
