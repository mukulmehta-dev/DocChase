import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { isProduction } from '../../lib/supabase';
import { getFriendlyAuthErrorMessage } from '../../services/auth';
import {
  InteractiveLoginCharacters,
  type AuthInteractionField,
  type AuthInteractionState,
} from '../../components/auth/InteractiveLoginCharacters';

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
  const [activeField, setActiveField] = useState<AuthInteractionField>('none');
  const [isLoginSuccess, setIsLoginSuccess] = useState(false);

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
      setIsLoginSuccess(true);
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

  const currentAuthState: AuthInteractionState = isLoginSuccess
    ? 'success'
    : isLoading || oauthLoading !== null
    ? 'loading'
    : error
    ? 'error'
    : 'idle';

  return (
    <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-8 py-8 lg:py-0 relative bg-[#09090b] min-h-[calc(100vh-64px)] lg:h-[calc(100vh-64px)] lg:overflow-hidden">
      {/* Atmospheric background */}
      <div className="absolute inset-0 bg-dot-dark opacity-30 pointer-events-none" aria-hidden="true" />
      <div className="absolute inset-0 bg-dc-center-glow opacity-60 pointer-events-none" aria-hidden="true" />

      <div className="relative w-full max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-12 xl:gap-16">

        {/* ── LEFT: Interactive Character Mascot Area ── */}
        <div className="w-full max-w-[440px] lg:max-w-none lg:w-1/2 flex flex-col items-center justify-center">
          <InteractiveLoginCharacters
            activeField={activeField}
            isPasswordVisible={showPassword}
            authState={currentAuthState}
          />
        </div>

        {/* ── RIGHT: Login Form & Card ── */}
        <div
          className="w-full max-w-[400px] sm:max-w-[420px] flex flex-col items-center"
          onMouseEnter={() => {
            if (activeField === 'none') setActiveField('other');
          }}
          onMouseLeave={() => {
            if (activeField === 'other') setActiveField('none');
          }}
        >
          {/* Heading */}
          <h1 className="font-bold text-2xl text-white text-center tracking-tight mb-1">
            Sign in to your account
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 text-center mb-5">
            Enter your firm credentials to access your client dashboard.
          </p>

          {/* Card */}
          <div className="w-full bg-[#121215] rounded-2xl border border-white/[0.09] shadow-[0_24px_60px_rgba(0,0,0,0.6)] p-6 sm:p-7 flex flex-col">

            {/* Info banner */}
            {infoMessage && !error && (
              <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] shrink-0">check_circle</span>
                <span>{infoMessage}</span>
              </div>
            )}

            {/* Error banner */}
            {error && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/25 rounded-xl text-xs text-rose-400 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
                  <span>{error}</span>
                </div>
                {isUnconfirmed && (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={isResending}
                    className="self-start text-xs font-semibold text-white hover:underline disabled:opacity-50 mt-1 flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">forward_to_inbox</span>
                    {isResending ? 'Sending...' : 'Resend confirmation email'}
                  </button>
                )}
              </div>
            )}

            {/* Resend status */}
            {resendStatus && (
              <div
                className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2 border ${
                  resendStatus.success
                    ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/25 text-rose-400'
                }`}
              >
                <span className="material-symbols-outlined text-[16px] shrink-0">
                  {resendStatus.success ? 'check_circle' : 'error'}
                </span>
                <span>{resendStatus.message}</span>
              </div>
            )}

            {/* OAuth buttons */}
            <div className="flex flex-col gap-2.5 mb-4">
              <button
                type="button"
                id="google-signin-btn"
                onClick={() => handleOAuth('google')}
                disabled={isFormDisabled}
                className="w-full h-9 sm:h-10 px-4 rounded-lg border border-white/[0.10] bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/30 hover:text-white hover:shadow-[0_0_16px_rgba(255,255,255,0.06)] text-neutral-200 text-xs font-semibold flex items-center justify-center gap-2.5 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                {oauthLoading === 'google' ? (
                  <span className="material-symbols-outlined text-[18px] animate-spin text-neutral-400">progress_activity</span>
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
                className="w-full h-9 sm:h-10 px-4 rounded-lg border border-white/[0.10] bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/30 hover:text-white hover:shadow-[0_0_16px_rgba(255,255,255,0.06)] text-neutral-200 text-xs font-semibold flex items-center justify-center gap-2.5 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                {oauthLoading === 'github' ? (
                  <span className="material-symbols-outlined text-[18px] animate-spin text-neutral-400">progress_activity</span>
                ) : (
                  <svg className="w-4 h-4 shrink-0 fill-current text-white" viewBox="0 0 24 24">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                )}
                <span>Continue with GitHub</span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/[0.07]" />
              </div>
              <span className="relative bg-[#121215] px-3 text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                OR
              </span>
            </div>

            {/* Email + password form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 dark-form">
              <div onFocus={() => setActiveField('email')} onBlur={() => setActiveField('none')}>
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
              </div>

              <div onFocus={() => setActiveField('password')} onBlur={() => setActiveField('none')}>
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
                      className="p-1 text-neutral-500 hover:text-neutral-300 focus:outline-none cursor-pointer"
                      aria-label="Toggle password visibility"
                      disabled={isFormDisabled}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  }
                />
              </div>

              <div className="flex items-center justify-end pt-0.5">
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-neutral-300 hover:text-white hover:underline transition-colors"
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

          {/* Security trust badge */}
          <div className="mt-4 flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.07]">
            <span className="material-symbols-outlined text-[13px] text-emerald-400">shield_lock</span>
            <span className="text-[11px] font-medium text-neutral-400">
              256-bit encrypted • TLS-secured connections
            </span>
          </div>

          {/* Registration link */}
          <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-neutral-400">
            <span>Don't have an account?</span>
            <Link to="/sign-up" className="font-semibold text-white hover:underline transition-colors">
              Create Account
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};
