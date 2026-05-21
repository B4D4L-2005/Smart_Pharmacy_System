import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { useNotification } from '../context/NotificationContext.jsx';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  ArrowUpDown,
  AlertCircle
} from 'lucide-react';

export function Medicines() {
  const { showToast, fetchAlerts } = useNotification();
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [status, setStatus] = useState('All');
  const [sortBy, setSortBy] = useState('name');
  const [order, setOrder] = useState('asc');

  // Modal form states
  const [showModal, setShowModal] = useState(false);
  const [editingMed, setEditingMed] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Tablet',
    brand: '',
    price: '',
    stockQuantity: '',
    manufactureDate: '',
    expiryDate: '',
    batchNumber: '',
    lowStockThreshold: 20
  });

  const categories = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream', 'Drops', 'Other'];
  const statuses = [
    { label: 'All Stock Statuses', value: 'All' },
    { label: 'In Stock Only', value: 'In Stock' },
    { label: 'Low Stock Warnings', value: 'Low Stock' },
    { label: 'Out of Stock Items', value: 'Out of Stock' },
    { label: 'Expired Medicines', value: 'Expired' }
  ];

  const fetchMedicines = async () => {
    try {
      setLoading(true);
      const data = await api.medicines.list({
        search,
        category,
        status,
        sortBy,
        order
      });
      setMedicines(data);
    } catch (err) {
      showToast('Error loading medicines: ' + err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, [search, category, status, sortBy, order]);

  // Handle Form Change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Open Modal for Add
  const handleOpenAdd = () => {
    setEditingMed(null);
    setFormData({
      name: '',
      category: 'Tablet',
      brand: '',
      price: '',
      stockQuantity: '',
      manufactureDate: '',
      expiryDate: '',
      batchNumber: '',
      lowStockThreshold: 20
    });
    setShowModal(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (med) => {
    setEditingMed(med);
    setFormData({
      name: med.name,
      category: med.category,
      brand: med.brand,
      price: med.price,
      stockQuantity: med.stockQuantity,
      manufactureDate: med.manufactureDate || '',
      expiryDate: med.expiryDate,
      batchNumber: med.batchNumber,
      lowStockThreshold: med.lowStockThreshold || 20
    });
    setShowModal(true);
  };

  // Submit Add/Edit Form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.price || formData.stockQuantity === '' || !formData.expiryDate || !formData.batchNumber) {
      showToast('Please fill in all required fields.', 'warning');
      return;
    }

    try {
      if (editingMed) {
        await api.medicines.update(editingMed.id, formData);
        showToast('Medicine details updated successfully.', 'success');
      } else {
        await api.medicines.create(formData);
        showToast('New medicine registered in stock.', 'success');
      }
      setShowModal(false);
      fetchMedicines();
      fetchAlerts(); // Sync notifications count
    } catch (err) {
      showToast(err.message || 'Error processing medicine details.', 'danger');
    }
  };

  // Handle Delete Medicine
  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete ${name} from stock?`)) {
      try {
        await api.medicines.delete(id);
        showToast('Medicine deleted from database.', 'success');
        fetchMedicines();
        fetchAlerts();
      } catch (err) {
        showToast('Delete failed: ' + err.message, 'danger');
      }
    }
  };

  // Handle Column Header Sort Click
  const handleSort = (field) => {
    if (sortBy === field) {
      setOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setOrder('asc');
    }
  };

  return (
    <div className="animate-fade-in" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Search and Action Bar */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
        
        {/* Search Input */}
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search by name, brand, or batch..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="glass-input"
            style={{ paddingLeft: '42px' }}
          />
        </div>

        {/* Filters Selects */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          
          {/* Category Dropdown */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="glass-input"
            style={{ width: '130px', padding: '10px 12px', cursor: 'pointer' }}
          >
            <option value="All">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Status Dropdown */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="glass-input"
            style={{ width: '170px', padding: '10px 12px', cursor: 'pointer' }}
          >
            {statuses.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>

          {/* Add New Button */}
          <button
            onClick={handleOpenAdd}
            className="glass-btn glass-btn-primary"
            style={{ padding: '10px 20px' }}
          >
            <Plus size={16} />
            <span>Add Medicine</span>
          </button>
        </div>
      </div>

      {/* Table Panel */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '16px' }}>
            <RefreshCw size={24} className="spin-animation" style={{ color: 'var(--primary)' }} />
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Loading medicine catalog...</span>
          </div>
        ) : medicines.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <AlertCircle size={32} />
            <span style={{ fontSize: '15px', fontWeight: '600' }}>No medicines found matching criteria.</span>
          </div>
        ) : (
          <div className="glass-table-container">
            <table className="glass-table">
              <thead>
                <tr>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('name')}>
                    Medicine Name <ArrowUpDown size={10} style={{ marginLeft: '4px' }} />
                  </th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('category')}>
                    Category <ArrowUpDown size={10} style={{ marginLeft: '4px' }} />
                  </th>
                  <th>Brand</th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('batchNumber')}>
                    Batch <ArrowUpDown size={10} style={{ marginLeft: '4px' }} />
                  </th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('price')}>
                    Price (₹) <ArrowUpDown size={10} style={{ marginLeft: '4px' }} />
                  </th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('stockQuantity')}>
                    Stock <ArrowUpDown size={10} style={{ marginLeft: '4px' }} />
                  </th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('expiryDate')}>
                    Expiry Date <ArrowUpDown size={10} style={{ marginLeft: '4px' }} />
                  </th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {medicines.map(med => {
                  let statusBadgeClass = 'badge-success';
                  
                  if (med.availabilityStatus === 'Expired') statusBadgeClass = 'badge-danger';
                  else if (med.availabilityStatus === 'Out of Stock') statusBadgeClass = 'badge-danger';
                  else if (med.availabilityStatus === 'Low Stock') statusBadgeClass = 'badge-warning';

                  return (
                    <tr key={med.id}>
                      <td style={{ fontWeight: '700' }}>{med.name}</td>
                      <td>{med.category}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{med.brand || '-'}</td>
                      <td style={{ fontFamily: 'monospace', fontWeight: '600' }}>{med.batchNumber}</td>
                      <td style={{ fontWeight: '700' }}>₹{med.price.toFixed(2)}</td>
                      <td style={{ fontWeight: '700' }}>{med.stockQuantity}</td>
                      <td style={{ fontWeight: '600' }}>{new Date(med.expiryDate).toLocaleDateString('en-IN')}</td>
                      <td>
                        <span className={`badge ${statusBadgeClass}`}>{med.availabilityStatus}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleOpenEdit(med)}
                            style={{
                              background: 'rgba(255,255,255,0.03)',
                              border: '1px solid var(--border-glass)',
                              padding: '6px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              color: 'var(--text-primary)'
                            }}
                          >
                            <Edit size={12} />
                          </button>
                          <button
                            onClick={() => handleDelete(med.id, med.name)}
                            style={{
                              background: 'rgba(239, 68, 68, 0.05)',
                              border: '1px solid rgba(239, 68, 68, 0.15)',
                              padding: '6px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              color: '#ef4444'
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Glass Overlay Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
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
              maxWidth: '600px',
              padding: '30px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: '700', borderBottom: '1px solid var(--border-glass)', paddingBottom: '8px' }}>
              {editingMed ? 'Edit Medicine Batch Details' : 'Register New Medicine Batch'}
            </h3>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                
                {/* Name */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>MEDICINE NAME *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="glass-input"
                    placeholder="e.g. Paracetamol 650mg"
                    required
                  />
                </div>

                {/* Brand */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>BRAND MANUFACTURER</label>
                  <input
                    type="text"
                    name="brand"
                    value={formData.brand}
                    onChange={handleChange}
                    className="glass-input"
                    placeholder="e.g. Micro Labs"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {/* Category */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>CATEGORY *</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="glass-input"
                    style={{ cursor: 'pointer' }}
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Batch Number */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>BATCH NUMBER *</label>
                  <input
                    type="text"
                    name="batchNumber"
                    value={formData.batchNumber}
                    onChange={handleChange}
                    className="glass-input"
                    placeholder="e.g. BAT-9014"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                {/* Price */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>PRICE PER UNIT (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    className="glass-input"
                    placeholder="e.g. 45.50"
                    required
                  />
                </div>

                {/* Stock Quantity */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>STOCK QUANTITY *</label>
                  <input
                    type="number"
                    name="stockQuantity"
                    value={formData.stockQuantity}
                    onChange={handleChange}
                    className="glass-input"
                    placeholder="e.g. 150"
                    required
                  />
                </div>

                {/* Low Stock Threshold */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>LOW THRESHOLD *</label>
                  <input
                    type="number"
                    name="lowStockThreshold"
                    value={formData.lowStockThreshold}
                    onChange={handleChange}
                    className="glass-input"
                    placeholder="e.g. 20"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {/* Manufacture Date */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>MANUFACTURE DATE</label>
                  <input
                    type="date"
                    name="manufactureDate"
                    value={formData.manufactureDate}
                    onChange={handleChange}
                    className="glass-input"
                  />
                </div>

                {/* Expiry Date */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>EXPIRY DATE *</label>
                  <input
                    type="date"
                    name="expiryDate"
                    value={formData.expiryDate}
                    onChange={handleChange}
                    className="glass-input"
                    required
                  />
                </div>
              </div>

              {/* Form Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="glass-btn glass-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="glass-btn glass-btn-primary"
                >
                  {editingMed ? 'Save Details' : 'Register Batch'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
export default Medicines;
