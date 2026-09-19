import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export const SignInPage: React.FC = () => {
  const [email, setEmail] = useState('sarah@acornbookkeeping.com');
  const [password, setPassword] = useState('VaultSecure2024!');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await signIn(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
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
            <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-rose-600">error</span>
              <span>{error}</span>
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
