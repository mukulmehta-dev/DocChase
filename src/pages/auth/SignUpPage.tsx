import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { isProduction } from '../../lib/supabase';
import { getFriendlyAuthErrorMessage } from '../../services/auth';

export const SignUpPage: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [firmName, setFirmName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'github' | null>(null);
  const [emailConfirmationRequired, setEmailConfirmationRequired] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const { signUp, signInWithOAuth, resendConfirmationEmail } = useAuth();
  const navigate = useNavigate();

  // Cooldown countdown timer for resend email
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your work email.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (!firmName.trim()) {
      setError('Please provide your firm or bookkeeping practice name.');
      return;
    }

    setIsLoading(true);
    try {
      const { needsEmailConfirmation } = await signUp(email.trim(), password, fullName.trim(), firmName.trim());
      if (needsEmailConfirmation) {
        setEmailConfirmationRequired(true);
        setCooldown(60); // Start 60s cooldown immediately on initial send
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      if (!isProduction()) {
        console.error('[SignUpPage] Signup error:', err);
      }
      const rawMsg = err?.message?.toLowerCase() || '';
      if (rawMsg.includes('already registered') || rawMsg.includes('user already exists')) {
        setError('An account with this email already exists. Please sign in instead.');
      } else {
        setError(getFriendlyAuthErrorMessage(err));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'github') => {
    setError(null);
    setOauthLoading(provider);

    try {
      await signInWithOAuth(provider);
    } catch (err: any) {
      if (!isProduction()) {
        console.error(`[SignUpPage] ${provider} OAuth error:`, err);
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
    if (cooldown > 0 || isResending || !email) return;
    setIsResending(true);
    setResendError(null);
    setResendSuccess(false);
    try {
      await resendConfirmationEmail(email);
      setResendSuccess(true);
      setCooldown(60);
    } catch (err: any) {
      const rawMsg = err?.message?.toLowerCase() || '';
      if (rawMsg.includes('rate limit') || err?.status === 429) {
        setResendError('Too many attempts. Please wait a moment and try again.');
      } else {
        setResendError('Failed to resend confirmation email. Please try again.');
      }
    } finally {
      setIsResending(false);
    }
  };

  const isFormDisabled = isLoading || oauthLoading !== null;

  // Dedicated email confirmation screen
  if (emailConfirmationRequired) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 animate-fade-in">
        <div className="w-full max-w-md flex flex-col items-center">
          <div className="w-14 h-14 rounded-xl bg-primary-container flex items-center justify-center shadow-md mb-4 text-white">
            <span className="material-symbols-outlined text-[32px]">mark_email_read</span>
          </div>

          <h1 className="font-semibold text-xl text-slate-900 text-center tracking-tight">
            Check your email
          </h1>
          <p className="text-xs text-slate-500 text-center max-w-sm mt-1 mb-6">
            We sent a confirmation link to <span className="font-semibold text-slate-700">{email}</span>. Confirm your email to activate your DocChase account.
          </p>

          <div className="w-full bg-white rounded-xl shadow-md border border-slate-200 p-6 flex flex-col text-center">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 font-medium mb-4 break-all">
              {email}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Please click the link in the confirmation email to activate your account. Once confirmed, return here to sign in.
            </p>

            {resendSuccess && (
              <div className="mb-4 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-emerald-600 shrink-0">check_circle</span>
                <span>Confirmation email resent! Please check your inbox.</span>
              </div>
            )}

            {resendError && (
              <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-rose-600 shrink-0">error</span>
                <span>{resendError}</span>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Button
                id="resend-confirmation-btn"
                variant="secondary"
                size="md"
                fullWidth
                disabled={isResending || cooldown > 0}
                isLoading={isResending}
                onClick={handleResend}
                icon="forward_to_inbox"
              >
                {cooldown > 0 ? `Resend confirmation email (${cooldown}s)` : 'Resend confirmation email'}
              </Button>

              <Button
                variant="primary"
                size="md"
                fullWidth
                onClick={() => navigate('/sign-in')}
                icon="login"
              >
                Back to Sign In
              </Button>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-500">
            Didn't receive the email? Check your spam or junk folder.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md flex flex-col items-center">
        {/* Brand Icon */}
        <div className="w-14 h-14 rounded-xl bg-primary-container flex items-center justify-center shadow-md mb-4 text-white">
          <span className="material-symbols-outlined text-[32px]">domain</span>
        </div>

        <h1 className="font-semibold text-xl text-slate-900 text-center tracking-tight">
          Create your firm workspace
        </h1>
        <p className="text-xs text-slate-500 text-center max-w-sm mt-1 mb-6">
          Start collecting client documents automatically. Free starter plan includes full document tracking.
        </p>

        {/* Card Surface */}
        <div className="w-full bg-white rounded-xl shadow-md border border-slate-200 p-6 flex flex-col">
          {error && (
            <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-rose-600 shrink-0">error</span>
              <span>{error}</span>
            </div>
          )}

          {/* Social OAuth Buttons */}
          <div className="flex flex-col gap-2.5 mb-5">
            <button
              type="button"
              id="google-signup-btn"
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
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
              )}
              <span>Continue with Google</span>
            </button>

            <button
              type="button"
              id="github-signup-btn"
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
              id="signup-name"
              label="Name"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Sarah Jenkins, CPA"
              leftIcon="person"
              disabled={isFormDisabled}
            />

            <Input
              id="signup-email"
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sarah@acornbookkeeping.com"
              leftIcon="mail"
              disabled={isFormDisabled}
            />

            <Input
              id="signup-password"
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              leftIcon="lock"
              disabled={isFormDisabled}
            />

            <Input
              id="signup-firm"
              label="Firm Name"
              type="text"
              required
              value={firmName}
              onChange={(e) => setFirmName(e.target.value)}
              placeholder="Acorn Bookkeeping Ltd"
              leftIcon="business"
              helperText="Your clients will see this name on their document request portal."
              disabled={isFormDisabled}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isLoading}
              disabled={isFormDisabled}
              icon="arrow_forward"
              iconPosition="right"
              className="mt-2"
            >
              Create Account
            </Button>
          </form>
        </div>

        {/* Terms & Sign in link */}
        <div className="mt-6 flex flex-col items-center gap-2 text-center text-xs text-slate-500">
          <p>By signing up, you agree to our Terms of Service and Privacy Policy.</p>
          <div className="flex items-center gap-1.5">
            <span>Already have an account?</span>
            <Link to="/sign-in" className="font-semibold text-primary-container hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

