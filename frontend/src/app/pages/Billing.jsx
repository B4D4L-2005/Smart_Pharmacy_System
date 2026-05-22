import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { useNotification } from '../context/NotificationContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  User, 
  Phone, 
  Mail,
  Plus, 
  Minus,
  Check,
  Send,
  Printer,
  X
} from 'lucide-react';

export function Billing({ onInvoiceProcessed }) {
  const { showToast, fetchAlerts } = useNotification();
  const { user, backupDatabaseLocally } = useAuth();
  const [medicines, setMedicines] = useState([]);
  const [search, setSearch] = useState('');
  
  // Customer details
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  // Cart state
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0); // Flat discount in ₹
  const [taxRate, setTaxRate] = useState(12); // Default GST 12%

  // Receipt Modal State
  const [invoiceResult, setInvoiceResult] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [emailToSend, setEmailToSend] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  // Fetch medicines catalog (only items that are in stock and not expired)
  const fetchInventory = async () => {
    try {
      const data = await api.medicines.list();
      // Filter out expired items and out of stock
      const now = new Date();
      const sellable = data.filter(med => 
        new Date(med.expiryDate) >= now && med.stockQuantity > 0
      );
      setMedicines(sellable);
    } catch (err) {
      showToast('Failed to load medicines: ' + err.message, 'danger');
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // Filter medicines list based on search bar
  const searchedMeds = search.trim() === '' 
    ? [] 
    : medicines.filter(med => 
        med.name.toLowerCase().includes(search.toLowerCase()) ||
        med.batchNumber.toLowerCase().includes(search.toLowerCase())
      );

  // Add Item to Cart
  const addToCart = (med) => {
    const existing = cart.find(item => item.medicineId === med.id);
    
    // Check if adding more exceeds stock
    const currentQty = existing ? existing.quantity : 0;
    if (currentQty + 1 > med.stockQuantity) {
      showToast(`Cannot add more. Only ${med.stockQuantity} units available.`, 'warning');
      return;
    }

    if (existing) {
      setCart(prev => prev.map(item => 
        item.medicineId === med.id 
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
          : item
      ));
    } else {
      setCart(prev => [...prev, {
        medicineId: med.id,
        name: med.name,
        batchNumber: med.batchNumber,
        category: med.category,
        price: med.price,
        quantity: 1,
        total: med.price,
        maxStock: med.stockQuantity
      }]);
    }
    setSearch(''); // clear search bar
    showToast(`${med.name} added to checkout cart.`, 'info');
  };

  // Adjust item quantity inside cart
  const updateQty = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.medicineId === id) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return item;
        if (newQty > item.maxStock) {
          showToast(`Only ${item.maxStock} units of this batch in stock.`, 'warning');
          return item;
        }
        return {
          ...item,
          quantity: newQty,
          total: newQty * item.price
        };
      }
      return item;
    }).filter(Boolean));
  };

  // Remove Item from Cart
  const removeFromCart = (id, name) => {
    setCart(prev => prev.filter(item => item.medicineId !== id));
    showToast(`${name} removed from cart.`, 'info');
  };

  // Calculate Invoice financials
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const taxableAmount = Math.max(subtotal - discount, 0);
  const gstAmount = taxableAmount * (taxRate / 100);
  const finalTotal = taxableAmount + gstAmount;

  // Process checkout request
  const handleCheckout = async () => {
    if (!cart.length) {
      showToast('Checkout cart is empty. Add medicines first.', 'warning');
      return;
    }

    try {
      const payload = {
        customerName: customerName.trim() || 'Walk-in Customer',
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim(),
        items: cart,
        subtotal,
        discount,
        tax: taxRate,
        finalTotal
      };

      const res = await api.billing.create(payload);
      setInvoiceResult(res);
      setEmailToSend(res.bill.customerEmail || '');
      setShowReceipt(true);
      
      // Clear Cart & inputs
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
      setDiscount(0);
      
      showToast('Checkout successful. Bill generated.', 'success');
      
      // Sync DB locally
      if (backupDatabaseLocally) {
        backupDatabaseLocally();
      }
      
      // Refresh inventory and sync global warnings
      fetchInventory();
      fetchAlerts();

      // Trigger callback if dashboard needs refresh
      if (onInvoiceProcessed) onInvoiceProcessed();
    } catch (err) {
      showToast(err.message || 'Billing failed. Check stock levels.', 'danger');
    }
  };

  const handleSendEmail = async () => {
    if (!emailToSend.trim()) {
      showToast('Please enter a valid email address.', 'warning');
      return;
    }
    try {
      setSendingEmail(true);
      const res = await api.billing.sendEmail(invoiceResult.bill.id, emailToSend.trim());
      showToast(res.message || 'Invoice email sent successfully.', 'success');
      
      // Update local invoiceResult state with the new email
      setInvoiceResult(prev => ({
        ...prev,
        bill: {
          ...prev.bill,
          customerEmail: emailToSend.trim()
        }
      }));

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
      
      <div className="billing-grid-container">
        
        {/* Left Side: POS Cart & Checkout info */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
            <ShoppingCart size={20} style={{ color: 'var(--primary)' }} />
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Active Billing Cart</h3>
          </div>

          {/* Cart Table */}
          <div style={{ minHeight: '220px', maxHeight: '340px', overflowY: 'auto' }}>
            {cart.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', color: 'var(--text-muted)', gap: '10px' }}>
                <ShoppingCart size={36} style={{ strokeWidth: 1.5 }} />
                <span style={{ fontSize: '13px', fontWeight: '600' }}>Billing cart is empty. Search items on the right.</span>
              </div>
            ) : (
              <div className="glass-table-container">
                <table className="glass-table">
                  <thead>
                    <tr>
                      <th>Medicine</th>
                      <th>Batch</th>
                      <th>Price</th>
                      <th>Qty</th>
                      <th>Total</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map(item => (
                      <tr key={item.medicineId}>
                        <td style={{ fontWeight: '700' }}>{item.name}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{item.batchNumber}</td>
                        <td>₹{item.price.toFixed(2)}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button 
                              onClick={() => updateQty(item.medicineId, -1)}
                              style={{ border: '1px solid var(--border-glass)', background: 'var(--bg-glass)', borderRadius: '4px', width: '22px', height: '22px', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Minus size={10} />
                            </button>
                            <span style={{ fontWeight: '700', minWidth: '16px', textAlign: 'center' }}>{item.quantity}</span>
                            <button 
                              onClick={() => updateQty(item.medicineId, 1)}
                              style={{ border: '1px solid var(--border-glass)', background: 'var(--bg-glass)', borderRadius: '4px', width: '22px', height: '22px', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Plus size={10} />
                            </button>
                          </div>
                        </td>
                        <td style={{ fontWeight: '700' }}>₹{item.total.toFixed(2)}</td>
                        <td>
                          <button 
                            onClick={() => removeFromCart(item.medicineId, item.name)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Customer details input */}
          <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '16px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: '700', marginBottom: '12px', color: 'var(--text-secondary)' }}>CUSTOMER DATA</h4>
            <div className="form-grid-2col">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)' }}>CUSTOMER NAME</label>
                <div style={{ position: 'relative' }}>
                  <User size={13} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Walk-in Customer"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="glass-input"
                    style={{ paddingLeft: '34px', height: '38px', paddingTop: 0, paddingBottom: 0 }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-muted)' }}>CUSTOMER EMAIL</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={13} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="email"
                    placeholder="customer@example.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="glass-input"
                    style={{ paddingLeft: '34px', height: '38px', paddingTop: 0, paddingBottom: 0 }}
                  />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Side: Medicine Lookup & Checkout Pricing */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Inventory search lookup card */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700' }}>Find Medicine</h3>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Type name / category to check stock..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="glass-input"
                style={{ paddingLeft: '36px', height: '40px', paddingTop: 0, paddingBottom: 0 }}
              />
            </div>

            {/* Searched Results list */}
            {search.trim() !== '' && (
              <div className="glass-panel" style={{
                maxHeight: '220px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                padding: '8px'
              }}>
                {searchedMeds.length === 0 ? (
                  <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                    No stock found or medicine batch has expired.
                  </div>
                ) : (
                  searchedMeds.map(med => (
                    <button
                      key={med.id}
                      onClick={() => addToCart(med)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        textAlign: 'left',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        color: 'var(--text-primary)',
                        transition: 'all var(--transition-fast)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-glass-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '700' }}>{med.name}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                          Batch: {med.batchNumber} | Expiry: {new Date(med.expiryDate).toLocaleDateString('en-IN')}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '13px', fontWeight: '800' }}>₹{med.price.toFixed(2)}</div>
                        <div style={{ fontSize: '10px', color: med.stockQuantity < 20 ? '#f59e0b' : 'var(--success)', fontWeight: '700' }}>
                          {med.stockQuantity} avail.
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Pricing Ledger summary Card */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
              Invoice Total Details
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Items Subtotal:</span>
                <span style={{ fontWeight: '700' }}>₹{subtotal.toFixed(2)}</span>
              </div>

              {/* Discount inputs */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Flat Discount (₹):</span>
                <input
                  type="number"
                  min="0"
                  max={subtotal}
                  value={discount}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className="glass-input"
                  style={{ width: '90px', padding: '6px 10px', textAlign: 'right', fontSize: '12px' }}
                />
              </div>

              {/* Tax settings */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>GST rate (%):</span>
                <select
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseInt(e.target.value))}
                  className="glass-input"
                  style={{ width: '90px', padding: '6px 10px', textAlign: 'right', fontSize: '12px', cursor: 'pointer' }}
                >
                  <option value="0">0% GST</option>
                  <option value="5">5% GST</option>
                  <option value="12">12% GST</option>
                  <option value="18">18% GST</option>
                  <option value="28">28% GST</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border-glass)', paddingTop: '10px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>GST/Tax Amount:</span>
                <span style={{ fontWeight: '700' }}>₹{gstAmount.toFixed(2)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-glass)', paddingTop: '10px', fontSize: '16px', fontWeight: '800' }}>
                <span>Final Payable:</span>
                <span style={{ color: 'var(--primary)' }}>₹{finalTotal.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className="glass-btn glass-btn-primary"
              style={{ width: '100%', marginTop: '10px', height: '46px' }}
            >
              <Check size={18} />
              <span>Process checkout</span>
            </button>
          </div>

        </div>

      </div>

      {/* Digital Invoice Preview Modal */}
      {showReceipt && invoiceResult && (
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
              <span style={{ fontSize: '15px', fontWeight: '800' }}>Digital Invoice Created</span>
              <button 
                onClick={() => setShowReceipt(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Visual Receipt design */}
            <div 
              id="printable-bill"
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
                <div><strong>Invoice:</strong> {invoiceResult.bill.invoiceNumber}</div>
                <div><strong>Date:</strong> {new Date(invoiceResult.bill.date).toLocaleString()}</div>
                <div><strong>Customer:</strong> {invoiceResult.bill.customerName}</div>
                {invoiceResult.bill.customerPhone && <div><strong>Phone:</strong> {invoiceResult.bill.customerPhone}</div>}
                {invoiceResult.bill.customerEmail && <div><strong>Email:</strong> {invoiceResult.bill.customerEmail}</div>}
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
                  {invoiceResult.bill.items.map((item, idx) => (
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
                <div>Subtotal: ₹{invoiceResult.bill.subtotal.toFixed(2)}</div>
                {invoiceResult.bill.discount > 0 && <div>Discount: -₹{invoiceResult.bill.discount.toFixed(2)}</div>}
                <div>GST ({invoiceResult.bill.tax}%): ₹{((invoiceResult.bill.subtotal - invoiceResult.bill.discount) * invoiceResult.bill.tax / 100).toFixed(2)}</div>
                <div style={{ fontSize: '12px', fontWeight: 'bold', marginTop: '4px', borderTop: '1px solid #1f2937', paddingTop: '4px' }}>
                  Total: ₹{invoiceResult.bill.finalTotal.toFixed(2)}
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
              {/* Print Receipt */}
              <button
                onClick={() => {
                  const printContents = document.getElementById('printable-bill').innerHTML;
                  const printWindow = window.open('', '_blank');
                  printWindow.document.write(`
                    <html>
                      <head>
                        <title>Receipt - ${invoiceResult.bill.invoiceNumber}</title>
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
                <span>Print Invoice Receipt</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
export default Billing;
