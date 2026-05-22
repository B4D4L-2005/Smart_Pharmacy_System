import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { useNotification } from '../context/NotificationContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { 
  Search, 
  Calendar, 
  Eye, 
  Printer, 
  X, 
  RefreshCw,
  AlertCircle,
  Mail,
  Send
} from 'lucide-react';

export function BillingHistory({ selectedInvoiceId, setSelectedInvoiceId }) {
  const { showToast } = useNotification();
  const { user, backupDatabaseLocally } = useAuth();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected Bill details for Modal popup view
  const [viewBill, setViewBill] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [emailToSend, setEmailToSend] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const data = await api.billing.list({
        search,
        startDate,
        endDate
      });
      setBills(data);
    } catch (err) {
      showToast('Error loading invoices: ' + err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, [search, startDate, endDate]);

  // Handle viewing specific invoice details
  const handleViewDetails = async (id) => {
    try {
      const data = await api.billing.get(id);
      setViewBill(data);
      setEmailToSend(data.customerEmail || '');
      setShowModal(true);
      // Reset selected ID in App parent so modal doesn't trigger repeatedly
      if (setSelectedInvoiceId) setSelectedInvoiceId(null);
    } catch (err) {
      showToast('Failed to retrieve invoice details: ' + err.message, 'danger');
    }
  };

  // If a selected ID was passed from Dashboard recent bills, trigger the details view immediately
  useEffect(() => {
    if (selectedInvoiceId) {
      handleViewDetails(selectedInvoiceId);
    }
  }, [selectedInvoiceId]);

  const handleSendEmail = async () => {
    if (!emailToSend.trim()) {
      showToast('Please enter a valid email address.', 'warning');
      return;
    }
    try {
      setSendingEmail(true);
      const res = await api.billing.sendEmail(viewBill.id, emailToSend.trim());
      showToast(res.message || 'Invoice email sent successfully.', 'success');
      
      // Update local viewBill state with the new email
      setViewBill(prev => ({
        ...prev,
        customerEmail: emailToSend.trim()
      }));

      // Update the invoice in the list of bills too, so it reflects in the table
      setBills(prev => prev.map(b => b.id === viewBill.id ? { ...b, customerEmail: emailToSend.trim() } : b));

      // Trigger local DB backup to sync any email updates
      if (backupDatabaseLocally) {
        backupDatabaseLocally();
      }
    } catch (err) {
      showToast(err.message || 'Failed to send invoice email.', 'danger');
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Search and Date Filter Bar */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
        
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by invoice number or customer name/phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="glass-input"
            style={{ paddingLeft: '42px' }}
          />
        </div>

        {/* Date Filters */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700' }}>FROM</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="glass-input"
              style={{ width: '130px', padding: '8px 10px', fontSize: '12px' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700' }}>TO</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="glass-input"
              style={{ width: '130px', padding: '8px 10px', fontSize: '12px' }}
            />
          </div>
        </div>

      </div>

      {/* Main Table */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '16px' }}>
            <RefreshCw size={24} className="spin-animation" style={{ color: 'var(--primary)' }} />
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Retrieving billing records...</span>
          </div>
        ) : bills.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <AlertCircle size={32} />
            <span style={{ fontSize: '15px', fontWeight: '600' }}>No invoice logs found matching criteria.</span>
          </div>
        ) : (
          <div className="glass-table-container">
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Invoice Number</th>
                  <th>Customer Name</th>
                  <th>Contact Phone</th>
                  <th>Sales Date</th>
                  <th>Items Purchased</th>
                  <th>Grand Total (₹)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bills.map(bill => (
                  <tr key={bill.id}>
                    <td style={{ fontWeight: '700', fontFamily: 'monospace' }}>{bill.invoiceNumber}</td>
                    <td style={{ fontWeight: '600' }}>{bill.customerName}</td>
                    <td style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{bill.customerPhone || '-'}</td>
                    <td>{new Date(bill.date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                    <td style={{ fontWeight: '700' }}>{bill.items.reduce((sum, i)=> sum + i.quantity, 0)} units ({bill.items.length} meds)</td>
                    <td style={{ fontWeight: '800', color: 'var(--primary)' }}>₹{bill.finalTotal.toFixed(2)}</td>
                    <td>
                      <button
                        onClick={() => handleViewDetails(bill.id)}
                        style={{
                          background: 'var(--bg-glass)',
                          border: '1px solid var(--border-glass)',
                          borderRadius: '8px',
                          color: 'var(--text-primary)',
                          padding: '6px 12px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}
                      >
                        <Eye size={12} />
                        <span>Open Bill</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bill details view Modal */}
      {showModal && viewBill && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(8px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div 
            className="glass-panel animate-slide-up"
            style={{
              width: '100%',
              maxWidth: '460px',
              padding: '24px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              background: 'var(--bg-glass)'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '8px' }}>
              <span style={{ fontSize: '15px', fontWeight: '800' }}>Invoice Archive Details</span>
              <button 
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Receipt details */}
            <div 
              id="reprint-bill"
              style={{
                background: '#ffffff',
                color: '#1f2937',
                padding: '24px',
                borderRadius: '8px',
                fontFamily: 'monospace',
                fontSize: '11px',
                lineHeight: '1.4',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>{(user?.shopDetails?.name || 'CARE & CURE PHARMACY').toUpperCase()}</h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '9px' }}>{user?.shopDetails?.address || '12, MG Road, Bengaluru'}</p>
                <p style={{ margin: '2px 0 0 0', fontSize: '9px' }}>Tel: {user?.shopDetails?.phone || '+91 98765 43210'}</p>
                <p style={{ margin: '2px 0 0 0', fontSize: '9px' }}>GSTIN: {user?.shopDetails?.gstin || '29AAAAA1111A1Z1'}</p>
              </div>

              <div style={{ borderBottom: '1px dashed #1f2937', paddingBottom: '8px', marginBottom: '8px' }}>
                <div><strong>Invoice:</strong> {viewBill.invoiceNumber}</div>
                <div><strong>Date:</strong> {new Date(viewBill.date).toLocaleString()}</div>
                <div><strong>Customer:</strong> {viewBill.customerName}</div>
                {viewBill.customerPhone && <div><strong>Phone:</strong> {viewBill.customerPhone}</div>}
                {viewBill.customerEmail && <div><strong>Email:</strong> {viewBill.customerEmail}</div>}
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px', fontSize: '10px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1f2937' }}>
                    <th style={{ textAlign: 'left', paddingBottom: '4px' }}>Item</th>
                    <th style={{ textAlign: 'right', paddingBottom: '4px' }}>Qty</th>
                    <th style={{ textAlign: 'right', paddingBottom: '4px' }}>Price</th>
                    <th style={{ textAlign: 'right', paddingBottom: '4px' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {viewBill.items.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ paddingTop: '4px' }}>{item.name}</td>
                      <td style={{ textAlign: 'right', paddingTop: '4px' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right', paddingTop: '4px' }}>₹{item.price.toFixed(2)}</td>
                      <td style={{ textAlign: 'right', paddingTop: '4px' }}>₹{item.total.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ borderTop: '1px dashed #1f2937', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end', fontSize: '10px' }}>
                <div>Subtotal: ₹{viewBill.subtotal.toFixed(2)}</div>
                {viewBill.discount > 0 && <div>Discount: -₹{viewBill.discount.toFixed(2)}</div>}
                <div>GST ({viewBill.tax}%): ₹{((viewBill.subtotal - viewBill.discount) * viewBill.tax / 100).toFixed(2)}</div>
                <div style={{ fontSize: '12px', fontWeight: 'bold', marginTop: '4px', borderTop: '1px solid #1f2937', paddingTop: '4px' }}>
                  Total: ₹{viewBill.finalTotal.toFixed(2)}
                </div>
              </div>

              <div style={{ textAlign: 'center', marginTop: '16px', borderTop: '1px dashed #1f2937', paddingTop: '8px', fontSize: '8px' }}>
                Thank you! Stay healthy.<br />System Generated Receipt
              </div>
            </div>

            {/* Send Email Section */}
            <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)' }}>SEND BILL TO CUSTOMER EMAIL</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Mail size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="email"
                    placeholder="customer@example.com"
                    value={emailToSend}
                    onChange={(e) => setEmailToSend(e.target.value)}
                    className="glass-input"
                    style={{ paddingLeft: '30px', height: '36px', fontSize: '12px', width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
                <button
                  onClick={handleSendEmail}
                  disabled={sendingEmail}
                  className="glass-btn glass-btn-primary"
                  style={{ height: '36px', padding: '0 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Send size={12} />
                  <span>{sendingEmail ? 'Sending...' : 'Send'}</span>
                </button>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button
                onClick={() => {
                  const printContents = document.getElementById('reprint-bill').innerHTML;
                  const printWindow = window.open('', '_blank');
                  printWindow.document.write(`
                    <html>
                      <head>
                        <title>Receipt - ${viewBill.invoiceNumber}</title>
                        <style>
                          body { margin: 20px; font-family: monospace; }
                          table { width: 100%; border-collapse: collapse; }
                          th, td { padding: 4px; }
                        </style>
                      </head>
                      <body>
                        ${printContents}
                        <script>
                          window.onload = function() { window.print(); window.close(); }
                        </script>
                      </body>
                    </html>
                  `);
                  printWindow.document.close();
                }}
                className="glass-btn glass-btn-primary"
                style={{ width: '100%', fontSize: '13px' }}
              >
                <Printer size={14} />
                <span>Reprint Receipt</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
export default BillingHistory;
