// Shared UI primitives for CouchPotatoPlayer designs
const { useState } = React;

// Poster component with gradient bg + title
const Poster = ({ genre = 'drama', title, year, rating, ratio = '2/3', style = {}, children, className = '' }) => (
  <div className={`poster g-${genre} ${className}`} style={{ aspectRatio: ratio, borderRadius: 'var(--radius-md)', width: '100%', ...style }}>
    {title && (
      <div style={{ width: '100%', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontWeight: 800, fontSize: 13, lineHeight: 1.15, color: '#fff', textShadow: '0 2px 10px rgba(0,0,0,0.75)' }}>{title}</div>
        {(year || rating) && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.78)' }}>
            {year && <span>{year}</span>}
            {rating && <span>★ {rating}</span>}
          </div>
        )}
      </div>
    )}
    {children}
  </div>
);

// Wide/landscape backdrop
const Backdrop = ({ genre = 'drama', title, subtitle, children, style = {}, className = '' }) => (
  <div className={`poster g-${genre} ${className}`} style={{ width: '100%', borderRadius: 'var(--radius-lg)', ...style }}>
    {children}
    {title && (
      <div style={{ position: 'absolute', left: 20, right: 20, bottom: 16, zIndex: 3 }}>
        <div style={{ fontWeight: 800, fontSize: 18, color: '#fff', textShadow: '0 2px 14px rgba(0,0,0,0.8)' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.72)', marginTop: 4 }}>{subtitle}</div>}
      </div>
    )}
  </div>
);

// Channel logo tile
const Logo = ({ letter, bg = '#1f1f2a', size = 36, radius = 8 }) => (
  <div className="logo-tile" style={{ '--logo-bg': bg, background: bg, width: size, height: size, borderRadius: radius, fontSize: size * 0.42 }}>
    {letter}
  </div>
);

// Brand mark — the real CouchPotato potato-on-couch icon
const BrandMark = ({ size = 32, radius = 8 }) => (
  <div style={{
    width: size, height: size, borderRadius: radius,
    background: '#22416B',
    overflow: 'hidden',
    display: 'grid', placeItems: 'center',
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.06)',
    flexShrink: 0,
  }}>
    <img src="assets/icon.png" alt="CouchPotatoPlayer"
         style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
         draggable={false} />
  </div>
);

// Artboard header chip
const ArtboardChrome = ({ label, children, width, height, bg = 'var(--bg)' }) => (
  <div style={{ width, height, background: bg, borderRadius: 14, overflow: 'hidden', position: 'relative', boxShadow: '0 30px 60px -20px rgba(0,0,0,0.8)' }}>
    {children}
  </div>
);

// Device frames
const MobileFrame = ({ children, width = 380, height = 820 }) => (
  <div style={{
    width, height,
    background: '#000',
    borderRadius: 44,
    padding: 10,
    boxShadow: '0 30px 80px -20px rgba(0,0,0,0.9), inset 0 0 0 1px #2a2a33'
  }}>
    <div style={{ width: '100%', height: '100%', background: 'var(--bg)', borderRadius: 36, overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', width: 100, height: 28, background: '#000', borderRadius: 20, zIndex: 50 }} />
      {children}
    </div>
  </div>
);

// Mobile status bar
const StatusBar = ({ dark = false }) => (
  <div className="status-bar" style={{ color: dark ? '#000' : 'var(--text)', paddingTop: 14, height: 44 }}>
    <span>9:41</span>
    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
      <svg width="16" height="11" viewBox="0 0 16 11"><rect x="1" y="7" width="2" height="3" fill="currentColor" rx="0.5"/><rect x="5" y="5" width="2" height="5" fill="currentColor" rx="0.5"/><rect x="9" y="3" width="2" height="7" fill="currentColor" rx="0.5"/><rect x="13" y="1" width="2" height="9" fill="currentColor" rx="0.5"/></svg>
      <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor"><path d="M8 2c2.3 0 4.3.9 5.8 2.3l-.7.8A7 7 0 008 3.5 7 7 0 002.9 5l-.7-.7C3.7 2.9 5.7 2 8 2zm0 2.5c1.5 0 2.9.6 3.9 1.6l-.7.7A4 4 0 008 5.5a4 4 0 00-3.2 1.3l-.7-.7A5.5 5.5 0 018 4.5zm0 2.5c.8 0 1.5.3 2 .9L8 10 6 7.9A2.6 2.6 0 018 7z"/></svg>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
        <span style={{ width: 22, height: 11, border: '1px solid currentColor', borderRadius: 3, position: 'relative', padding: 1 }}>
          <span style={{ display: 'block', width: '75%', height: '100%', background: 'currentColor', borderRadius: 1 }} />
        </span>
      </span>
    </span>
  </div>
);

// TV frame (simple bezel)
const TVFrame = ({ children, width = 1280, height = 720 }) => (
  <div style={{
    width, height,
    background: '#000',
    borderRadius: 14,
    padding: 8,
    boxShadow: '0 50px 120px -30px rgba(0,0,0,0.9), inset 0 0 0 1px #1a1a22'
  }}>
    <div style={{ width: '100%', height: '100%', background: 'var(--bg)', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
      {children}
    </div>
  </div>
);

Object.assign(window, { Poster, Backdrop, Logo, BrandMark, ArtboardChrome, MobileFrame, StatusBar, TVFrame });
