import React from 'react';
import { Pill, Shield, Zap, ArrowRight, Activity, Plus } from 'lucide-react';

export function Landing({ onNavigate }) {
  const features = [
    {
      title: 'Fast POS Checkout',
      desc: 'Ring up sales in seconds, calculate taxes and discounts, and print or share digital invoices.',
      icon: Zap,
      color: 'var(--primary)'
    },
    {
      title: 'Expiry Date Alerts',
      desc: 'Automated checks monitor batch dates and warn you of expiring items before checkout.',
      icon: Activity,
      color: 'var(--secondary)'
    },
    {
      title: 'Stock Level Warnings',
      desc: 'Get notified instantly when stock falls below reorder limits so you never run out.',
      icon: Shield,
      color: 'var(--accent)'
    }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative Glows */}
      <div className="glow-sphere glow-sphere-1" />
      <div className="glow-sphere glow-sphere-2" />

      {/* Header Navbar */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '24px 60px',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff'
          }}>
            <Plus size={24} strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: '20px', fontWeight: '800', fontFamily: 'var(--font-heading)' }}>RxSmart</span>
        </div>
        
        <div style={{ display: 'flex', gap: '16px' }}>
          <button 
            onClick={() => onNavigate('login')}
            className="glass-btn glass-btn-secondary"
            style={{ padding: '8px 20px', borderRadius: '10px' }}
          >
            Login
          </button>
          <button 
            onClick={() => onNavigate('signup')}
            className="glass-btn glass-btn-primary"
            style={{ padding: '8px 20px', borderRadius: '10px' }}
          >
            Register Store
          </button>
        </div>
      </header>

      {/* Hero Body */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '40px 20px 80px 20px',
        zIndex: 10
      }}>
        <div 
          className="badge badge-info"
          style={{
            marginBottom: '20px',
            padding: '6px 14px',
            fontSize: '12px',
            borderRadius: '99px',
            background: 'rgba(99, 102, 241, 0.1)',
            borderColor: 'rgba(99, 102, 241, 0.3)',
            color: 'var(--primary)'
          }}
        >
          RxSmart Retail Console
        </div>

        <h1 
          className="animate-slide-up"
          style={{
            fontSize: '56px',
            fontWeight: '800',
            lineHeight: 1.1,
            maxWidth: '900px',
            marginBottom: '24px',
            background: 'linear-gradient(135deg, var(--text-primary) 30%, var(--primary) 70%, var(--secondary) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.03em'
          }}
        >
          Modern Pharmacy Billing<br />& Inventory Management
        </h1>

        <p 
          className="animate-fade-in"
          style={{
            fontSize: '18px',
            color: 'var(--text-secondary)',
            maxWidth: '650px',
            marginBottom: '40px',
            lineHeight: '1.6'
          }}
        >
          Process customer orders quickly, keep track of medicine stocks, manage expiry alerts, and share invoices instantly over WhatsApp or SMS.
        </p>

        <div 
          className="animate-slide-up"
          style={{ display: 'flex', gap: '20px' }}
        >
          <button 
            onClick={() => onNavigate('login')}
            className="glass-btn glass-btn-primary"
            style={{ padding: '14px 32px', fontSize: '16px' }}
          >
            <span>Access Store Dashboard</span>
            <ArrowRight size={18} />
          </button>
          <button 
            onClick={() => onNavigate('signup')}
            className="glass-btn glass-btn-secondary"
            style={{ padding: '14px 32px', fontSize: '16px' }}
          >
            <span>Register Profile</span>
          </button>
        </div>

        {/* Feature Highlights section */}
        <section style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
          width: '100%',
          maxWidth: '1100px',
          marginTop: '80px',
          padding: '0 20px'
        }}>
          {features.map((feat, index) => {
            const Icon = feat.icon;
            return (
              <div 
                key={index}
                className="glass-panel glass-panel-hover"
                style={{
                  padding: '32px',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  boxSizing: 'border-box'
                }}
              >
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: `rgba(255, 255, 255, 0.03)`,
                  border: `1px solid var(--border-glass)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: feat.color
                }}>
                  <Icon size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>{feat.title}</h3>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{feat.desc}</p>
                </div>
              </div>
            );
          })}
        </section>
      </main>

      {/* Footer */}
      <footer style={{
        padding: '30px 60px',
        borderTop: '1px solid var(--border-glass)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10,
        fontSize: '13px',
        color: 'var(--text-muted)'
      }}>
        <span>© 2026 RxSmart Systems. All rights reserved.</span>
        <span>Secure offline-first local file architecture.</span>
      </footer>
    </div>
  );
}
export default Landing;
