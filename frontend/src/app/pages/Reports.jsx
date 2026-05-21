import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { useNotification } from '../context/NotificationContext.jsx';
import { 
  BarChart3, 
  Download, 
  Layers, 
  TrendingUp, 
  DollarSign, 
  RefreshCw,
  AlertCircle
} from 'lucide-react';

export function Reports() {
  const { showToast } = useNotification();
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const data = await api.reports.getDetailedReports();
      setReports(data);
    } catch (err) {
      showToast('Failed to load financial reports: ' + err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // CSV Generator Helper (Simulates download in browser)
  const downloadCSV = (data, filename, headers) => {
    if (!data || !data.length) {
      showToast('No data to export.', 'warning');
      return;
    }

    const csvRows = [];
    // Add headers
    csvRows.push(headers.join(','));

    // Add rows
    for (const row of data) {
      const values = headers.map(header => {
        const val = row[header];
        // Escape quotes
        const escaped = ('' + val).replace(/"/g, '\\"');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`${filename} CSV export initiated successfully!`, 'success');
  };

  const exportValuation = () => {
    const data = reports?.inventoryValuation || [];
    const headers = ['id', 'name', 'batchNumber', 'category', 'price', 'stockQuantity', 'value'];
    downloadCSV(data, 'Inventory_Valuation_Report', headers);
  };

  const exportFastSelling = () => {
    const data = reports?.fastSelling || [];
    const headers = ['medicineId', 'name', 'batchNumber', 'quantitySold', 'totalSales'];
    downloadCSV(data, 'Fast_Selling_Medicines', headers);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px' }}>
        <RefreshCw size={32} className="spin-animation" style={{ color: 'var(--primary)' }} />
        <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600' }}>Compiling financial statements...</span>
      </div>
    );
  }

  // Calculate Total Net Valuation
  const totalValuation = reports?.inventoryValuation.reduce((sum, item) => sum + item.value, 0) || 0;
  // Calculate total units stocked
  const totalStockUnits = reports?.inventoryValuation.reduce((sum, item) => sum + item.stockQuantity, 0) || 0;

  return (
    <div className="animate-fade-in" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Valuation Metrics Headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '20px'
      }}>
        {/* Net stock valuation */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)'
          }}>
            <DollarSign size={24} />
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700' }}>TOTAL INVENTORY ASSET VALUE</span>
            <h3 style={{ fontSize: '24px', fontWeight: '800', marginTop: '2px', color: 'var(--primary)' }}>
              ₹{totalValuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{totalStockUnits.toLocaleString()} stock units locked in shelf</span>
          </div>
        </div>

        {/* Categories contributing */}
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
            <Layers size={24} />
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700' }}>SALES BY CATEGORY COUNT</span>
            <h3 style={{ fontSize: '24px', fontWeight: '800', marginTop: '2px' }}>{reports?.salesByCategory.length} Active</h3>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sales mapped to distinct item categories</span>
          </div>
        </div>
      </div>

      {/* Main Grid split: valuation list and fast selling items */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.2fr 1fr',
        gap: '24px'
      }}>
        
        {/* Detailed Inventory Valuation Table */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Shelf Valuation Report</h3>
            <button
              onClick={exportValuation}
              className="glass-btn glass-btn-secondary"
              style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '8px' }}
            >
              <Download size={12} />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="glass-table-container" style={{ maxHeight: '360px', overflowY: 'auto' }}>
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Category</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Value (₹)</th>
                </tr>
              </thead>
              <tbody>
                {reports?.inventoryValuation.map(med => (
                  <tr key={med.id}>
                    <td style={{ fontWeight: '700' }}>{med.name}</td>
                    <td>{med.category}</td>
                    <td>{med.stockQuantity}</td>
                    <td>₹{med.price.toFixed(2)}</td>
                    <td style={{ fontWeight: '800', color: 'var(--text-primary)' }}>₹{med.value.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right side: Categories contribution and Fastest selling items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Categorical sales breakdown */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700' }}>Sales Revenue by Category</h3>
            
            <div className="glass-table-container" style={{ maxHeight: '180px', overflowY: 'auto' }}>
              <table className="glass-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th style={{ textAlign: 'right' }}>Revenue Generated</th>
                  </tr>
                </thead>
                <tbody>
                  {reports?.salesByCategory.length === 0 ? (
                    <tr>
                      <td colSpan="2" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '16px' }}>
                        No categorical sales logs.
                      </td>
                    </tr>
                  ) : (
                    reports?.salesByCategory.map((cat, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: '700' }}>{cat.name}</td>
                        <td style={{ textAlign: 'right', fontWeight: '800', color: '#10b981' }}>₹{cat.sales.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Fastest Selling Medicines list */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '700' }}>Fast Moving Items (Top 10)</h3>
              <button
                onClick={exportFastSelling}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                title="Download CSV"
              >
                <Download size={14} />
              </button>
            </div>

            <div className="glass-table-container" style={{ maxHeight: '200px', overflowY: 'auto' }}>
              <table className="glass-table" style={{ fontSize: '12px' }}>
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th>Qty Sold</th>
                    <th style={{ textAlign: 'right' }}>Total Sales</th>
                  </tr>
                </thead>
                <tbody>
                  {reports?.fastSelling.length === 0 ? (
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '16px' }}>
                        No retail sales logs.
                      </td>
                    </tr>
                  ) : (
                    reports?.fastSelling.map((med, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: '700' }}>{med.name}</td>
                        <td style={{ fontWeight: '600' }}>{med.quantitySold} units</td>
                        <td style={{ textAlign: 'right', fontWeight: '800' }}>₹{med.totalSales.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
export default Reports;
