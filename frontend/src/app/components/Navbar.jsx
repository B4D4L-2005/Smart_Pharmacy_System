import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotification } from '../context/NotificationContext.jsx';
import { api } from '../lib/api.js';
import { Bell, RefreshCw, AlertTriangle, Menu } from 'lucide-react';

export function Navbar({ title, onNavigate, onToggleSidebar }) {
  const { user } = useAuth();
  const { unreadCount, fetchAlerts, showToast } = useNotification();
  const [scanning, setScanning] = useState(false);

  const shopName = user?.shopDetails?.name || 'Care & Cure Pharmacy';
  const gstin = user?.shopDetails?.gstin;

  const handleManualScan = async () => {
    setScanning(true);
    try {
      const response = await api.medicines.triggerScan();
      await fetchAlerts();
      showToast(response.message || 'Inventory scan complete. Alerts updated.', 'success');
    } catch (error) {
      console.error('Scan error:', error);
      showToast('Inventory scan failed: ' + error.message, 'danger');
    } finally {
      setScanning(false);
    }
  };

  return (
    <header 
      className="glass-panel animate-fade-in"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 24px',
        margin: '16px 16px 0 16px',
        minHeight: '70px',
        height: 'auto',
        zIndex: 90,
        boxSizing: 'border-box'
      }}
    >
      {/* Title & Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Mobile menu trigger */}
        <button
          onClick={onToggleSidebar}
          className="mobile-menu-trigger"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            padding: '4px',
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Menu size={22} />
        </button>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '800' }}>{title}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>
              {shopName}
            </span>
            {gstin && (
              <>
                <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--text-muted)' }}></span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  GSTIN: {gstin}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Action Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
        
        {/* Manual Inventory Scan Button */}
        <button
          onClick={handleManualScan}
          disabled={scanning}
          title="Run manual inventory check"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '10px',
            border: '1px solid var(--border-glass)',
            background: 'var(--bg-glass)',
            color: 'var(--text-primary)',
            fontSize: '12px',
            fontWeight: '600',
            cursor: scanning ? 'not-allowed' : 'pointer',
            transition: 'all var(--transition-fast)'
          }}
          onMouseEnter={(e) => { if(!scanning) e.currentTarget.style.border = '1px solid var(--border-glass-bright)'; }}
          onMouseLeave={(e) => { if(!scanning) e.currentTarget.style.border = '1px solid var(--border-glass)'; }}
        >
          <RefreshCw size={14} className={scanning ? 'spin-animation' : ''} />
          <span>{scanning ? 'Scanning...' : 'Scan Inventory'}</span>
        </button>

        {/* Notifications Icon Button */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => onNavigate('notifications')}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              border: '1px solid var(--border-glass)',
              background: 'var(--bg-glass)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              transition: 'all var(--transition-fast)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.border = '1px solid var(--border-glass-bright)'}
            onMouseLeave={(e) => e.currentTarget.style.border = '1px solid var(--border-glass)'}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: '#ef4444',
                color: '#ffffff',
                fontSize: '10px',
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* User initials Avatar */}
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          background: 'var(--bg-glass-active)',
          border: '1px solid var(--border-glass-bright)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: '700',
          fontSize: '14px',
          color: 'var(--primary)'
        }}>
          {user?.username ? user.username.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0, 2) : 'M'}
        </div>

      </div>

      <style>{`
        .spin-animation {
          animation: rotate 1s linear infinite;
        }
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </header>
  );
}
export default Navbar;
