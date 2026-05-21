import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useNotification } from '../context/NotificationContext.jsx';
import { 
  LayoutDashboard, 
  Pill, 
  CalendarX, 
  Receipt, 
  History, 
  BarChart3, 
  Bell, 
  Store, 
  LogOut, 
  Sun, 
  Moon,
  Plus
} from 'lucide-react';

export function Sidebar({ currentPage, setCurrentPage, isOpen, setIsOpen }) {
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { unreadCount } = useNotification();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'medicines', label: 'Medicines Stock', icon: Pill },
    { id: 'expired', label: 'Expiry Tracker', icon: CalendarX },
    { id: 'billing', label: 'New Bill (POS)', icon: Receipt, highlight: true },
    { id: 'history', label: 'Billing History', icon: History },
    { id: 'reports', label: 'Sales Reports', icon: BarChart3 },
    { id: 'notifications', label: 'System Alerts', icon: Bell, badge: true },
    { id: 'profile', label: 'Shop Settings', icon: Store }
  ];

  return (
    <>
      {/* Mobile drawer backdrop */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(4px)',
            zIndex: 99
          }}
        />
      )}
      
      <div className={`glass-panel app-sidebar ${isOpen ? 'open' : ''}`}>
      {/* Brand Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '32px',
        padding: '0 8px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px var(--primary-glow)',
          color: '#ffffff'
        }}>
          <Plus size={24} strokeWidth={2.5} />
        </div>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '800', lineHeight: 1.1 }}>RxSmart</h2>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>Pharmacy Shop POS</span>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                setCurrentPage(item.id);
                if (setIsOpen) setIsOpen(false);
              }}
              className={`sidebar-btn ${isActive ? 'active' : ''} ${item.highlight ? 'highlight' : ''}`}
            >
              <Icon size={18} />
              <span style={{ flex: 1 }}>{item.label}</span>
              
              {item.badge && unreadCount > 0 && (
                <span 
                  className="badge badge-danger" 
                  style={{ 
                    padding: '2px 6px', 
                    fontSize: '10px', 
                    borderRadius: '6px',
                    animation: 'pulse 2s infinite'
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Controls */}
      <div style={{
        marginTop: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        borderTop: '1px solid var(--border-glass)',
        paddingTop: '16px'
      }}>
        {/* Theme Toggle & User Info */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.username || 'Store Owner'}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              Manager Account
            </span>
          </div>
          
          <button
            onClick={toggleTheme}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              border: '1px solid var(--border-glass)',
              background: 'var(--bg-glass)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all var(--transition-fast)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.border = '1px solid var(--border-glass-bright)'}
            onMouseLeave={(e) => e.currentTarget.style.border = '1px solid var(--border-glass)'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: '12px',
            border: '1px solid rgba(239, 68, 68, 0.15)',
            background: 'rgba(239, 68, 68, 0.05)',
            color: '#ef4444',
            cursor: 'pointer',
            textAlign: 'left',
            fontSize: '14px',
            fontWeight: '600',
            transition: 'all var(--transition-fast)',
            width: '100%'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)';
          }}
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
      
      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
      `}</style>
    </div>
    </>
  );
}

export default Sidebar;
