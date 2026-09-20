import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

import { isProduction } from '../../lib/supabase';

export const SignInPage: React.FC = () => {
  const [email, setEmail] = useState(() => (isProduction() ? '' : 'sarah@acornbookkeeping.com'));
  const [password, setPassword] = useState(() => (isProduction() ? '' : 'VaultSecure2024!'));
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUnconfirmed, setIsUnconfirmed] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<{ success: boolean; message: string } | null>(null);

  const { signIn, resendConfirmationEmail } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsUnconfirmed(false);
    setResendStatus(null);
    setIsLoading(true);
    try {
      await signIn(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err?.message || 'Invalid email or password. Please try again.';
      if (msg.toLowerCase().includes('email not confirmed')) {
        setIsUnconfirmed(true);
        setError('Your email address has not been confirmed yet. Please check your inbox for the confirmation link.');
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setIsResending(true);
    setResendStatus(null);
    try {
      await resendConfirmationEmail(email);
      setResendStatus({ success: true, message: 'Confirmation email resent! Please check your inbox.' });
    } catch (err: any) {
      setResendStatus({ success: false, message: err?.message || 'Failed to resend confirmation email.' });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* Brand Icon & Delight Micro-badge */}
        <div className="relative mb-4 group">
          <div className="w-14 h-14 rounded-xl bg-primary-container flex items-center justify-center shadow-md">
            <span className="material-symbols-outlined text-[32px] text-white">fact_check</span>
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-primary-container animate-pulse" />
          </div>
        </div>

        {/* Title & Contextual Header */}
        <h1 className="font-semibold text-xl text-slate-900 text-center tracking-tight">
          Sign in to your account
        </h1>
        <p className="text-xs text-slate-500 text-center max-w-[280px] mt-1 mb-6">
          Enter your firm credentials to access your client dashboard.
        </p>

        {/* Card Surface */}
        <div className="w-full bg-white rounded-xl shadow-md border border-slate-200 p-6 flex flex-col">
          {error && (
            <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-rose-600">error</span>
                <span>{error}</span>
              </div>
              {isUnconfirmed && (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending}
                  className="self-start text-xs font-semibold text-primary-container hover:underline disabled:opacity-50 mt-1 flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">forward_to_inbox</span>
                  {isResending ? 'Sending...' : 'Resend confirmation email'}
                </button>
              )}
            </div>
          )}

          {resendStatus && (
            <div
              className={`mb-4 p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                resendStatus.success
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {resendStatus.success ? 'check_circle' : 'error'}
              </span>
              <span>{resendStatus.message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Work Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sarah@acornbookkeeping.com"
              leftIcon="mail"
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              leftIcon="lock"
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-slate-400 hover:text-slate-600 focus:outline-none"
                  aria-label="Toggle password visibility"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              }
            />

            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-3.5 h-3.5 rounded border-slate-300 text-primary-container focus:ring-0 accent-primary-container cursor-pointer"
                />
                <span className="text-xs text-slate-600">Remember 30 days</span>
              </label>

              <Link
                to="/forgot-password"
                className="text-xs font-medium text-primary-container hover:underline"
              >
                Forgot Password?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isLoading}
              icon="arrow_forward"
              iconPosition="right"
              className="mt-1"
            >
              Sign In
            </Button>
          </form>
        </div>

        {/* Security Trust Badge */}
        <div className="mt-5 flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200">
          <span className="material-symbols-outlined text-[14px] text-slate-600">shield_lock</span>
          <span className="text-[11px] font-medium text-slate-600">
            256-bit encrypted • Bank-grade document security
          </span>
        </div>

        {/* Registration Link */}
        <div className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
          <span>Don't have an account?</span>
          <Link to="/sign-up" className="font-semibold text-primary-container hover:underline">
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
};
