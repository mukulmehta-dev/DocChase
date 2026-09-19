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

  const { signUp } = useAuth();
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
      await signUp(email, password, fullName, firmName);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
