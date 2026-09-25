import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService, getFriendlyAuthErrorMessage } from '../../services/auth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Logo } from '../../components/ui/Logo';
import { AuthAuroraBackground } from '../../components/auth/AuthAuroraBackground';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await authService.resetPassword(email.trim());
      setSubmitted(true);
    } catch (err: any) {
      const code = (err?.code || err?.error_code || '').toString().toLowerCase();
      const msg = (err?.message || '').toLowerCase();
      const status = Number(err?.status);

      const isRateLimit =
        status === 429 ||
        code === 'over_email_send_rate_limit' ||
        code === 'rate_limit_exceeded' ||
        msg.includes('rate limit') ||
        msg.includes('too many attempts');

      if (isRateLimit) {
        setError('Please wait a moment before requesting another reset email.');
      } else {
        setError(getFriendlyAuthErrorMessage(err));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 sm:py-16 relative bg-[#02050c] min-h-[calc(100vh-64px)] overflow-hidden">
      {/* ── Full-viewport Animated Aurora Environment ── */}
      <AuthAuroraBackground />

      <div className="relative z-10 w-full max-w-[420px] flex flex-col items-center">
        {/* Brand mark */}
        <Link to="/" className="mb-6 sm:mb-8 group" aria-label="DocChase Home">
          <Logo size="lg" />
        </Link>

        {/* Heading */}
        <h1 className="font-bold text-2xl text-white text-center tracking-tight mb-1.5">
          Reset password
        </h1>
        <p className="text-sm text-neutral-400 text-center mb-7 max-w-sm">
          Enter your email address and we'll send you a link to reset your firm password.
        </p>

        {/* Smoked Dark Glass Card */}
        <div className="w-full bg-[#070c18]/70 backdrop-blur-2xl rounded-2xl border border-white/[0.09] shadow-[0_24px_60px_rgba(0,0,0,0.7),0_0_40px_rgba(6,30,50,0.22)] p-6 sm:p-7 flex flex-col relative overflow-hidden ring-1 ring-white/[0.04]">
          {/* Subtle top edge luminous specular line */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/25 to-transparent pointer-events-none" />

          {submitted ? (
            <div className="text-center py-2 flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center justify-center mb-4 shadow-[0_0_24px_rgba(16,185,129,0.15)]">
                <span className="material-symbols-outlined text-[30px]">mark_email_read</span>
              </div>
              <h3 className="font-bold text-lg text-white">Check your inbox</h3>
              <p className="text-xs text-neutral-400 mt-2 mb-6 max-w-xs leading-relaxed">
                If an account exists for <span className="text-neutral-200 font-medium">{email}</span>, a password reset link has been sent.
              </p>
              <Link to="/sign-in" className="w-full">
                <Button
                  size="md"
                  fullWidth
                  className="bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.12] transition-all"
                >
                  Return to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 dark-form">
              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-xl text-xs text-rose-400 flex items-center gap-2 backdrop-blur-sm">
                  <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
                  <span>{error}</span>
                </div>
              )}

              <Input
                id="reset-email"
                label="Work Email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sarah@acornbookkeeping.com"
                leftIcon="mail"
                disabled={isLoading}
              />

              <Button
                type="submit"
                size="lg"
                fullWidth
                isLoading={isLoading}
                disabled={isLoading}
                icon="arrow_forward"
                iconPosition="right"
                className="mt-1.5 bg-gradient-to-r from-teal-500/20 via-cyan-400/25 to-indigo-500/20 hover:from-teal-500/30 hover:via-cyan-400/35 hover:to-indigo-500/30 text-white font-semibold border border-cyan-400/35 hover:border-cyan-300/50 shadow-[0_0_24px_rgba(20,184,166,0.18),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_0_32px_rgba(20,184,166,0.28),inset_0_1px_0_rgba(255,255,255,0.3)] backdrop-blur-sm transition-all duration-200"
              >
                Send Reset Link
              </Button>

              <div className="text-center mt-3 pt-3 border-t border-white/[0.06]">
                <Link
                  to="/sign-in"
                  className="text-xs text-neutral-400 hover:text-cyan-300 transition-colors inline-flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </form>
          )}
        </div>

        {/* Security trust badge */}
        <div className="mt-5 flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.07] backdrop-blur-md">
          <span className="material-symbols-outlined text-[13px] text-teal-400">shield_lock</span>
          <span className="text-[11px] font-medium text-neutral-400">
            256-bit encrypted • TLS-secured connections
          </span>
        </div>
      </div>
    </div>
  );
};
