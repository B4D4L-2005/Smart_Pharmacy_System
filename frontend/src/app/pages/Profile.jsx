import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotification } from '../context/NotificationContext.jsx';
import { api } from '../lib/api.js';
import { 
  Store, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Percent, 
  Save, 
  ShieldCheck,
  Building,
  Download,
  Upload,
  Database
} from 'lucide-react';

export function Profile() {
  const { user, updateProfile } = useAuth();
  const { showToast } = useNotification();
  const [loading, setLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);

  // States
  const [username, setUsername] = useState(user?.username || '');
  const [shopName, setShopName] = useState(user?.shopDetails?.name || '');
  const [shopPhone, setShopPhone] = useState(user?.shopDetails?.phone || '');
  const [shopAddress, setShopAddress] = useState(user?.shopDetails?.address || '');
  const [gstin, setGstin] = useState(user?.shopDetails?.gstin || '');

  const handleSave = async (e) => {
    e.preventDefault();
    if (!username || !shopName) {
      showToast('Account name and Pharmacy name are required.', 'warning');
      return;
    }

    setLoading(true);
    try {
      await updateProfile({
        username,
        shopDetails: {
          name: shopName,
          phone: shopPhone,
          address: shopAddress,
          gstin
        }
      });
      showToast('Store profile configuration saved.', 'success');
    } catch (err) {
      showToast('Failed to save configurations: ' + err.message, 'danger');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadBackup = async () => {
    setBackupLoading(true);
    try {
      const dump = await api.db.export();
      const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      link.download = `rxsmart_backup_${shopName.replace(/\s+/g, '_')}_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showToast('Database backup downloaded successfully.', 'success');
    } catch (err) {
      showToast('Failed to download backup: ' + err.message, 'danger');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestoreBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      setRestoreLoading(true);
      try {
        const dump = JSON.parse(event.target.result);
        if (!dump || typeof dump !== 'object') {
          throw new Error('Invalid JSON structure. The backup file is corrupted.');
        }
        
        await api.db.import(dump);
        showToast('Database restored successfully from file.', 'success');
        
        // Update browser local backup for recovery resilience
        if (user?.email) {
          localStorage.setItem(`rxsmart_db_backup_${user.email.toLowerCase()}`, JSON.stringify(dump));
        }
        
        // Reload page to re-render system with new datasets
        window.location.reload();
      } catch (err) {
        showToast('Failed to restore backup: ' + err.message, 'danger');
      } finally {
        setRestoreLoading(false);
        e.target.value = null;
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="animate-fade-in" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px' }}>
      
      {/* Overview Intro Card */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 14px var(--primary-glow)'
        }}>
          <Building size={28} />
        </div>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '800' }}>Store Profile Settings</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Configure pharmacy billing details, GST parameters, and store contact info.</p>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Section: Account Manager Details */}
        <div>
          <h3 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--primary)', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px', marginBottom: '14px' }}>
            ACCOUNT MANAGER DETAILS
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Username */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>MANAGER FULL NAME *</label>
              <div style={{ position: 'relative' }}>
                <User size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="glass-input"
                  style={{ paddingLeft: '36px', height: '40px', paddingTop: 0, paddingBottom: 0 }}
                  required
                />
              </div>
            </div>

            {/* Email (Readonly) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>REGISTERED EMAIL (READ-ONLY)</label>
              <div style={{ position: 'relative' }}>
                <Mail size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  value={user?.email || ''}
                  className="glass-input"
                  style={{ paddingLeft: '36px', height: '40px', paddingTop: 0, paddingBottom: 0, opacity: 0.6, cursor: 'not-allowed' }}
                  disabled
                  readOnly
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section: Shop Details */}
        <div>
          <h3 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--primary)', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px', marginBottom: '14px' }}>
            PHARMACY STORE DETAILS
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Shop Name */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>PHARMACY SHOP NAME *</label>
              <div style={{ position: 'relative' }}>
                <Store size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="glass-input"
                  style={{ paddingLeft: '36px', height: '40px', paddingTop: 0, paddingBottom: 0 }}
                  required
                />
              </div>
            </div>

            {/* Shop Phone */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>STORE TELEPHONE / CONTACT</label>
              <div style={{ position: 'relative' }}>
                <Phone size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="tel"
                  value={shopPhone}
                  onChange={(e) => setShopPhone(e.target.value)}
                  className="glass-input"
                  style={{ paddingLeft: '36px', height: '40px', paddingTop: 0, paddingBottom: 0 }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '14px' }}>
            {/* Shop Address */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>STORE PHYSICAL ADDRESS</label>
              <div style={{ position: 'relative' }}>
                <MapPin size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  value={shopAddress}
                  onChange={(e) => setShopAddress(e.target.value)}
                  className="glass-input"
                  style={{ paddingLeft: '36px', height: '40px', paddingTop: 0, paddingBottom: 0 }}
                />
              </div>
            </div>

            {/* GSTIN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>STORE GSTIN (FOR TAX INVOICES)</label>
              <div style={{ position: 'relative' }}>
                <Percent size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  className="glass-input"
                  style={{ paddingLeft: '36px', height: '40px', paddingTop: 0, paddingBottom: 0 }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Info callout on saving changes */}
        <div style={{
          display: 'flex',
          gap: '10px',
          padding: '12px 16px',
          borderRadius: '10px',
          background: 'rgba(16, 185, 129, 0.04)',
          border: '1px solid rgba(16, 185, 129, 0.15)',
          color: 'var(--text-secondary)',
          fontSize: '12px',
          alignItems: 'center'
        }}>
          <ShieldCheck size={18} style={{ color: '#10b981', flexShrink: 0 }} />
          <span>GSTIN and Pharmacy details modified here will update automatically on all newly generated digital checkout bills.</span>
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
          <button
            type="submit"
            disabled={loading}
            className="glass-btn glass-btn-primary"
            style={{ width: '180px' }}
          >
            <Save size={16} />
            <span>{loading ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>

      </form>

      {/* Manual Database Backup & Restore */}
      <div className="glass-panel animate-slide-up" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--primary)', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
          PHARMACY DATABASE BACKUP & RESTORE
        </h3>
        
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Keep your store data safe. Download a complete snapshot of your pharmacy database (medicines list, billing records, customers data, notifications history) to your local device, or upload an existing backup file to recover data.
        </p>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '4px' }}>
          {/* Download Button */}
          <button
            type="button"
            onClick={handleDownloadBackup}
            disabled={backupLoading || restoreLoading}
            className="glass-btn glass-btn-primary"
            style={{ width: '200px' }}
          >
            <Download size={16} />
            <span>{backupLoading ? 'Creating Snapshot...' : 'Download Backup'}</span>
          </button>

          {/* Restore Button */}
          <div style={{ position: 'relative' }}>
            <input
              type="file"
              accept=".json"
              id="upload-backup-file"
              onChange={handleRestoreBackup}
              style={{ display: 'none' }}
              disabled={backupLoading || restoreLoading}
            />
            <label
              htmlFor="upload-backup-file"
              className="glass-btn glass-btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                width: '200px',
                height: '42px',
                justifyContent: 'center',
                cursor: backupLoading || restoreLoading ? 'not-allowed' : 'pointer',
                opacity: backupLoading || restoreLoading ? 0.6 : 1
              }}
            >
              <Upload size={16} />
              <span>{restoreLoading ? 'Restoring Snapshot...' : 'Upload & Restore'}</span>
            </label>
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: '10px',
          padding: '12px 16px',
          borderRadius: '10px',
          background: 'rgba(245, 158, 11, 0.04)',
          border: '1px solid rgba(245, 158, 11, 0.15)',
          color: 'var(--text-secondary)',
          fontSize: '12px',
          alignItems: 'center',
          marginTop: '4px'
        }}>
          <Database size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />
          <span>Restoring from a file overrides the current database state. The application will reload automatically upon successful restore.</span>
        </div>
      </div>

    </div>
  );
}
export default Profile;
