import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { useNotification } from '../context/NotificationContext.jsx';
import { 
  AlertTriangle, 
  Trash2, 
  RefreshCw, 
  Calendar,
  AlertCircle,
  TrendingDown
} from 'lucide-react';

export function ExpiredMedicines() {
  const { showToast, fetchAlerts } = useNotification();
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('expired'); // 'expired' | 'near_expiry'

  const fetchStock = async () => {
    try {
      setLoading(true);
      const data = await api.medicines.list();
      setMedicines(data);
    } catch (err) {
      showToast('Error loading tracking lists: ' + err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStock();
  }, []);

  const now = new Date();
  const ninetyDaysFromNow = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000));

  // Filter lists
  const expiredMeds = medicines.filter(m => new Date(m.expiryDate) < now);
  const nearExpiryMeds = medicines.filter(m => {
    const expiry = new Date(m.expiryDate);
    return expiry >= now && expiry <= ninetyDaysFromNow;
  });

  const displayList = activeTab === 'expired' ? expiredMeds : nearExpiryMeds;

  // Calculate financial losses
  const totalExpiredLoss = expiredMeds.reduce((sum, m) => sum + (m.price * m.stockQuantity), 0);
  const totalNearExpiryValue = nearExpiryMeds.reduce((sum, m) => sum + (m.price * m.stockQuantity), 0);

  // Discard function (sets stock quantity to 0)
  const handleDiscard = async (id, name) => {
    if (window.confirm(`Are you sure you want to write-off and discard all stock of ${name}? This sets its stock to 0.`)) {
      try {
        await api.medicines.update(id, { stockQuantity: 0 });
        showToast(`Stock for ${name} written-off successfully.`, 'success');
        fetchStock();
        fetchAlerts(); // Sync notifications
      } catch (err) {
        showToast('Operation failed: ' + err.message, 'danger');
      }
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Overview Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px'
      }}>
        {/* Expired Losses */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ef4444'
          }}>
            <TrendingDown size={24} />
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700' }}>EXPIRED STOCK LOSSES (VALUATION)</span>
            <h3 style={{ fontSize: '24px', fontWeight: '800', marginTop: '2px', color: '#ef4444' }}>
              ₹{totalExpiredLoss.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{expiredMeds.length} expired batches currently in stock</span>
          </div>
        </div>

        {/* Near Expiry Valuation */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f59e0b'
          }}>
            <Calendar size={24} />
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700' }}>NEAR EXPIRY VALUE (90 DAYS)</span>
            <h3 style={{ fontSize: '24px', fontWeight: '800', marginTop: '2px', color: '#f59e0b' }}>
              ₹{totalNearExpiryValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{nearExpiryMeds.length} batches expiring within 3 months</span>
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        
        {/* Toggle tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border-glass)',
          marginBottom: '20px',
          gap: '16px'
        }}>
          <button
            onClick={() => setActiveTab('expired')}
            style={{
              padding: '12px 20px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'expired' ? '2px solid #ef4444' : '2px solid transparent',
              color: activeTab === 'expired' ? '#ef4444' : 'var(--text-secondary)',
              fontWeight: '700',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)'
            }}
          >
            Expired Batches ({expiredMeds.length})
          </button>
          <button
            onClick={() => setActiveTab('near_expiry')}
            style={{
              padding: '12px 20px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'near_expiry' ? '2px solid #f59e0b' : '2px solid transparent',
              color: activeTab === 'near_expiry' ? '#f59e0b' : 'var(--text-secondary)',
              fontWeight: '700',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)'
            }}
          >
            Expiring Soon ({nearExpiryMeds.length})
          </button>
        </div>

        {/* Tab content */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '16px' }}>
            <RefreshCw size={24} className="spin-animation" style={{ color: 'var(--primary)' }} />
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Scanning dates...</span>
          </div>
        ) : displayList.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <AlertCircle size={32} style={{ color: 'var(--success)' }} />
            <span style={{ fontSize: '15px', fontWeight: '600' }}>
              {activeTab === 'expired' ? 'No expired medicines in stock.' : 'No medicines expiring within 90 days.'}
            </span>
          </div>
        ) : (
          <div className="glass-table-container">
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Medicine Name</th>
                  <th>Category</th>
                  <th>Batch No</th>
                  <th>Price (₹)</th>
                  <th>Stock Qty</th>
                  <th>Expiry Date</th>
                  <th>Loss Valuation (₹)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayList.map(med => {
                  const lossVal = med.price * med.stockQuantity;
                  return (
                    <tr key={med.id}>
                      <td style={{ fontWeight: '700' }}>{med.name}</td>
                      <td>{med.category}</td>
                      <td style={{ fontFamily: 'monospace', fontWeight: '600' }}>{med.batchNumber}</td>
                      <td>₹{med.price.toFixed(2)}</td>
                      <td style={{ fontWeight: '700' }}>{med.stockQuantity}</td>
                      <td style={{ 
                        fontWeight: '700', 
                        color: activeTab === 'expired' ? '#ef4444' : '#f59e0b' 
                      }}>
                        {new Date(med.expiryDate).toLocaleDateString('en-IN')}
                      </td>
                      <td style={{ fontWeight: '800' }}>₹{lossVal.toFixed(2)}</td>
                      <td>
                        {med.stockQuantity > 0 ? (
                          <button
                            onClick={() => handleDiscard(med.id, med.name)}
                            className="glass-btn glass-btn-danger"
                            style={{ 
                              padding: '6px 12px', 
                              fontSize: '11px',
                              display: 'inline-flex',
                              gap: '6px',
                              alignItems: 'center' 
                            }}
                          >
                            <Trash2 size={12} />
                            <span>Write-Off Stock</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>Written-off</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
export default ExpiredMedicines;
