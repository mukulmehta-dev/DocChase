import React, { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Button } from '../ui/Button';

export const PublicLayout: React.FC = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileToggleRef = useRef<HTMLButtonElement>(null);

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

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col text-slate-900">
      {/* Public Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center text-white shadow-sm">
              <span className="material-symbols-outlined text-[20px]">fact_check</span>
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-900">DocChase</span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <Link
              to="/"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="hover:text-primary-container transition-colors"
            >
              Product
            </Link>
            <Link to="/pricing" className="hover:text-primary-container transition-colors">
              Pricing
            </Link>
            <Link
              to="/#features"
              onClick={() => handleAnchorClick('features')}
              className="hover:text-primary-container transition-colors"
            >
              Workflow
            </Link>
            <Link
              to="/#security"
              onClick={() => handleAnchorClick('security')}
              className="hover:text-primary-container transition-colors"
            >
              Security
            </Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/sign-in">
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
              <span className="material-symbols-outlined text-[24px]">
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
            className="md:hidden border-t border-slate-200 bg-white/95 backdrop-blur-md px-4 pt-3 pb-4 shadow-lg animate-fade-in"
          >
            <nav className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              <Link
                to="/"
                id="mobile-nav-product"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-3 py-2 rounded-lg hover:bg-slate-100 hover:text-primary-container transition-colors"
              >
                Product
              </Link>
              <Link
                to="/pricing"
                id="mobile-nav-pricing"
                onClick={() => setIsMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-slate-100 hover:text-primary-container transition-colors"
              >
                Pricing
              </Link>
              <Link
                to="/#features"
                id="mobile-nav-workflow"
                onClick={() => handleAnchorClick('features')}
                className="px-3 py-2 rounded-lg hover:bg-slate-100 hover:text-primary-container transition-colors"
              >
                Workflow
              </Link>
              <Link
                to="/#security"
                id="mobile-nav-security"
                onClick={() => handleAnchorClick('security')}
                className="px-3 py-2 rounded-lg hover:bg-slate-100 hover:text-primary-container transition-colors"
              >
                Security
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* Page Body */}
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>

      {/* Public Footer */}
      <footer className="bg-white border-t border-slate-200 py-10 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary-container flex items-center justify-center text-white text-xs">
              <span className="material-symbols-outlined text-[14px]">fact_check</span>
            </div>
            <span className="font-semibold text-slate-700">DocChase Inc.</span>
            <span>— Stop chasing clients for documents.</span>
          </div>
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-6 gap-y-2.5">
            <Link to="/pricing" className="hover:underline">
              Pricing
            </Link>
            <Link to="/sign-in" className="hover:underline">
              Firm Login
            </Link>
            <Link
              to="/#security"
              onClick={() => handleAnchorClick('security')}
              className="hover:underline"
            >
              Security
            </Link>
            <Link to="/terms" className="hover:underline">
              Terms
            </Link>
            <Link to="/privacy" className="hover:underline">
              Privacy
            </Link>
            {/* Informational Security Badge (Non-clickable static badge) */}
            <div
              id="footer-encryption-badge"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-medium select-none cursor-default"
              title="Informational: 256-bit document encryption is standard across all DocChase storage and transport."
            >
              <span className="material-symbols-outlined text-[13px] text-emerald-600">lock</span>
              <span>256-bit Document Encryption</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

