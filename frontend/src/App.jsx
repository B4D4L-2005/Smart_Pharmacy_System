import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './app/context/AuthContext.jsx';
import { ThemeProvider } from './app/context/ThemeContext.jsx';
import { NotificationProvider } from './app/context/NotificationContext.jsx';

// Components
import Sidebar from './app/components/Sidebar.jsx';
import Navbar from './app/components/Navbar.jsx';

// Pages
import Landing from './app/pages/Landing.jsx';
import Login from './app/pages/Login.jsx';
import Signup from './app/pages/Signup.jsx';
import Dashboard from './app/pages/Dashboard.jsx';
import Medicines from './app/pages/Medicines.jsx';
import ExpiredMedicines from './app/pages/ExpiredMedicines.jsx';
import Billing from './app/pages/Billing.jsx';
import BillingHistory from './app/pages/BillingHistory.jsx';
import Notifications from './app/pages/Notifications.jsx';
import Reports from './app/pages/Reports.jsx';
import Profile from './app/pages/Profile.jsx';

import { RefreshCw } from 'lucide-react';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('landing');
  const [viewInvoiceId, setViewInvoiceId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Sync navigation states when user logs in or out
  useEffect(() => {
    if (!loading) {
      if (user) {
        // If logged in, send them to dashboard unless they are on a dashboard-protected page already
        const protectedPages = ['dashboard', 'medicines', 'expired', 'billing', 'history', 'reports', 'notifications', 'profile'];
        if (!protectedPages.includes(currentPage)) {
          setCurrentPage('dashboard');
        }
      } else {
        // If logged out, reset to landing
        const publicPages = ['landing', 'login', 'signup'];
        if (!publicPages.includes(currentPage)) {
          setCurrentPage('landing');
        }
      }
    }
  }, [user, loading]);

  // Navigate to invoice helper
  const handleViewInvoiceInHistory = (invoiceId) => {
    setViewInvoiceId(invoiceId);
    setCurrentPage('history');
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        gap: '16px'
      }}>
        <RefreshCw size={40} className="spin-animation" style={{ color: 'var(--primary)' }} />
        <span style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: '600' }}>
          Configuring secure environment...
        </span>
        <style>{`
          .spin-animation {
            animation: rotate 1s linear infinite;
          }
          @keyframes rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // 1. PUBLIC ROUTING LAYOUT
  if (!user) {
    switch (currentPage) {
      case 'login':
        return <Login onNavigate={setCurrentPage} />;
      case 'signup':
        return <Signup onNavigate={setCurrentPage} />;
      case 'landing':
      default:
        return <Landing onNavigate={setCurrentPage} />;
    }
  }

  // 2. AUTHENTICATED PANEL LAYOUT
  const renderActivePage = () => {
    switch (currentPage) {
      case 'medicines':
        return <Medicines />;
      case 'expired':
        return <ExpiredMedicines />;
      case 'billing':
        return <Billing onInvoiceProcessed={() => {}} />;
      case 'history':
        return <BillingHistory selectedInvoiceId={viewInvoiceId} setSelectedInvoiceId={setViewInvoiceId} />;
      case 'reports':
        return <Reports />;
      case 'notifications':
        return <Notifications />;
      case 'profile':
        return <Profile />;
      case 'dashboard':
      default:
        return <Dashboard onNavigate={setCurrentPage} setViewInvoiceId={handleViewInvoiceInHistory} />;
    }
  };

  const getPageTitle = () => {
    switch (currentPage) {
      case 'medicines': return 'Medicines Catalog';
      case 'expired': return 'Expired & Near-Expiry tracker';
      case 'billing': return 'Point of Sale (POS) Billing';
      case 'history': return 'Invoice Archives Logs';
      case 'reports': return 'Financial Sales Reports';
      case 'notifications': return 'System Warnings Log';
      case 'profile': return 'Shop Profile Settings';
      case 'dashboard':
      default:
        return 'Pharmacy Operations Dashboard';
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-gradient)' }}>
      {/* Decorative Glows */}
      <div className="glow-sphere glow-sphere-1" />
      <div className="glow-sphere glow-sphere-2" />

      {/* Sidebar Navigation */}
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      {/* Main Workspace Frame */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        
        {/* Top Navbar */}
        <Navbar title={getPageTitle()} onNavigate={setCurrentPage} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        {/* Dynamic Inner Page Screen */}
        <main style={{ flex: 1, overflowY: 'auto' }}>
          {renderActivePage()}
        </main>

      </div>
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <InnerNotificationWrapper />
      </AuthProvider>
    </ThemeProvider>
  );
}

// Sub-wrapper needed to extract user state from AuthContext and inject into Notification Provider
function InnerNotificationWrapper() {
  const { user } = useAuth();
  return (
    <NotificationProvider isAuthenticated={!!user}>
      <AppContent />
    </NotificationProvider>
  );
}

export default App;
