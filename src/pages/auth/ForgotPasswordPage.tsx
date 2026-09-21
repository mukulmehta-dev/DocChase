import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService, getFriendlyAuthErrorMessage } from '../../services/auth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

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
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 bg-[#09090b]">
      <div className="w-full max-w-sm flex flex-col items-center">
        <div className="w-12 h-12 rounded-xl bg-neutral-900 border border-white/15 flex items-center justify-center text-white shadow-md mb-4">
          <span className="material-symbols-outlined text-[28px]">lock_reset</span>
        </div>

        <h1 className="font-semibold text-xl text-white text-center tracking-tight">
          Reset password
        </h1>
        <p className="text-xs text-neutral-400 text-center max-w-[280px] mt-1 mb-6">
          Enter your email address and we'll send you a link to reset your firm password.
        </p>

        <div className="w-full bg-[#121215] rounded-xl shadow-md border border-white/[0.08] p-6 flex flex-col dark-form">
          {submitted ? (
            <div className="text-center py-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-2">
                <span className="material-symbols-outlined text-[24px]">mark_email_read</span>
              </div>
              <h3 className="font-semibold text-sm text-white">Check your inbox</h3>
              <p className="text-xs text-neutral-400 mt-1 mb-4">
                If an account exists for {email}, a password reset link has been sent.
              </p>
              <Link to="/sign-in">
                <Button variant="secondary-dark" size="sm" fullWidth>
                  Return to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/25 rounded-lg text-xs text-rose-400">
                  {error}
                </div>
              )}

              <Input
                label="Work Email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sarah@acornbookkeeping.com"
                leftIcon="mail"
              />

              <Button
                type="submit"
                variant="primary"
                size="md"
                fullWidth
                isLoading={isLoading}
                className="mt-1"
              >
                Send Reset Link
              </Button>

              <div className="text-center mt-2">
                <Link to="/sign-in" className="text-xs text-neutral-400 hover:text-white transition-colors">
                  Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
