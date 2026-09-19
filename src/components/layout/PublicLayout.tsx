import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Button } from '../ui/Button';

export const PublicLayout: React.FC = () => {
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

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <Link to="/" className="hover:text-primary-container transition-colors">
              Product
            </Link>
            <Link to="/pricing" className="hover:text-primary-container transition-colors">
              Pricing
            </Link>
            <a href="#features" className="hover:text-primary-container transition-colors">
              Workflow
            </a>
            <a href="#security" className="hover:text-primary-container transition-colors">
              Security
            </a>
          </nav>

          <div className="flex items-center gap-2.5 sm:gap-3">
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
          </div>
        </div>
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
          <div className="flex items-center gap-6">
            <Link to="/pricing" className="hover:underline">
              Pricing
            </Link>
            <Link to="/sign-in" className="hover:underline">
              Firm Login
            </Link>
            <span>256-bit Document Encryption</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
