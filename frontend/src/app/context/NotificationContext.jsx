import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api.js';

const NotificationContext = createContext();

export function NotificationProvider({ children, isAuthenticated }) {
  const [toasts, setToasts] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // 1. Toast UI Notification System
  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // 2. Database Inventory Alerts System
  const fetchAlerts = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await api.notifications.list();
      setAlerts(data);
      const unread = data.filter(n => n.status === 'unread').length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('[Notification Context] Failed to fetch alerts:', error);
    }
  }, [isAuthenticated]);

  // Fetch alerts on auth state change and set up periodic scan/fetch
  useEffect(() => {
    if (isAuthenticated) {
      fetchAlerts();
      
      // Poll every 30 seconds to keep alerts badge live
      const interval = setInterval(fetchAlerts, 30000);
      return () => clearInterval(interval);
    } else {
      setAlerts([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated, fetchAlerts]);

  return (
    <NotificationContext.Provider value={{ 
      toasts, 
      showToast, 
      removeToast, 
      alerts, 
      unreadCount, 
      fetchAlerts 
    }}>
      {children}
      
      {/* Dynamic Floating Toast Container */}
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        pointerEvents: 'none'
      }}>
        {toasts.map(toast => {
          let bg, border, color;
          
          if (toast.type === 'success') {
            bg = 'rgba(16, 185, 129, 0.85)';
            border = '1px solid rgba(16, 185, 129, 0.4)';
            color = '#ffffff';
          } else if (toast.type === 'danger') {
            bg = 'rgba(239, 68, 68, 0.85)';
            border = '1px solid rgba(239, 68, 68, 0.4)';
            color = '#ffffff';
          } else if (toast.type === 'warning') {
            bg = 'rgba(245, 158, 11, 0.85)';
            border = '1px solid rgba(245, 158, 11, 0.4)';
            color = '#ffffff';
          } else {
            bg = 'rgba(59, 130, 246, 0.85)';
            border = '1px solid rgba(59, 130, 246, 0.4)';
            color = '#ffffff';
          }

          return (
            <div 
              key={toast.id}
              onClick={() => removeToast(toast.id)}
              className="animate-slide-up"
              style={{
                background: bg,
                border: border,
                color: color,
                padding: '14px 20px',
                borderRadius: '12px',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                minWidth: '280px',
                maxWidth: '380px',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                pointerEvents: 'auto',
                userSelect: 'none',
                boxSizing: 'border-box'
              }}
            >
              <span>{toast.message}</span>
              <button 
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'inherit',
                  marginLeft: '12px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  opacity: 0.7
                }}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
