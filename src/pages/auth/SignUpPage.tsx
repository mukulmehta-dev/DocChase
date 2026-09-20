import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { supabase, isProduction } from '../../lib/supabase';
import { authService, getFriendlyAuthErrorMessage } from '../../services/auth';

const PLAN_INFO: Record<string, { name: string; price: string; description: string }> = {
  free: {
    name: 'Free Plan',
    price: '$0/month',
    description: '3 active clients, 1 recurring request template',
  },
  starter: {
    name: 'Starter Plan',
    price: '$9/month',
    description: '14-day free trial included • 15 active clients, smart reminders',
  },
  pro: {
    name: 'Pro Plan',
    price: '$19/month',
    description: '14-day free trial included • 100 active clients, AI assistance',
  },
};

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

  const [isExistingAccount, setIsExistingAccount] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);

  const { user, signUp, signInWithOAuth, resendConfirmationEmail } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawPlan = searchParams.get('plan')?.toLowerCase().trim() || '';
  const selectedPlan = PLAN_INFO[rawPlan] || null;

  // Cooldown countdown timer for resend email
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Safe confirmation detection:
  // Automatically detects when confirmation happens on this device/browser via Supabase's native cross-tab storage listener
  useEffect(() => {
    if (!emailConfirmationRequired || isConfirmed) return;

    if (user) {
      setIsConfirmed(true);
      const timer = setTimeout(() => navigate('/dashboard'), 1200);
      return () => clearTimeout(timer);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setIsConfirmed(true);
        setTimeout(() => navigate('/dashboard'), 1200);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [emailConfirmationRequired, isConfirmed, user, navigate]);

  const handleVerifiedCheck = async () => {
    setIsCheckingVerification(true);
    try {
      const session = await authService.getSession();
      if (session?.user) {
        setIsConfirmed(true);
        setTimeout(() => navigate('/dashboard'), 1000);
        return;
      }
      // If confirmed on another device (Device B), Device A does not yet hold a local session.
      // Safely navigate to /sign-in with email pre-populated so user only enters password once.
      navigate('/sign-in', {
        state: {
          email,
          verifiedMessage: 'Email verified! Please enter your password to sign in on this device.',
        },
      });
    } finally {
      setIsCheckingVerification(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsExistingAccount(false);

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
      // For security, immediately wipe password from component state
      setPassword('');
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
      const code = (err?.code || '').toLowerCase();
      if (
        code === 'user_already_exists' ||
        rawMsg.includes('already registered') ||
        rawMsg.includes('user already exists') ||
        rawMsg.includes('already in use') ||
        rawMsg.includes('already exists')
      ) {
        setIsExistingAccount(true);
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
    setIsExistingAccount(false);
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

  // ── Email confirmation screen (Device A) ──────────────────────────────────
  if (emailConfirmationRequired) {
    if (isConfirmed) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 bg-[#070B14] relative">
          <div className="absolute inset-0 bg-dot-dark opacity-30 pointer-events-none" aria-hidden="true" />
          <div className="relative w-full max-w-md bg-[#0B1120] rounded-2xl border border-white/[0.09] shadow-[0_24px_60px_rgba(0,0,0,0.6)] p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center justify-center mb-5">
              <span className="material-symbols-outlined text-[36px]">verified</span>
            </div>

            <h1 className="text-2xl font-bold text-white tracking-tight">
              Email verified successfully.
            </h1>
            <p className="text-sm text-slate-400 max-w-xs mt-2 mb-8 leading-relaxed">
              Your confirmation was detected! Taking you to your dashboard...
            </p>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => navigate('/dashboard')}
              icon="arrow_forward"
            >
              Go to DocChase
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 bg-[#070B14] relative">
        <div className="absolute inset-0 bg-dot-dark opacity-30 pointer-events-none" aria-hidden="true" />
        <div className="absolute inset-0 bg-dc-center-glow opacity-50 pointer-events-none" aria-hidden="true" />

        <div className="relative w-full max-w-md flex flex-col items-center">
          <div className="w-14 h-14 rounded-xl bg-sky-500 flex items-center justify-center shadow-[0_0_20px_rgba(14,165,233,0.3)] mb-5 text-white">
            <span className="material-symbols-outlined text-[30px]">mark_email_read</span>
          </div>

          <h1 className="font-bold text-2xl text-white text-center tracking-tight">
            Check your email
          </h1>
          <p className="text-sm text-slate-400 text-center max-w-sm mt-2 mb-8">
            We sent a confirmation link to{' '}
            <span className="font-semibold text-slate-200">{email}</span>.{' '}
            Confirm your email to activate your DocChase account.
          </p>

          <div className="w-full bg-[#0B1120] rounded-2xl border border-white/[0.09] shadow-[0_24px_60px_rgba(0,0,0,0.6)] p-6 flex flex-col text-center">
            <div className="p-3 bg-white/[0.04] rounded-lg border border-white/[0.06] text-xs text-slate-300 font-mono mb-4 break-all">
              {email}
            </div>

            {/* Waiting indicator */}
            <div className="flex items-center justify-center gap-2.5 p-3 mb-5 bg-sky-500/[0.07] rounded-lg border border-sky-500/20 text-xs text-sky-400 font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-400"></span>
              </span>
              <span>Waiting for email confirmation...</span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed mb-6">
              Please click the link in the confirmation email. If opened in this browser, this page will advance automatically.
            </p>

            {resendSuccess && (
              <div className="mb-4 p-2.5 bg-emerald-500/10 border border-emerald-500/25 rounded-lg text-xs text-emerald-400 flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[16px] shrink-0">check_circle</span>
                <span>Confirmation email resent! Please check your inbox.</span>
              </div>
            )}

            {resendError && (
              <div className="mb-4 p-2.5 bg-rose-500/10 border border-rose-500/25 rounded-lg text-xs text-rose-400 flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
                <span>{resendError}</span>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Button
                id="verified-continue-btn"
                variant="primary"
                size="md"
                fullWidth
                isLoading={isCheckingVerification}
                onClick={handleVerifiedCheck}
                icon="task_alt"
              >
                I've verified my email
              </Button>

              <Button
                id="resend-confirmation-btn"
                variant="secondary-dark"
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
                variant="secondary-dark"
                size="md"
                fullWidth
                onClick={() => navigate('/sign-in', { state: { email } })}
                icon="login"
              >
                Back to Sign In
              </Button>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-600">
            Didn't receive the email? Check your spam or junk folder.
          </div>
        </div>
      </div>
    );
  }

  // ── Registration form ──────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 relative bg-[#070B14]">
      <div className="absolute inset-0 bg-dot-dark opacity-30 pointer-events-none" aria-hidden="true" />
      <div className="absolute inset-0 bg-dc-center-glow opacity-60 pointer-events-none" aria-hidden="true" />

      <div className="relative w-full max-w-[420px] flex flex-col items-center">

        {/* Brand mark */}
        <Link to="/" className="flex items-center gap-2.5 mb-8 group" aria-label="DocChase Home">
          <div className="w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center shadow-[0_0_20px_rgba(14,165,233,0.3)] group-hover:bg-sky-400 transition-colors">
            <span
              className="material-symbols-outlined text-[22px] text-white"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >domain</span>
          </div>
          <span className="font-bold text-lg tracking-tight text-white">
            Doc<span className="text-sky-400">Chase</span>
          </span>
        </Link>

        {/* Heading */}
        <h1 className="font-bold text-2xl text-white text-center tracking-tight mb-1.5">
          Create your firm workspace
        </h1>

        {selectedPlan ? (
          <div
            id="signup-selected-plan-badge"
            className="mt-2 mb-8 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/25 text-sky-400 text-xs font-medium"
          >
            <span className="material-symbols-outlined text-[15px]">bookmark_added</span>
            <span>
              Selected Plan: <strong>{selectedPlan.name}</strong> ({selectedPlan.price})
            </span>
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center mb-8">
            Start collecting client documents automatically. Free starter plan includes full document tracking.
          </p>
        )}

        {/* Card */}
        <div className="w-full bg-[#0B1120] rounded-2xl border border-white/[0.09] shadow-[0_24px_60px_rgba(0,0,0,0.6)] p-7 flex flex-col">

          {/* Error banner */}
          {error && (
            <div className="mb-5 p-3 bg-rose-500/10 border border-rose-500/25 rounded-xl text-xs text-rose-400 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
                <span>{error}</span>
              </div>
              {isExistingAccount && (
                <Link
                  to="/sign-in"
                  className="self-start text-xs font-semibold text-sky-400 hover:underline mt-0.5 flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">login</span>
                  Sign in to your account
                </Link>
              )}
            </div>
          )}

          {/* OAuth buttons */}
          <div className="flex flex-col gap-2.5 mb-5">
            <button
              type="button"
              id="google-signup-btn"
              onClick={() => handleOAuth('google')}
              disabled={isFormDisabled}
              className="w-full h-10 px-4 rounded-lg border border-white/[0.10] bg-white/[0.04] hover:bg-slate-800/80 hover:border-sky-500/40 hover:text-white hover:shadow-[0_0_16px_rgba(14,165,233,0.12)] text-slate-200 text-xs font-semibold flex items-center justify-center gap-2.5 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50"
            >
              {oauthLoading === 'google' ? (
                <span className="material-symbols-outlined text-[18px] animate-spin text-slate-400">progress_activity</span>
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
              id="github-signup-btn"
              onClick={() => handleOAuth('github')}
              disabled={isFormDisabled}
              className="w-full h-10 px-4 rounded-lg border border-white/[0.10] bg-white/[0.04] hover:bg-slate-800/80 hover:border-sky-500/40 hover:text-white hover:shadow-[0_0_16px_rgba(14,165,233,0.12)] text-slate-200 text-xs font-semibold flex items-center justify-center gap-2.5 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50"
            >
              {oauthLoading === 'github' ? (
                <span className="material-symbols-outlined text-[18px] animate-spin text-slate-400">progress_activity</span>
              ) : (
                <svg className="w-4 h-4 shrink-0 fill-current text-white" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              )}
              <span>Continue with GitHub</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.07]" />
            </div>
            <span className="relative bg-[#0B1120] px-3 text-[11px] font-medium uppercase tracking-wider text-slate-600">
              OR
            </span>
          </div>

          {/* Registration form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 dark-form">
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
          <p>
            By signing up, you agree to our{' '}
            <Link to="/terms" id="signup-terms-link" className="font-medium text-slate-400 underline hover:text-sky-400 transition-colors">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy" id="signup-privacy-link" className="font-medium text-slate-400 underline hover:text-sky-400 transition-colors">
              Privacy Policy
            </Link>
            .
          </p>
          <div className="flex items-center gap-1.5">
            <span>Already have an account?</span>
            <Link to="/sign-in" className="font-semibold text-sky-400 hover:text-sky-300 hover:underline transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
