import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { isProduction } from '../../lib/supabase';
import { getFriendlyAuthErrorMessage } from '../../services/auth';

export const SignInPage: React.FC = () => {
  const location = useLocation();
  const locationState = location.state as { email?: string; verifiedMessage?: string } | null;
  const queryParams = new URLSearchParams(location.search);
  const initialEmail = locationState?.email || queryParams.get('email') || (isProduction() ? '' : 'sarah@acornbookkeeping.com');

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState(() => (isProduction() ? '' : 'VaultSecure2024!'));
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(locationState?.verifiedMessage || null);
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'github' | null>(null);
  const [isUnconfirmed, setIsUnconfirmed] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<{ success: boolean; message: string } | null>(null);

  const { signIn, signInWithOAuth, resendConfirmationEmail } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setIsUnconfirmed(false);
    setResendStatus(null);

    const formData = new FormData(e.currentTarget);
    const submittedEmail = ((formData.get('email') as string) || email).trim();
    const submittedPassword = (formData.get('password') as string) || password;

    if (!submittedEmail || !submittedPassword) {
      setError('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      await signIn(submittedEmail, submittedPassword);
      navigate('/dashboard');
    } catch (err: any) {
      if (!isProduction()) {
        console.error('[SignInPage] Auth error:', err);
      }
      const friendlyMsg = getFriendlyAuthErrorMessage(err);
      const isUnconf =
        err?.code === 'email_not_confirmed' ||
        (err?.message && err.message.toLowerCase().includes('email not confirmed'));

      if (isUnconf) {
        setIsUnconfirmed(true);
        setError('Please confirm your email before signing in.');
      } else {
        setError(friendlyMsg);
      }
      // Preserve email, clear password
      setEmail(submittedEmail);
      setPassword('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'github') => {
    setError(null);
    setIsUnconfirmed(false);
    setResendStatus(null);
    setOauthLoading(provider);

    try {
      await signInWithOAuth(provider);
      // Supabase signInWithOAuth will navigate the window to the OAuth provider URL
    } catch (err: any) {
      if (!isProduction()) {
        console.error(`[SignInPage] ${provider} OAuth error:`, err);
      }
      const msg = err?.message?.toLowerCase() || '';
      if (msg.includes('unsupported provider') || msg.includes('not enabled') || msg.includes('validation_failed')) {
        const providerName = provider === 'google' ? 'Google' : 'GitHub';
        setError(`${providerName} authentication is not enabled yet in the Supabase project configuration.`);
      } else {
        setError(getFriendlyAuthErrorMessage(err));
      }
      setOauthLoading(null);
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
      setResendStatus({
        success: false,
        message: err?.message?.includes('rate limit')
          ? 'Too many attempts. Please wait a moment and try again.'
          : 'Failed to resend confirmation email. Please try again.',
      });
    } finally {
      setIsResending(false);
    }
  };

  const isFormDisabled = isLoading || oauthLoading !== null;

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
          {infoMessage && !error && (
            <div className="mb-4 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-emerald-600 shrink-0">check_circle</span>
              <span>{infoMessage}</span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-rose-600 shrink-0">error</span>
                <span>{error}</span>
              </div>
              {isUnconfirmed && (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending}
                  className="self-start text-xs font-semibold text-primary-container hover:underline disabled:opacity-50 mt-1 flex items-center gap-1 cursor-pointer"
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
              <span className="material-symbols-outlined text-[16px] shrink-0">
                {resendStatus.success ? 'check_circle' : 'error'}
              </span>
              <span>{resendStatus.message}</span>
            </div>
          )}

          {/* Social OAuth Buttons */}
          <div className="flex flex-col gap-2.5 mb-5">
            <button
              type="button"
              id="google-signin-btn"
              onClick={() => handleOAuth('google')}
              disabled={isFormDisabled}
              className="w-full h-10 px-4 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2.5 transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {oauthLoading === 'google' ? (
                <span className="material-symbols-outlined text-[18px] animate-spin text-slate-500">progress_activity</span>
              ) : (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              )}
              <span>Continue with Google</span>
            </button>

            <button
              type="button"
              id="github-signin-btn"
              onClick={() => handleOAuth('github')}
              disabled={isFormDisabled}
              className="w-full h-10 px-4 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2.5 transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {oauthLoading === 'github' ? (
                <span className="material-symbols-outlined text-[18px] animate-spin text-slate-500">progress_activity</span>
              ) : (
                <svg className="w-4 h-4 shrink-0 fill-current text-slate-800" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              )}
              <span>Continue with GitHub</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <span className="relative bg-white px-3 text-[11px] font-medium uppercase tracking-wider text-slate-400">
              OR
            </span>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              id="work-email"
              name="email"
              label="Work Email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sarah@acornbookkeeping.com"
              leftIcon="mail"
              disabled={isFormDisabled}
            />

            <Input
              id="work-password"
              name="password"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              leftIcon="lock"
              disabled={isFormDisabled}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-slate-400 hover:text-slate-600 focus:outline-none"
                  aria-label="Toggle password visibility"
                  disabled={isFormDisabled}
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
                  disabled={isFormDisabled}
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
              disabled={isFormDisabled}
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

