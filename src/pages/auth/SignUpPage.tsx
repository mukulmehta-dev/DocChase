import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export const SignUpPage: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [firmName, setFirmName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [emailConfirmationRequired, setEmailConfirmationRequired] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  const { signUp, resendConfirmationEmail } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!firmName.trim()) {
      setError('Please provide your firm or bookkeeping practice name.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      const { needsEmailConfirmation } = await signUp(email, password, fullName, firmName);
      if (needsEmailConfirmation) {
        setEmailConfirmationRequired(true);
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setResendError(null);
    setResendSuccess(false);
    try {
      await resendConfirmationEmail(email);
      setResendSuccess(true);
    } catch (err: any) {
      setResendError(err?.message || 'Failed to resend confirmation email.');
    } finally {
      setIsResending(false);
    }
  };

  if (emailConfirmationRequired) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 animate-fade-in">
        <div className="w-full max-w-md flex flex-col items-center">
          <div className="w-14 h-14 rounded-xl bg-emerald-500 flex items-center justify-center shadow-md mb-4 text-white">
            <span className="material-symbols-outlined text-[32px]">mark_email_read</span>
          </div>

          <h1 className="font-semibold text-xl text-slate-900 text-center tracking-tight">
            Check your email
          </h1>
          <p className="text-xs text-slate-500 text-center max-w-sm mt-1 mb-6">
            We've sent a verification link to activate your firm workspace.
          </p>

          <div className="w-full bg-white rounded-xl shadow-md border border-slate-200 p-6 flex flex-col text-center">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 font-medium mb-4 break-all">
              {email}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              Please click the link in the confirmation email to verify your address. Once verified, you can sign in to access your workspace.
            </p>

            {resendSuccess && (
              <div className="mb-4 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-emerald-600">check_circle</span>
                <span>Verification email resent! Please check your inbox.</span>
              </div>
            )}

            {resendError && (
              <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-rose-600">error</span>
                <span>{resendError}</span>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Button
                variant="primary"
                size="md"
                fullWidth
                onClick={() => navigate('/sign-in')}
                icon="login"
              >
                Go to Sign In
              </Button>

              <Button
                variant="secondary"
                size="sm"
                fullWidth
                disabled={isResending}
                isLoading={isResending}
                onClick={handleResend}
                icon="forward_to_inbox"
              >
                Resend Confirmation Email
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
              <span className="material-symbols-outlined text-[16px] text-rose-600">error</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Firm / Practice Name"
              type="text"
              required
              value={firmName}
              onChange={(e) => setFirmName(e.target.value)}
              placeholder="Acorn Bookkeeping Ltd"
              leftIcon="business"
              helperText="Your clients will see this name on their document request portal."
            />

            <Input
              label="Your Full Name"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Sarah Jenkins, CPA"
              leftIcon="person"
            />

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
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              leftIcon="lock"
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isLoading}
              icon="arrow_forward"
              iconPosition="right"
              className="mt-2"
            >
              Create Firm Workspace
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
