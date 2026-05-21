import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { useNotification } from '../context/NotificationContext.jsx';
import { 
  TrendingUp, 
  Package, 
  AlertTriangle, 
  CalendarX, 
  Clock, 
  ArrowRight,
  Eye,
  RefreshCw,
  Layers
} from 'lucide-react';

export function Dashboard({ onNavigate, setViewInvoiceId }) {
  const { showToast } = useNotification();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await api.reports.getDashboardStats();
      setStats(data);
    } catch (err) {
      showToast('Failed to load dashboard metrics: ' + err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px' }}>
        <RefreshCw size={32} className="spin-animation" style={{ color: 'var(--primary)' }} />
        <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600' }}>Fetching pharmacy statistics...</span>
      </div>
    );
  }

  // Calculate highest revenue amount for charting scaling
  const revenues = stats?.dailyRevenue || [];
  const maxRevenue = Math.max(...revenues.map(r => r.amount), 500); // minimum scale ceiling 500

  return (
    <div className="dashboard-container animate-fade-in">
      
      {/* 4 KPIs grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px'
      }}>
        {/* Total Sales */}
        <div className="glass-panel glass-panel-hover card-accent-success" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#10b981'
          }}>
            <TrendingUp size={20} />
          </div>
          <div>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '700', letterSpacing: '0.5px' }}>TOTAL SALES REVENUE</span>
            <h3 style={{ fontSize: '20px', fontWeight: '800', marginTop: '2px' }}>₹{stats?.totalSales.toLocaleString('en-IN')}</h3>
          </div>
        </div>

        {/* Total Stock */}
        <div className="glass-panel glass-panel-hover card-accent-primary" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#3b82f6'
          }}>
            <Package size={20} />
          </div>
          <div>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '700', letterSpacing: '0.5px' }}>TOTAL MEDICINES STOCK</span>
            <h3 style={{ fontSize: '20px', fontWeight: '800', marginTop: '2px' }}>{stats?.totalStock.toLocaleString()} units</h3>
          </div>
        </div>

        {/* Low Stock Warnings */}
        <div 
          onClick={() => onNavigate('notifications')}
          className="glass-panel glass-panel-hover card-accent-warning" 
          style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
        >
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f59e0b'
          }}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '700', letterSpacing: '0.5px' }}>LOW STOCK ITEMS</span>
            <h3 style={{ fontSize: '20px', fontWeight: '800', marginTop: '2px', color: stats?.lowStockCount > 0 ? '#f59e0b' : 'inherit' }}>
              {stats?.lowStockCount}
            </h3>
          </div>
        </div>

        {/* Expired items */}
        <div 
          onClick={() => onNavigate('expired')}
          className="glass-panel glass-panel-hover card-accent-danger" 
          style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
        >
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ef4444'
          }}>
            <CalendarX size={20} />
          </div>
          <div>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '700', letterSpacing: '0.5px' }}>EXPIRED BATCHES</span>
            <h3 style={{ fontSize: '20px', fontWeight: '800', marginTop: '2px', color: stats?.expiredCount > 0 ? '#ef4444' : 'inherit' }}>
              {stats?.expiredCount}
            </h3>
          </div>
        </div>
      </div>

      {/* Main Content Area: Chart and Categories */}
      <div className="dashboard-responsive-grid">
        {/* Daily Revenue Chart Card */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Daily Revenue Trend (Last 7 Days)</h3>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>VALUES IN INR (₹)</span>
          </div>

          {/* Render beautiful custom CSS/SVG-based bar chart */}
          <div style={{
            height: '240px',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '20px 10px 10px 10px',
            borderBottom: '1px solid var(--border-glass)',
            position: 'relative'
          }}>
            {revenues.map((item, idx) => {
              const heightPercent = (item.amount / maxRevenue) * 85 + 5; // offset bottom slightly
              return (
                <div 
                  key={idx}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    height: '100%',
                    justifyContent: 'flex-end',
                    gap: '8px'
                  }}
                >
                  {/* Tooltip on hover */}
                  <div className="chart-tooltip" style={{
                    fontSize: '10px',
                    fontWeight: '800',
                    background: 'var(--bg-glass-active)',
                    border: '1px solid var(--border-glass-bright)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    color: 'var(--text-primary)',
                    opacity: item.amount > 0 ? 0.9 : 0.4
                  }}>
                    ₹{Math.round(item.amount)}
                  </div>
                  
                  {/* Visual Bar */}
                  <div style={{
                    width: '100%',
                    maxWidth: '40px',
                    height: `${heightPercent}%`,
                    borderRadius: '6px 6px 0 0',
                    background: 'linear-gradient(to top, var(--primary) 30%, var(--secondary) 100%)',
                    boxShadow: '0 4px 12px var(--primary-glow)',
                    transition: 'height var(--transition-slow)',
                    minHeight: item.amount > 0 ? '4px' : '2px'
                  }} />
                  
                  {/* X Axis Label */}
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', whiteSpace: 'nowrap' }}>
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Medicine Inventory Allocation Categories breakdown */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Medicine Categories</h3>
          
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            overflowY: 'auto',
            maxHeight: '240px'
          }}>
            {stats?.categories.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '30px' }}>
                No medicine stock registered.
              </div>
            ) : (
              stats?.categories.map((cat, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '700' }}>
                    <span>{cat.name}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{cat.stock} units ({cat.count} meds)</span>
                  </div>
                  {/* Progress track */}
                  <div style={{
                    width: '100%',
                    height: '6px',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '99px',
                    border: '1px solid var(--border-glass)',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min((cat.stock / (stats.totalStock || 1)) * 100, 100)}%`,
                      background: idx % 3 === 0 ? 'var(--primary)' : idx % 3 === 1 ? 'var(--secondary)' : 'var(--accent)',
                      borderRadius: '99px'
                    }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Recent Bills and Stock statuses */}
      <div className="dashboard-responsive-grid">
        {/* Recent Bills List */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Recent Sales Bills</h3>
            <button
              onClick={() => onNavigate('history')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                fontWeight: '700',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>View Archives</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="glass-table-container">
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {stats?.recentBills.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                      No bills processed yet. Open the POS window to bill customers.
                    </td>
                  </tr>
                ) : (
                  stats?.recentBills.map(bill => (
                    <tr key={bill.id}>
                      <td style={{ fontWeight: '700', fontFamily: 'monospace' }}>{bill.invoiceNumber}</td>
                      <td>{bill.customerName}</td>
                      <td>{new Date(bill.date).toLocaleDateString('en-IN')}</td>
                      <td style={{ fontWeight: '800' }}>₹{bill.finalTotal.toFixed(2)}</td>
                      <td>
                        <button
                          onClick={() => setViewInvoiceId(bill.id)}
                          style={{
                            background: 'var(--bg-glass)',
                            border: '1px solid var(--border-glass)',
                            borderRadius: '8px',
                            color: 'var(--text-primary)',
                            padding: '6px 10px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}
                        >
                          <Eye size={12} />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Circular / Ring Progress Allocation Status */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Inventory Stock Health</h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '16px'
          }}>
            {/* In Stock */}
            <div style={{
              background: 'rgba(16, 185, 129, 0.03)',
              border: '1px solid rgba(16, 185, 129, 0.15)',
              padding: '16px',
              borderRadius: '12px',
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '10px', fontWeight: '700', color: '#10b981', display: 'block', marginBottom: '4px' }}>IN STOCK</span>
              <span style={{ fontSize: '20px', fontWeight: '800' }}>{stats?.stockStatus?.inStock || 0}</span>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>Items OK</span>
            </div>

            {/* Low Stock */}
            <div style={{
              background: 'rgba(245, 158, 11, 0.03)',
              border: '1px solid rgba(245, 158, 11, 0.15)',
              padding: '16px',
              borderRadius: '12px',
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '10px', fontWeight: '700', color: '#f59e0b', display: 'block', marginBottom: '4px' }}>LOW STOCK</span>
              <span style={{ fontSize: '20px', fontWeight: '800', color: '#f59e0b' }}>{stats?.stockStatus?.lowStock || 0}</span>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>Reorder Soon</span>
            </div>

            {/* Out of Stock */}
            <div style={{
              background: 'rgba(239, 68, 68, 0.03)',
              border: '1px solid rgba(239, 68, 68, 0.15)',
              padding: '16px',
              borderRadius: '12px',
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '10px', fontWeight: '700', color: '#ef4444', display: 'block', marginBottom: '4px' }}>OUT OF STOCK</span>
              <span style={{ fontSize: '20px', fontWeight: '800', color: '#ef4444' }}>{stats?.stockStatus?.outOfStock || 0}</span>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>Zero Units</span>
            </div>

            {/* Expired */}
            <div style={{
              background: 'rgba(107, 114, 128, 0.03)',
              border: '1px solid rgba(107, 114, 128, 0.15)',
              padding: '16px',
              borderRadius: '12px',
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>EXPIRED</span>
              <span style={{ fontSize: '20px', fontWeight: '800', color: '#ef4444' }}>{stats?.stockStatus?.expired || 0}</span>
              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>Discard Batches</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default Dashboard;
