import React, { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Button } from '../ui/Button';

export const PublicLayout: React.FC = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileToggleRef = useRef<HTMLButtonElement>(null);

  // Detect scroll for header elevation change
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on pathname change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Handle cross-page and on-page hash navigation
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        const timer = setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 80);
        return () => clearTimeout(timer);
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [location.pathname, location.hash]);

  // Close mobile menu on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  // Close mobile menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(e.target as Node) &&
        mobileToggleRef.current &&
        !mobileToggleRef.current.contains(e.target as Node)
      ) {
        setIsMobileMenuOpen(false);
      }
    };
    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  const handleAnchorClick = (id: string) => {
    setIsMobileMenuOpen(false);
    if (location.pathname === '/') {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const navLinks = [
    { label: 'Product', to: '/', onClick: () => window.scrollTo({ top: 0, behavior: 'smooth' }), id: 'nav-product' },
    { label: 'Pricing', to: '/pricing', id: 'nav-pricing' },
    { label: 'Workflow', to: '/#features', onClick: () => handleAnchorClick('features'), id: 'nav-workflow' },
    { label: 'Security', to: '/#security', onClick: () => handleAnchorClick('security'), id: 'nav-security' },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col text-slate-900">
      {/* Public Header */}
      <header
        className={`sticky top-0 z-40 transition-all duration-200 ${
          isScrolled
            ? 'bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-[0_1px_8px_rgba(15,23,42,0.06)]'
            : 'bg-white/90 backdrop-blur-sm border-b border-slate-200/60'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Wordmark */}
          <Link to="/" className="flex items-center gap-2.5 group" aria-label="DocChase Home">
            <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center shadow-sm group-hover:bg-sky-400 transition-colors duration-150">
              <span className="material-symbols-outlined text-[18px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>
                fact_check
              </span>
            </div>
            <span className="font-bold text-[17px] tracking-tight text-slate-900">
              Doc<span className="text-sky-500">Chase</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {navLinks.map((link) => (
              <Link
                key={link.id}
                id={link.id}
                to={link.to}
                onClick={link.onClick}
                className="relative px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-50 transition-all duration-150 group"
              >
                {link.label}
                <span className="absolute bottom-0.5 left-3 right-3 h-[1.5px] bg-sky-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left rounded-full" />
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link to="/sign-in" className="hidden sm:block">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link to="/sign-up">
              <Button variant="primary" size="sm" icon="arrow_forward" iconPosition="right">
                Start Free
              </Button>
            </Link>

            {/* Mobile Menu Toggle Button */}
            <button
              ref={mobileToggleRef}
              type="button"
              id="mobile-menu-toggle-btn"
              className="md:hidden p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none flex items-center justify-center cursor-pointer"
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            >
              <span className="material-symbols-outlined text-[22px]">
                {isMobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {isMobileMenuOpen && (
          <div
            ref={mobileMenuRef}
            id="mobile-nav-menu"
            className="md:hidden border-t border-slate-200 bg-white/98 backdrop-blur-md shadow-lg"
          >
            <nav className="flex flex-col px-3 py-3 gap-0.5" aria-label="Mobile navigation">
              {navLinks.map((link) => (
                <Link
                  key={link.id}
                  to={link.to}
                  id={`mobile-${link.id}`}
                  onClick={link.onClick || (() => setIsMobileMenuOpen(false))}
                  className="px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors flex items-center gap-2"
                >
                  {link.label}
                </Link>
              ))}
              <div className="h-px bg-slate-100 my-2 mx-1" />
              <div className="flex gap-2 px-1">
                <Link to="/sign-in" className="flex-1" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="secondary" size="sm" fullWidth>
                    Sign In
                  </Button>
                </Link>
                <Link to="/sign-up" className="flex-1" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="primary" size="sm" fullWidth>
                    Start Free
                  </Button>
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Page Body */}
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>

      {/* Public Footer */}
      <footer className="bg-white border-t border-slate-200 pt-12 pb-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Footer top: brand + link columns */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pb-10 border-b border-slate-100">
            {/* Brand column */}
            <div className="flex flex-col gap-3">
              <Link to="/" className="flex items-center gap-2 w-fit group" aria-label="DocChase Home">
                <div className="w-7 h-7 rounded-md bg-sky-500 flex items-center justify-center group-hover:bg-sky-400 transition-colors">
                  <span className="material-symbols-outlined text-[14px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>
                    fact_check
                  </span>
                </div>
                <span className="font-bold text-sm text-slate-800">Doc<span className="text-sky-500">Chase</span></span>
              </Link>
              <p className="text-xs text-slate-500 leading-relaxed max-w-[200px]">
                The document collection platform built for small accounting firms.
              </p>
              {/* Encryption badge */}
              <div
                id="footer-encryption-badge"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-500 text-[11px] font-medium w-fit select-none"
                title="256-bit TLS/HTTPS transport encryption on all connections."
              >
                <span className="material-symbols-outlined text-[12px] text-emerald-600" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
                <span>256-bit Document Encryption</span>
              </div>
            </div>

            {/* Product links */}
            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Product</p>
              <Link to="/pricing" className="text-xs text-slate-600 hover:text-slate-900 transition-colors w-fit">Pricing</Link>
              <Link to="/#features" onClick={() => handleAnchorClick('features')} className="text-xs text-slate-600 hover:text-slate-900 transition-colors w-fit">Workflow</Link>
              <Link to="/#security" onClick={() => handleAnchorClick('security')} className="text-xs text-slate-600 hover:text-slate-900 transition-colors w-fit">Security</Link>
            </div>

            {/* Legal links */}
            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">Legal</p>
              <Link to="/terms" className="text-xs text-slate-600 hover:text-slate-900 transition-colors w-fit">Terms of Service</Link>
              <Link to="/privacy" className="text-xs text-slate-600 hover:text-slate-900 transition-colors w-fit">Privacy Policy</Link>
              <Link to="/sign-in" className="text-xs text-slate-600 hover:text-slate-900 transition-colors w-fit">Firm Login</Link>
            </div>
          </div>

          {/* Footer bottom: copyright */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400">
            <span>© {new Date().getFullYear()} DocChase Inc. All rights reserved.</span>
            <span className="text-slate-300 hidden sm:block">—</span>
            <span>Stop chasing clients for documents.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
