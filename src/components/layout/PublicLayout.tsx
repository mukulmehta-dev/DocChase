import React, { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Logo } from '../ui/Logo';
import { PageTransitionBar } from '../ui/PageTransitionBar';

export const PublicLayout: React.FC = () => {
  const { user } = useAuth();
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

  const isAuthPage = location.pathname === '/sign-in' || location.pathname === '/sign-up';

  return (
    <div className="dark min-h-screen bg-[#09090b] flex flex-col text-neutral-100">
      <PageTransitionBar />

      {/* ─── Public Header ─── */}
      <header
        className={`sticky top-0 z-40 transition-all duration-300 ${
          isScrolled
            ? 'bg-[#09090b]/95 backdrop-blur-lg border-b border-white/[0.08] shadow-[0_1px_24px_rgba(0,0,0,0.7)]'
            : 'bg-[#09090b]/60 backdrop-blur-md border-b border-white/[0.04]'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

          {/* Wordmark */}
          <Link to="/" className="flex items-center gap-2.5 group" aria-label="DocChase Home">
            <Logo size="md" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {navLinks.map((link) => (
              <Link
                key={link.id}
                id={link.id}
                to={link.to}
                onClick={link.onClick}
                className="relative px-3 py-1.5 text-sm font-medium text-neutral-400 hover:text-white rounded-md hover:bg-white/[0.06] transition-all duration-150 group"
              >
                {link.label}
                <span className="absolute bottom-0.5 left-3 right-3 h-[1.5px] bg-white scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left rounded-full" />
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <Link to="/dashboard">
                <Button variant="primary" size="sm" icon="dashboard" iconPosition="right">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/sign-in" className="hidden sm:block">
                  <Button variant="outline-dark" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link to="/sign-up" className="hidden sm:block">
                  <Button variant="primary" size="sm" icon="arrow_forward" iconPosition="right">
                    Start Free
                  </Button>
                </Link>
              </>
            )}

            {/* Mobile Menu Toggle */}
            <button
              ref={mobileToggleRef}
              type="button"
              id="mobile-menu-toggle-btn"
              className="md:hidden p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-colors focus:outline-none flex items-center justify-center cursor-pointer"
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

        {/* Mobile Navigation Panel */}
        {isMobileMenuOpen && (
          <>
            {/* Backdrop scrim */}
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
              aria-hidden="true"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div
              ref={mobileMenuRef}
              id="mobile-nav-menu"
              className="relative z-40 md:hidden border-t border-white/[0.07] bg-[#121215]/98 backdrop-blur-lg shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
            >
              <nav className="flex flex-col px-3 py-3 gap-0.5" aria-label="Mobile navigation">
                {navLinks.map((link) => (
                  <Link
                    key={link.id}
                    to={link.to}
                    id={`mobile-${link.id}`}
                    onClick={link.onClick || (() => setIsMobileMenuOpen(false))}
                    className="px-3 py-3 rounded-lg text-sm font-medium text-neutral-300 hover:bg-white/[0.07] hover:text-white transition-colors flex items-center gap-2"
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="h-px bg-white/[0.06] my-2 mx-1" />
                <div className="flex gap-2 px-1">
                  {user ? (
                    <Link to="/dashboard" className="flex-1" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="primary" size="sm" fullWidth icon="dashboard">
                        Go to Dashboard
                      </Button>
                    </Link>
                  ) : (
                    <>
                      <Link to="/sign-in" className="flex-1" onClick={() => setIsMobileMenuOpen(false)}>
                        <Button variant="secondary-dark" size="sm" fullWidth>
                          Sign In
                        </Button>
                      </Link>
                      <Link to="/sign-up" className="flex-1" onClick={() => setIsMobileMenuOpen(false)}>
                        <Button variant="primary" size="sm" fullWidth>
                          Start Free
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              </nav>
            </div>
          </>
        )}
      </header>

      {/* ─── Page Body ─── */}
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>

      {/* ─── Public Footer (Hidden on dedicated full-height auth viewports) ─── */}
      {!isAuthPage && (
        <footer className="bg-[#0c0c0e] border-t border-white/[0.07] pt-12 pb-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Footer top: brand + link columns */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pb-10 border-b border-white/[0.06]">

            {/* Brand column */}
            <div className="flex flex-col gap-3">
              <Link to="/" className="flex items-center gap-2 w-fit group" aria-label="DocChase Home">
                <Logo size="sm" />
              </Link>
              <p className="text-xs text-neutral-400 leading-relaxed max-w-[200px]">
                The document collection platform built for small accounting firms.
              </p>
              {/* Encryption badge */}
              <div
                id="footer-encryption-badge"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-neutral-400 text-[11px] font-medium w-fit select-none"
                title="256-bit TLS/HTTPS transport encryption on all connections."
              >
                <span className="material-symbols-outlined text-[12px] text-emerald-400" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
                <span>256-bit TLS Encryption</span>
              </div>
            </div>

            {/* Product links */}
            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500 mb-1">Product</p>
              <Link to="/pricing" className="text-xs text-neutral-400 hover:text-white transition-colors w-fit">Pricing</Link>
              <Link to="/#features" onClick={() => handleAnchorClick('features')} className="text-xs text-neutral-400 hover:text-white transition-colors w-fit">Workflow</Link>
              <Link to="/#security" onClick={() => handleAnchorClick('security')} className="text-xs text-neutral-400 hover:text-white transition-colors w-fit">Security</Link>
            </div>

            {/* Legal links */}
            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-bold uppercase tracking-widest text-neutral-500 mb-1">Legal</p>
              <Link to="/terms" className="text-xs text-neutral-400 hover:text-white transition-colors w-fit">Terms of Service</Link>
              <Link to="/privacy" className="text-xs text-neutral-400 hover:text-white transition-colors w-fit">Privacy Policy</Link>
              <Link to="/sign-in" className="text-xs text-neutral-400 hover:text-white transition-colors w-fit">Firm Login</Link>
            </div>
          </div>

          {/* Footer bottom */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-neutral-500">
            <span>© {new Date().getFullYear()} DocChase Inc. All rights reserved.</span>
            <span className="text-neutral-700 hidden sm:block">—</span>
            <span>Stop chasing clients for documents.</span>
          </div>
        </div>
      </footer>
      )}
    </div>
  );
};
