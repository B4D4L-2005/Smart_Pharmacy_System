import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotification } from '../context/NotificationContext.jsx';
import { api } from '../lib/api.js';
import { Mail, KeyRound, User, Store, Phone, MapPin, Percent, Plus, MessageSquare } from 'lucide-react';

export function Signup({ onNavigate }) {
  const { signupWithOTP } = useAuth();
  const { showToast } = useNotification();
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shopName, setShopName] = useState('');
  const [shopPhone, setShopPhone] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [gstin, setGstin] = useState('');

  // OTP States
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [whatsappLink, setWhatsappLink] = useState('');
 
  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!username || !email || !password || !shopName || !shopPhone) {
      showToast('Please fill out all required fields (*).', 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.sendOTP(shopPhone, true);
      setOtpSent(true);
      if (res.whatsappLink) {
        setWhatsappLink(res.whatsappLink);
        window.open(res.whatsappLink, '_blank');
      }
      showToast(`SMS Simulator: Registration code is ${res.otpCode} (valid for 2 mins)`, 'success');
    } catch (err) {
      showToast(err.message || 'Failed to send OTP code.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    if (!otpCode) {
      showToast('Please enter the OTP verification code.', 'warning');
      return;
    }

    setLoading(true);
    try {
      await signupWithOTP({
        phoneNumber: shopPhone,
        otpCode,
        username,
        email,
        password,
        shopName,
        shopAddress,
        gstin
      });
      showToast('Phone number verified. Pharmacy profile created successfully!', 'success');
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

      {/* Signup Card */}
      <div 
        className="glass-panel auth-card animate-slide-up"
        style={{ maxWidth: '560px' }}
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
          <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '6px' }}>Register Pharmacy Store</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Initialize your local store profile and manager account</p>
        </div>

        {/* Form */}
        <form onSubmit={otpSent ? handleVerifyAndRegister : handleSendOTP} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Section: Account Details */}
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--primary)', marginBottom: '12px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
              ACCOUNT INFO
            </h3>
            
            <div className="form-grid-2col">
              {/* Username */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>FULL NAME *</label>
                <div style={{ position: 'relative' }}>
                  <User size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={otpSent}
                    className="glass-input"
                    style={{ paddingLeft: '36px', height: '40px', paddingTop: 0, paddingBottom: 0 }}
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>EMAIL ADDRESS *</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="email"
                    placeholder="manager@care.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={otpSent}
                    className="glass-input"
                    style={{ paddingLeft: '36px', height: '40px', paddingTop: 0, paddingBottom: 0 }}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '12px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>PASSWORD *</label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="password"
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={otpSent}
                  className="glass-input"
                  style={{ paddingLeft: '36px', height: '40px', paddingTop: 0, paddingBottom: 0 }}
                  required
                />
              </div>
            </div>
          </div>

          {/* Section: Shop Details */}
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--primary)', marginBottom: '12px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
              PHARMACY DETAILS
            </h3>

            <div className="form-grid-2col">
              {/* Shop Name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>PHARMACY NAME *</label>
                <div style={{ position: 'relative' }}>
                  <Store size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Care & Cure Pharmacy"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    disabled={otpSent}
                    className="glass-input"
                    style={{ paddingLeft: '36px', height: '40px', paddingTop: 0, paddingBottom: 0 }}
                    required
                  />
                </div>
              </div>

              {/* Shop Phone */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>CONTACT PHONE *</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={shopPhone}
                    onChange={(e) => setShopPhone(e.target.value)}
                    disabled={otpSent}
                    className="glass-input"
                    style={{ paddingLeft: '36px', height: '40px', paddingTop: 0, paddingBottom: 0 }}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-grid-2col" style={{ marginTop: '12px' }}>
              {/* Shop Address */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>SHOP ADDRESS</label>
                <div style={{ position: 'relative' }}>
                  <MapPin size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="MG Road, Bengaluru"
                    value={shopAddress}
                    onChange={(e) => setShopAddress(e.target.value)}
                    disabled={otpSent}
                    className="glass-input"
                    style={{ paddingLeft: '36px', height: '40px', paddingTop: 0, paddingBottom: 0 }}
                  />
                </div>
              </div>

              {/* GSTIN */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>STORE GSTIN</label>
                <div style={{ position: 'relative' }}>
                  <Percent size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="29AAAAA1111A1Z1"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    disabled={otpSent}
                    className="glass-input"
                    style={{ paddingLeft: '36px', height: '40px', paddingTop: 0, paddingBottom: 0 }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* OTP Code input (Only show after sent) */}
          {otpSent && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px dashed var(--border-glass)', paddingTop: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--primary)' }}>ENTER 6-DIGIT VERIFICATION OTP *</label>
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

              {whatsappLink && (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass-btn"
                  style={{
                    marginTop: '8px',
                    background: '#25d366',
                    color: '#ffffff',
                    boxShadow: '0 4px 12px rgba(37, 211, 102, 0.25)',
                    fontSize: '12px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    textDecoration: 'none'
                  }}
                >
                  Receive OTP on WhatsApp
                </a>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Simulated SMS verification code sent</span>
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                >
                  Edit Registration Details
                </button>
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="glass-btn glass-btn-primary"
            style={{ width: '100%', marginTop: '12px' }}
          >
            {loading ? 'Processing...' : otpSent ? 'Verify OTP & Complete Registration' : 'Send Verification OTP'}
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
          Already registered a pharmacy?{' '}
          <button
            onClick={() => onNavigate('login')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              fontWeight: '700',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Sign In here
          </button>
        </div>
      </div>
    </div>
  );
}
export default Signup;
