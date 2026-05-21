import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { useNotification } from '../context/NotificationContext.jsx';
import { 
  Bell, 
  Check, 
  Trash2, 
  AlertTriangle, 
  RefreshCw,
  Eye,
  AlertCircle
} from 'lucide-react';

export function Notifications() {
  const { showToast, fetchAlerts, alerts, unreadCount } = useNotification();
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('All'); // 'All' | 'unread' | 'read'

  const loadNotifications = async () => {
    setLoading(true);
    await fetchAlerts();
    setLoading(false);
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await api.notifications.markRead(id);
      showToast('Notification marked as read.', 'success');
      fetchAlerts();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    try {
      const res = await api.notifications.markAllRead();
      showToast(res.message || 'All warnings marked as read.', 'success');
      fetchAlerts();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  const handleClearHistory = async () => {
    if (alerts.length === 0) return;
    if (window.confirm('Are you sure you want to clear your notification history log? This cannot be undone.')) {
      try {
        const res = await api.notifications.clearAll();
        showToast(res.message || 'Notification log history cleared.', 'success');
        fetchAlerts();
      } catch (err) {
        showToast(err.message, 'danger');
      }
    }
  };

  const handleDeleteAlert = async (id) => {
    try {
      await api.notifications.delete(id);
      showToast('Notification deleted.', 'success');
      fetchAlerts();
    } catch (err) {
      showToast(err.message, 'danger');
    }
  };

  // Filter lists
  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'unread') return alert.status === 'unread';
    if (filter === 'read') return alert.status === 'read';
    return true;
  });

  const getAlertStyle = (type) => {
    switch (type) {
      case 'expired':
      case 'out_of_stock':
        return {
          bg: 'rgba(239, 68, 68, 0.04)',
          border: '1px solid rgba(239, 68, 68, 0.15)',
          color: '#ef4444'
        };
      case 'near_expiry':
      case 'low_stock':
        return {
          bg: 'rgba(245, 158, 11, 0.04)',
          border: '1px solid rgba(245, 158, 11, 0.15)',
          color: '#f59e0b'
        };
      default:
        return {
          bg: 'rgba(59, 130, 246, 0.04)',
          border: '1px solid rgba(59, 130, 246, 0.15)',
          color: '#3b82f6'
        };
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Control Actions Header */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
        
        {/* Toggle selectors */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {['All', 'unread', 'read'].map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className="glass-btn"
              style={{
                padding: '8px 16px',
                fontSize: '12px',
                borderRadius: '8px',
                background: filter === tab ? 'var(--bg-glass-active)' : 'var(--bg-glass)',
                border: filter === tab ? '1px solid var(--border-glass-bright)' : '1px solid var(--border-glass)',
                color: filter === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: '700',
                textTransform: 'capitalize'
              }}
            >
              {tab === 'All' ? 'All Alerts' : `${tab} warnings`}
            </button>
          ))}
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '12px' }}>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="glass-btn glass-btn-secondary"
              style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '8px' }}
            >
              <Check size={14} />
              <span>Mark All Read</span>
            </button>
          )}

          {alerts.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="glass-btn glass-btn-danger"
              style={{ padding: '8px 16px', fontSize: '12px', borderRadius: '8px' }}
            >
              <Trash2 size={14} />
              <span>Clear Log</span>
            </button>
          )}
        </div>

      </div>

      {/* Alerts list log panel */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '16px' }}>
            <RefreshCw size={24} className="spin-animation" style={{ color: 'var(--primary)' }} />
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Syncing notification logs...</span>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <AlertCircle size={32} style={{ color: 'var(--success)' }} />
            <span style={{ fontSize: '15px', fontWeight: '600' }}>No alert notifications to display.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredAlerts.map(alert => {
              const style = getAlertStyle(alert.type);
              return (
                <div
                  key={alert.id}
                  className="glass-panel-hover"
                  style={{
                    background: style.bg,
                    border: style.border,
                    borderRadius: '12px',
                    padding: '16px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px',
                    boxSizing: 'border-box'
                  }}
                >
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border-glass)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: style.color,
                      marginTop: '2px'
                    }}>
                      <AlertTriangle size={16} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{
                        fontSize: '14px',
                        color: 'var(--text-primary)',
                        fontWeight: alert.status === 'unread' ? '700' : '500',
                        textDecoration: alert.status === 'read' ? 'none' : 'none'
                      }}>
                        {alert.message}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Logged: {new Date(alert.createdAt).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Actions per item */}
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {alert.status === 'unread' && (
                      <button
                        onClick={() => handleMarkRead(alert.id)}
                        title="Mark as Read"
                        style={{
                          background: 'var(--bg-glass)',
                          border: '1px solid var(--border-glass)',
                          color: 'var(--success)',
                          padding: '6px 10px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          fontWeight: '700'
                        }}
                      >
                        <Eye size={12} />
                        <span>Acknowledge</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteAlert(alert.id)}
                      title="Delete log"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        padding: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
export default Notifications;
