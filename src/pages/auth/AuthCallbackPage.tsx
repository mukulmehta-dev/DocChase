import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';

export const AuthCallbackPage: React.FC = () => {
  const { user, loading, refreshSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isVerified, setIsVerified] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Inspect hash and search parameters for confirmation tokens / types
    const searchParams = new URLSearchParams(location.search);
    const hash = location.hash.startsWith('#') ? location.hash.substring(1) : location.hash;
    const hashParams = new URLSearchParams(hash);

    const error = searchParams.get('error') || hashParams.get('error');
    const errorDescription = searchParams.get('error_description') || hashParams.get('error_description');

    if (error) {
      setErrorMessage(errorDescription || 'Email verification link is invalid or has expired.');
      return;
    }

    const isSignupType =
      searchParams.get('type') === 'signup' ||
      hashParams.get('type') === 'signup' ||
      searchParams.get('verified') === 'true' ||
      hashParams.get('type') === 'email_change';

    // If it is an explicit signup verification link
    if (isSignupType) {
      setIsVerified(true);
      // Attempt to refresh session in case Supabase client parsed the token
      refreshSession().catch(() => {});
      return;
    }

    // If OAuth login callback (no signup verification type), navigate automatically once user is loaded
    if (!loading) {
      if (user) {
        navigate('/dashboard', { replace: true });
      } else {
        // If neither user nor signup verification, show verified if tokens were present, else sign-in
        if (hashParams.get('access_token')) {
          setIsVerified(true);
        } else {
          navigate('/sign-in', { replace: true });
        }
      }
    }
  }, [user, loading, location, navigate, refreshSession]);

  const handleProceed = () => {
    if (user) {
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/sign-in', { replace: true });
    }
  };

  if (errorMessage) {
    return (
      <div className="min-h-screen bg-[#fafafa] dark:bg-[#09090b] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-4 shadow-sm">
          <span className="material-symbols-outlined text-[32px]">error</span>
        </div>
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">Verification Failed</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-sm mt-2 mb-6 leading-relaxed">
          {errorMessage}
        </p>
        <Button
          variant="primary"
          size="md"
          onClick={() => navigate('/sign-in', { replace: true })}
          icon="login"
        >
          Back to Sign In
        </Button>
      </div>
    );
  }

  if (isVerified) {
    return (
      <div className="min-h-screen bg-[#fafafa] dark:bg-[#09090b] flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <div className="w-full max-w-md bg-white dark:bg-[#121215] rounded-2xl shadow-lg border border-neutral-200 dark:border-neutral-800 p-8 flex flex-col items-center">
          {/* Delight verification badge */}
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-5 shadow-xs">
            <span className="material-symbols-outlined text-[36px]">verified</span>
          </div>

          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
            Email verified successfully.
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-xs mt-2 mb-8 leading-relaxed">
            Your DocChase account has been verified and is ready to use.
          </p>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleProceed}
            icon="arrow_forward"
          >
            Go to DocChase
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#09090b] flex flex-col items-center justify-center p-4">
      <span className="material-symbols-outlined text-[36px] text-neutral-900 dark:text-white animate-spin mb-3">
        progress_activity
      </span>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Verifying account confirmation...</p>
    </div>
  );
};
