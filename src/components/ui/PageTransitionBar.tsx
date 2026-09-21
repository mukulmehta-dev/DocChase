import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * PageTransitionBar
 * Renders a subtle, high-speed white light sweep along the top border on route changes.
 * Non-intrusive, pointer-events-none, hardware-accelerated.
 */
export const PageTransitionBar: React.FC = () => {
  const location = useLocation();
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    // Trigger transition beam on path change
    setAnimating(true);
    const timer = setTimeout(() => {
      setAnimating(false);
    }, 450);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  if (!animating) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-50 h-[2px] overflow-hidden pointer-events-none select-none"
    >
      <div className="w-full h-full relative">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-90 animate-page-beam shadow-[0_0_12px_rgba(255,255,255,0.9)]" />
      </div>
    </div>
  );
};
