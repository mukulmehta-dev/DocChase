import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { isProduction, isSupabaseConfigured, CONFIG_ERROR_MESSAGE } from './lib/supabase';

// Layouts
import { PublicLayout } from './components/layout/PublicLayout';
import { AccountantLayout } from './components/layout/AccountantLayout';

// Public Pages
import { LandingPage } from './pages/public/LandingPage';
import { PricingPage } from './pages/public/PricingPage';
import { TermsPage } from './pages/public/TermsPage';
import { PrivacyPage } from './pages/public/PrivacyPage';
import { SignInPage } from './pages/auth/SignInPage';
import { SignUpPage } from './pages/auth/SignUpPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';

// Accountant Pages
import { DashboardPage } from './pages/accountant/DashboardPage';
import { ClientsPage } from './pages/accountant/ClientsPage';
import { ClientDetailPage } from './pages/accountant/ClientDetailPage';
import { DocumentsPage } from './pages/accountant/DocumentsPage';
import { DocumentReviewPage } from './pages/accountant/DocumentReviewPage';
import { TemplatesPage } from './pages/accountant/TemplatesPage';
import { RequestsPage } from './pages/accountant/RequestsPage';
import { RequestDetailPage } from './pages/accountant/RequestDetailPage';
import { CreateRequestPage } from './pages/accountant/CreateRequestPage';
import { RemindersPage } from './pages/accountant/RemindersPage';
import { BillingPage } from './pages/accountant/BillingPage';
import { SettingsPage } from './pages/accountant/SettingsPage';

// Client Portal
import { ClientPortalPage } from './pages/client/ClientPortalPage';

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] dark:bg-[#09090b] flex flex-col items-center justify-center p-4">
        <span className="material-symbols-outlined text-[36px] text-neutral-900 dark:text-white animate-spin mb-3">
          progress_activity
        </span>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Verifying accountant session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/sign-in" replace />;
  }

  return <>{children}</>;
};

// Guard for pages accessible only when unauthenticated (e.g. Sign In / Sign Up)
const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading && !user) {
    return null;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

import { AuthCallbackPage } from './pages/auth/AuthCallbackPage';

export const App: React.FC = () => {
  // Production configuration hard failure guard
  if (isProduction() && !isSupabaseConfigured()) {
    return (
      <div className="min-h-screen bg-[#fafafa] dark:bg-[#09090b] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-850 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4 shadow-sm">
          <span className="material-symbols-outlined text-[32px]">error</span>
        </div>
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Configuration Error</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-md mt-2 mb-6 leading-relaxed">
          {CONFIG_ERROR_MESSAGE}
        </p>
        <div className="p-4 bg-white dark:bg-[#121215] rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 dark:text-neutral-400 max-w-lg text-left font-mono">
          Please provide valid <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> environment variables to launch DocChase in production.
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <Routes>
        {/* Auth Callback Route */}
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        {/* Public Pages */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route
            path="/sign-in"
            element={
              <PublicOnlyRoute>
                <SignInPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/sign-up"
            element={
              <PublicOnlyRoute>
                <SignUpPage />
              </PublicOnlyRoute>
            }
          />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        {/* Protected Accountant Portal */}
        <Route
          element={
            <ProtectedRoute>
              <AccountantLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/clients/:id" element={<ClientDetailPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/documents/:id" element={<DocumentReviewPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/requests" element={<RequestsPage />} />
          <Route path="/requests/new" element={<CreateRequestPage />} />
          <Route path="/requests/:id" element={<RequestDetailPage />} />
          <Route path="/requests/:id/review" element={<DocumentReviewPage />} />
          <Route path="/reminders" element={<RemindersPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* Client Document Collection Portal (Token Protected) */}
        <Route path="/request/:token" element={<ClientPortalPage />} />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeProvider>
  );
};
