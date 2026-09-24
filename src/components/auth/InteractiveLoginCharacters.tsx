import React, { useEffect, useRef, useState } from 'react';

export type AuthInteractionField = 'none' | 'email' | 'password' | 'other';
export type AuthInteractionState = 'idle' | 'loading' | 'error' | 'success';

export interface InteractiveLoginCharactersProps {
  activeField?: AuthInteractionField;
  isPasswordVisible?: boolean;
  authState?: AuthInteractionState;
  className?: string;
}

/**
 * InteractiveLoginCharacters
 * Four geometric mascot characters with rich low-level continuous idle life,
 * whole-body and whole-eye physical movement, expressive living geometric mouths,
 * independent personalities, and interactive reactions to authentication states:
 *
 * 1. ORANGE (Left-Front, z: 40):
 *    - Semicircle / half-cylinder body (#fb923c -> #ea580c)
 *    - Black circular eyes with micro specular glint
 *    - Black circular mouth (solid black)
 *    - Bouncy, curious, agile micro-movements
 *
 * 2. PURPLE (Center-Right, z: 20):
 *    - Standing vertical rectangle body (#8b5cf6 -> #6d28d9)
 *    - Black eyes with micro specular glint
 *    - NO MOUTH (mouth removed completely)
 *    - Stoic, upright, occasional sharp tilt or micro-nod
 *
 * 3. PINK (Left-Center Back, z: 10):
 *    - Tallest standing vertical rectangle body (#f43f5e -> #be123c)
 *    - Black eyes with micro specular glint
 *    - Black VERTICAL rectangle mouth (solid black)
 *    - Calm, observant, smooth vertical breathing & posture shift
 *
 * 4. YELLOW (Right Flank, z: 30):
 *    - Vertical rectangle with rounded top (#facc15 -> #ca8a04)
 *    - Black eyes with micro specular glint
 *    - Black HORIZONTAL rectangle mouth (narrow height, significantly long horizontally)
 *    - Expressive, reactive, quick micro-glances
 */
export const InteractiveLoginCharacters: React.FC<InteractiveLoginCharactersProps> = ({
  activeField = 'none',
  isPasswordVisible = false,
  authState = 'idle',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasEntered, setHasEntered] = useState(false);

  // DOM node references for characters, eyes, and mouths (100% RAF transform driven)
  const c1BodyRef = useRef<HTMLDivElement>(null);
  const c2BodyRef = useRef<HTMLDivElement>(null);
  const c3BodyRef = useRef<HTMLDivElement>(null);
  const c4BodyRef = useRef<HTMLDivElement>(null);

  const c1EyesRef = useRef<HTMLDivElement>(null);
  const c2EyesRef = useRef<HTMLDivElement>(null);
  const c3EyesRef = useRef<HTMLDivElement>(null);
  const c4EyesRef = useRef<HTMLDivElement>(null);

  const c1MouthRef = useRef<HTMLDivElement>(null);
  const c3MouthRef = useRef<HTMLDivElement>(null);
  const c4MouthRef = useRef<HTMLDivElement>(null);

  // Stable mouse coordinates & tracking refs
  const mouseLookRef = useRef({ x: 0.15, y: 0 });
  const currentLookRef = useRef({ x: 0, y: 0 });
  const rafIdRef = useRef<number | null>(null);

  // Reaction timestamp tracker for wrong-password disapproval sequence
  const errorStartTimeRef = useRef<number | null>(null);
  const revealStartTimeRef = useRef<number | null>(null);
  const lastStateRef = useRef({ authState, isPasswordVisible, activeField });

  // Update state transitions
  useEffect(() => {
    if (authState === 'error' && lastStateRef.current.authState !== 'error') {
      errorStartTimeRef.current = performance.now();
    }
    if (isPasswordVisible && !lastStateRef.current.isPasswordVisible) {
      revealStartTimeRef.current = performance.now();
    }
    lastStateRef.current = { authState, isPasswordVisible, activeField };
  }, [authState, isPasswordVisible, activeField]);

  // Trigger entrance sequence on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasEntered(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // Global robust mouse listener: NEVER lost on Enter key or form state changes
  useEffect(() => {
    const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;

    const handleMouseMove = (e: MouseEvent) => {
      if (isTouch) return;
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = (e.clientX - centerX) / (window.innerWidth / 2);
      const dy = (e.clientY - centerY) / (window.innerHeight / 2);

      const deadzone = 0.04;
      const clampedX = Math.max(-1, Math.min(1, dx));
      const clampedY = Math.max(-1, Math.min(1, dy));

      mouseLookRef.current = {
        x: Math.abs(clampedX) < deadzone ? 0 : clampedX,
        y: Math.abs(clampedY) < deadzone ? 0 : clampedY,
      };
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  // Main RAF Animation Loop: Idle Systems + Glances + Blinks + Expressive State Overrides
  useEffect(() => {
    const isTouch = window.matchMedia('(hover: none) and (pointer: coarse)').matches;

    const renderFrame = (now: number) => {
      const t = now * 0.001; // Seconds

      // ── 1. Natural Easing for Mouse Look ──
      const k = 0.14;
      currentLookRef.current.x += (mouseLookRef.current.x - currentLookRef.current.x) * k;
      currentLookRef.current.y += (mouseLookRef.current.y - currentLookRef.current.y) * k;

      const lx = isTouch ? 0.1 : currentLookRef.current.x;
      const ly = isTouch ? 0 : currentLookRef.current.y;

      // ── 2. Independent Low-Level Idle System ──
      // C1 (Orange): curious, slightly bouncy, energetic sway
      const c1IdleX = Math.sin(t * 1.35) * 3.0;
      const c1IdleY = Math.abs(Math.sin(t * 2.7)) * -2.5 + Math.sin(t * 0.9) * 1.5;
      const c1IdleRot = Math.sin(t * 1.35) * 2.4;

      // C2 (Purple): stoic, slow breathing, occasional subtle tilt
      const c2IdleX = Math.sin(t * 0.75 + 1.2) * 1.5;
      const c2IdleY = Math.sin(t * 1.1 + 0.4) * 2.0;
      const c2IdleRot = Math.sin(t * 0.75 + 1.2) * 1.4;

      // C3 (Pink): calm, tall, smooth vertical breathing float
      const c3IdleX = Math.sin(t * 0.55 + 2.0) * 1.8;
      const c3IdleY = Math.sin(t * 0.9 + 1.5) * 2.8;
      const c3IdleRot = Math.sin(t * 0.55 + 2.0) * 1.2;

      // C4 (Yellow): reactive, quick rhythmic weight shifts
      const c4IdleX = Math.sin(t * 1.15 + 3.0) * 2.5;
      const c4IdleY = Math.sin(t * 1.6 + 2.2) * 1.8;
      const c4IdleRot = Math.sin(t * 1.15 + 3.0) * 2.0;

      // ── 3. Staggered Independent Blinks ──
      // Compute blink multipliers (1 = open, 0.08 = closed)
      const getBlinkScale = (period: number, offset: number) => {
        const cycle = (t + offset) % period;
        if (cycle < 0.13) {
          return 0.08 + Math.abs(Math.sin((cycle / 0.13) * Math.PI)) * 0.05;
        }
        return 1.0;
      };

      const c1Blink = getBlinkScale(3.8, 0.2);
      const c2Blink = getBlinkScale(5.4, 1.8);
      const c3Blink = getBlinkScale(4.6, 3.1);
      const c4Blink = getBlinkScale(3.2, 0.9);

      // ── 4. Character-to-Character Interaction Glances ──
      // Deterministic periodic glance cycles (never hydration-random)
      let c1GlanceX = 0;
      let c1GlanceY = 0;
      let c2GlanceX = 0;
      let c2GlanceY = 0;
      let c3GlanceX = 0;
      let c3GlanceY = 0;
      let c4GlanceX = 0;
      let c4GlanceY = 0;

      const glanceCycle = t % 14;
      if (activeField === 'none' && authState === 'idle') {
        // Cycle A (0-2.5s): Orange looks right at Purple; Purple notices and glances back left
        if (glanceCycle > 1.0 && glanceCycle < 3.2) {
          c1GlanceX = 6.0;
          c1GlanceY = -2.0;
          if (glanceCycle > 1.6) {
            c2GlanceX = -5.5;
            c2GlanceY = 2.0;
          }
        }
        // Cycle B (7-9.5s): Pink looks down-right at Yellow; Yellow glances up-left at Pink
        else if (glanceCycle > 7.0 && glanceCycle < 9.5) {
          c3GlanceX = 6.5;
          c3GlanceY = 4.0;
          if (glanceCycle > 7.6) {
            c4GlanceX = -6.0;
            c4GlanceY = -3.5;
          }
        }
      }

      // ── 5. State Machine Computations: Disapproval Head-Shake, Privacy, Reveal, Email, Success ──
      let c1BaseX = 0, c1BaseY = 0, c1BaseRot = 0;
      let c2BaseX = 0, c2BaseY = 0, c2BaseRot = 0;
      let c3BaseX = 0, c3BaseY = 0, c3BaseRot = 0;
      let c4BaseX = 0, c4BaseY = 0, c4BaseRot = 0;

      let c1EyeOffX = 0, c1EyeOffY = 0;
      let c2EyeOffX = 0, c2EyeOffY = 0;
      let c3EyeOffX = 0, c3EyeOffY = 0;
      let c4EyeOffX = 0, c4EyeOffY = 0;

      let c1MouthScale = 1.0, c1MouthY = 0;
      let c3MouthScale = 1.0, c3MouthY = 0;
      let c4MouthScale = 1.0, c4MouthY = 0;

      const errorElapsed = errorStartTimeRef.current ? now - errorStartTimeRef.current : 99999;
      const revealElapsed = revealStartTimeRef.current ? now - revealStartTimeRef.current : 99999;

      // ── A. WRONG PASSWORD / AUTH ERROR: Explicit Disapproval Head-Shake ("Nope") ──
      if (authState === 'error' && errorElapsed < 2200) {
        const sec = errorElapsed * 0.001;
        // Phase 1 (0-0.3s): Freeze & stare toward form
        if (sec < 0.3) {
          c1EyeOffX = 8; c2EyeOffX = 9; c3EyeOffX = 9; c4EyeOffX = 8;
        }
        // Phase 2 (0.3-1.4s): Staggered side-to-side disapproval head shake
        else if (sec < 1.5) {
          const shakeFreq = 16.0;
          const decay = Math.max(0, 1 - (sec - 0.3) / 1.1);
          const rawShake = Math.sin((sec - 0.3) * shakeFreq) * decay;

          c1BaseRot = rawShake * 5.0;
          c2BaseRot = rawShake * -4.2;
          c3BaseRot = rawShake * 4.0;
          c4BaseRot = rawShake * -5.5;

          c1BaseX = rawShake * 4.0;
          c2BaseX = rawShake * -3.0;
          c3BaseX = rawShake * 3.5;
          c4BaseX = rawShake * -4.5;

          // Disapproval dip & mouth compression
          c1BaseY = 6 * (1 - decay);
          c2BaseY = 8 * (1 - decay);
          c3BaseY = 10 * (1 - decay);
          c4BaseY = 7 * (1 - decay);

          c1EyeOffX = -2; c1EyeOffY = 4;
          c2EyeOffX = -3; c2EyeOffY = 5;
          c3EyeOffX = 2;  c3EyeOffY = 6;
          c4EyeOffX = -2; c4EyeOffY = 5;

          c1MouthScale = 0.85; c1MouthY = 2.0;
          c3MouthScale = 0.80; c3MouthY = 2.5;
          c4MouthScale = 0.80; c4MouthY = 2.0;
        }
        // Phase 3 (1.5-2.2s): Brief glance at each other in disbelief, then smooth return
        else {
          c1EyeOffX = 5; c1EyeOffY = -2;
          c2EyeOffX = -4; c2EyeOffY = 2;
          c3EyeOffX = 4; c3EyeOffY = 2;
          c4EyeOffX = -4; c4EyeOffY = -2;
        }
      }
      // ── B. SUCCESS CELEBRATION ──
      else if (authState === 'success') {
        const bounce = Math.sin(t * 8) * 6;
        c1BaseY = -16 + bounce; c1BaseRot = Math.sin(t * 6) * 3;
        c2BaseY = -20 + bounce; c2BaseRot = Math.cos(t * 6) * 3;
        c3BaseY = -24 + bounce; c3BaseRot = Math.sin(t * 5) * 2.5;
        c4BaseY = -18 + bounce; c4BaseRot = Math.cos(t * 5) * 3;

        c1EyeOffY = -5; c2EyeOffY = -5; c3EyeOffY = -6; c4EyeOffY = -5;
        c1MouthScale = 1.25; c3MouthScale = 1.2; c4MouthScale = 1.3;
      }
      // ── C. PASSWORD REVEAL: Instant Surprise & Curiosity ("Oh!") ──
      else if (activeField === 'password' && isPasswordVisible) {
        const revealPulse = revealElapsed < 1200 ? Math.sin((revealElapsed / 1200) * Math.PI) * 4 : 0;

        c1BaseX = 12 + revealPulse; c1BaseY = -3; c1BaseRot = 5.5;
        c2BaseX = 16 + revealPulse; c2BaseY = -4; c2BaseRot = 7.0;
        c3BaseX = 18 + revealPulse; c3BaseY = -5; c3BaseRot = 6.0;
        c4BaseX = 14 + revealPulse; c4BaseY = -3; c4BaseRot = 7.5;

        c1EyeOffX = 9.5; c1EyeOffY = 3.5;
        c2EyeOffX = 10.5; c2EyeOffY = 3.0;
        c3EyeOffX = 11.5; c3EyeOffY = 4.0;
        c4EyeOffX = 10.5; c4EyeOffY = 3.5;

        c1MouthScale = 1.35; c3MouthScale = 1.3; c4MouthScale = 1.4;
      }
      // ── D. PASSWORD FOCUS: Awkward Privacy Aversion ("We shouldn't look!") ──
      else if (activeField === 'password' && !isPasswordVisible) {
        c1BaseX = -10; c1BaseY = 3; c1BaseRot = -5.5;
        c2BaseX = -12; c2BaseY = 2; c2BaseRot = -7.0;
        c3BaseX = -14; c3BaseY = 2; c3BaseRot = -6.0;
        c4BaseX = -11; c4BaseY = 3; c4BaseRot = -5.0;

        // Eyes averted sideways / down / toward each other
        c1EyeOffX = -7.5; c1EyeOffY = 3.5;
        c2EyeOffX = -8.5; c2EyeOffY = -3.5;
        c3EyeOffX = -7.0; c3EyeOffY = 5.0;
        c4EyeOffX = -9.0; c4EyeOffY = -2.5;

        c1MouthScale = 0.9; c3MouthScale = 0.85; c4MouthScale = 0.85;
      }
      // ── E. EMAIL FOCUS & FORM APPROACH: Attentive Lean toward Form ──
      else if (activeField === 'email' || activeField === 'other') {
        c1BaseX = 9;  c1BaseY = -1; c1BaseRot = 3.5;
        c2BaseX = 12; c2BaseY = -2; c2BaseRot = 4.5;
        c3BaseX = 14; c3BaseY = -3; c3BaseRot = 4.0;
        c4BaseX = 11; c4BaseY = -2; c4BaseRot = 5.0;

        c1EyeOffX = 8.0; c1EyeOffY = 1.5;
        c2EyeOffX = 8.5; c2EyeOffY = 2.0;
        c3EyeOffX = 9.0; c3EyeOffY = 1.5;
        c4EyeOffX = 8.0; c4EyeOffY = 2.0;

        c1MouthScale = 1.1; c3MouthScale = 1.1; c4MouthScale = 1.15;
      }

      // ── 6. Combine Idle + State Transforms & Apply via Matrix Transforms ──
      if (hasEntered) {
        if (c1BodyRef.current) {
          c1BodyRef.current.style.transform = `translate3d(${c1BaseX + c1IdleX}px, ${c1BaseY + c1IdleY}px, 0) rotate(${c1BaseRot + c1IdleRot}deg)`;
        }
        if (c2BodyRef.current) {
          c2BodyRef.current.style.transform = `translate3d(${c2BaseX + c2IdleX}px, ${c2BaseY + c2IdleY}px, 0) rotate(${c2BaseRot + c2IdleRot}deg)`;
        }
        if (c3BodyRef.current) {
          c3BodyRef.current.style.transform = `translate3d(${c3BaseX + c3IdleX}px, ${c3BaseY + c3IdleY}px, 0) rotate(${c3BaseRot + c3IdleRot}deg)`;
        }
        if (c4BodyRef.current) {
          c4BodyRef.current.style.transform = `translate3d(${c4BaseX + c4IdleX}px, ${c4BaseY + c4IdleY}px, 0) rotate(${c4BaseRot + c4IdleRot}deg)`;
        }

        // Apply Eyes Transform (Mouse Look + Glance + State Offset + Blink)
        if (c1EyesRef.current) {
          const ex = c1EyeOffX !== 0 ? c1EyeOffX : lx * 6.5 + c1GlanceX;
          const ey = c1EyeOffY !== 0 ? c1EyeOffY : ly * 4.5 + c1GlanceY;
          c1EyesRef.current.style.transform = `translate3d(${ex}px, ${ey}px, 0) scaleY(${c1Blink})`;
        }
        if (c2EyesRef.current) {
          const ex = c2EyeOffX !== 0 ? c2EyeOffX : lx * 7.5 + c2GlanceX;
          const ey = c2EyeOffY !== 0 ? c2EyeOffY : ly * 5.0 + c2GlanceY;
          c2EyesRef.current.style.transform = `translate3d(${ex}px, ${ey}px, 0) scaleY(${c2Blink})`;
        }
        if (c3EyesRef.current) {
          const ex = c3EyeOffX !== 0 ? c3EyeOffX : lx * 7.0 + c3GlanceX;
          const ey = c3EyeOffY !== 0 ? c3EyeOffY : ly * 4.8 + c3GlanceY;
          c3EyesRef.current.style.transform = `translate3d(${ex}px, ${ey}px, 0) scaleY(${c3Blink})`;
        }
        if (c4EyesRef.current) {
          const ex = c4EyeOffX !== 0 ? c4EyeOffX : lx * 7.0 + c4GlanceX;
          const ey = c4EyeOffY !== 0 ? c4EyeOffY : ly * 4.5 + c4GlanceY;
          c4EyesRef.current.style.transform = `translate3d(${ex}px, ${ey}px, 0) scaleY(${c4Blink})`;
        }

        // Apply Mouths Transforms (Living geometric scales & shifts)
        if (c1MouthRef.current) {
          c1MouthRef.current.style.transform = `translate3d(0, ${c1MouthY}px, 0) scale(${c1MouthScale})`;
        }
        if (c3MouthRef.current) {
          c3MouthRef.current.style.transform = `translate3d(0, ${c3MouthY}px, 0) scale(${c3MouthScale})`;
        }
        if (c4MouthRef.current) {
          c4MouthRef.current.style.transform = `translate3d(0, ${c4MouthY}px, 0) scale(${c4MouthScale})`;
        }
      }

      rafIdRef.current = requestAnimationFrame(renderFrame);
    };

    rafIdRef.current = requestAnimationFrame(renderFrame);

    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [hasEntered, activeField, isPasswordVisible, authState]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full max-w-[460px] h-[340px] sm:h-[380px] lg:h-[420px] flex items-end justify-center select-none overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {/* Floor Contact Ambient Shadow */}
      <div className="absolute bottom-6 w-[88%] h-9 bg-black/65 blur-xl rounded-full pointer-events-none" />

      {/* ── Character Group Stage ── */}
      <div className="relative w-[340px] sm:w-[380px] h-[270px] sm:h-[300px] flex items-end justify-center">

        {/* ══════════════════════════════════════════════════════════
            CHARACTER 3 — PINK (Tallest Standing Vertical Rectangle)
            Position: Left-Center Back | z-index: 10
            Eyes: Solid Black | Mouth: Solid Black VERTICAL RECTANGLE
           ══════════════════════════════════════════════════════════ */}
        <div
          ref={c3BodyRef}
          className="absolute left-[80px] sm:left-[95px] bottom-6 z-10 w-[78px] sm:w-[86px] h-[210px] sm:h-[235px] rounded-t-2xl rounded-b-md shadow-[0_12px_28px_rgba(0,0,0,0.5)] flex flex-col items-center pt-6 will-change-transform"
          style={{
            background: 'linear-gradient(180deg, #f43f5e 0%, #e11d48 60%, #be123c 100%)',
            transform: hasEntered ? 'none' : 'translate3d(-60px, -240px, 0) rotate(-6deg) scale(0.9)',
            transition: hasEntered ? 'none' : 'transform 700ms cubic-bezier(0.16, 1, 0.3, 1) 80ms, opacity 700ms ease 80ms',
            opacity: hasEntered ? 1 : 0,
          }}
        >
          {/* Subtle Surface Specular Arc */}
          <div className="absolute inset-x-2 top-1.5 h-1 bg-white/25 rounded-full blur-[0.5px]" />

          {/* Eyes Container */}
          <div
            ref={c3EyesRef}
            className="flex items-center gap-3 mt-2 will-change-transform"
          >
            {/* Left Eye: Full Black */}
            <div className="w-[14px] h-[14px] bg-black rounded-full relative shadow-sm">
              <div className="absolute top-0.5 right-0.5 w-1 h-1 bg-white/95 rounded-full" />
            </div>
            {/* Right Eye: Full Black */}
            <div className="w-[14px] h-[14px] bg-black rounded-full relative shadow-sm">
              <div className="absolute top-0.5 right-0.5 w-1 h-1 bg-white/95 rounded-full" />
            </div>
          </div>

          {/* Mouth: SOLID BLACK VERTICAL RECTANGLE */}
          <div
            ref={c3MouthRef}
            className="mt-5 w-2.5 h-6 bg-black rounded-[2px] shadow-sm will-change-transform"
          />
        </div>

        {/* ══════════════════════════════════════════════════════════
            CHARACTER 2 — PURPLE (Standing Vertical Rectangle)
            Position: Center-Right | z-index: 20
            Eyes: Solid Black | MOUTH: NONE (Completely removed)
           ══════════════════════════════════════════════════════════ */}
        <div
          ref={c2BodyRef}
          className="absolute left-[150px] sm:left-[170px] bottom-6 z-20 w-[72px] sm:w-[80px] h-[175px] sm:h-[195px] rounded-t-2xl rounded-b-md shadow-[0_12px_28px_rgba(0,0,0,0.55)] flex flex-col items-center pt-5 will-change-transform"
          style={{
            background: 'linear-gradient(180deg, #8b5cf6 0%, #7c3aed 65%, #6d28d9 100%)',
            transform: hasEntered ? 'none' : 'translate3d(80px, -220px, 0) rotate(8deg) scale(0.9)',
            transition: hasEntered ? 'none' : 'transform 700ms cubic-bezier(0.16, 1, 0.3, 1) 160ms, opacity 700ms ease 160ms',
            opacity: hasEntered ? 1 : 0,
          }}
        >
          {/* Subtle Surface Specular Arc */}
          <div className="absolute inset-x-2 top-1.5 h-1 bg-white/25 rounded-full blur-[0.5px]" />

          {/* Eyes Container */}
          <div
            ref={c2EyesRef}
            className="flex items-center gap-2.5 mt-2.5 will-change-transform"
          >
            {/* Left Eye: Full Black */}
            <div className="w-[13px] h-[13px] bg-black rounded-full relative shadow-sm">
              <div className="absolute top-0.5 right-0.5 w-1 h-1 bg-white/95 rounded-full" />
            </div>
            {/* Right Eye: Full Black */}
            <div className="w-[13px] h-[13px] bg-black rounded-full relative shadow-sm">
              <div className="absolute top-0.5 right-0.5 w-1 h-1 bg-white/95 rounded-full" />
            </div>
          </div>

          {/* MOUTH: NONE (Purple character has NO mouth) */}
        </div>

        {/* ══════════════════════════════════════════════════════════
            CHARACTER 4 — YELLOW (Standing Vertical Rectangle with Rounded Top)
            Position: Right Flank | z-index: 30
            Eyes: Solid Black | Mouth: NARROW & LONG HORIZONTAL RECTANGLE
           ══════════════════════════════════════════════════════════ */}
        <div
          ref={c4BodyRef}
          className="absolute right-[20px] sm:right-[30px] bottom-6 z-30 w-[74px] sm:w-[82px] h-[145px] sm:h-[160px] rounded-t-full rounded-b-md shadow-[0_12px_28px_rgba(0,0,0,0.55)] flex flex-col items-center pt-6 will-change-transform"
          style={{
            background: 'linear-gradient(180deg, #facc15 0%, #eab308 65%, #ca8a04 100%)',
            transform: hasEntered ? 'none' : 'translate3d(140px, 160px, 0) rotate(12deg) scale(0.85)',
            transition: hasEntered ? 'none' : 'transform 700ms cubic-bezier(0.16, 1, 0.3, 1) 240ms, opacity 700ms ease 240ms',
            opacity: hasEntered ? 1 : 0,
          }}
        >
          {/* Subtle Surface Specular Arc */}
          <div className="absolute inset-x-3 top-2 h-1 bg-white/40 rounded-full blur-[0.5px]" />

          {/* Eyes Container */}
          <div
            ref={c4EyesRef}
            className="flex items-center gap-3 mt-1 will-change-transform"
          >
            {/* Left Eye: Full Black */}
            <div className="w-[13px] h-[13px] bg-black rounded-full relative shadow-sm">
              <div className="absolute top-0.5 right-0.5 w-1 h-1 bg-white/90 rounded-full" />
            </div>
            {/* Right Eye: Full Black */}
            <div className="w-[13px] h-[13px] bg-black rounded-full relative shadow-sm">
              <div className="absolute top-0.5 right-0.5 w-1 h-1 bg-white/90 rounded-full" />
            </div>
          </div>

          {/* Mouth: SOLID BLACK NARROW & LONG HORIZONTAL RECTANGLE */}
          <div
            ref={c4MouthRef}
            className="mt-4 w-10 h-1.5 bg-black rounded-[2px] shadow-sm will-change-transform"
          />
        </div>

        {/* ══════════════════════════════════════════════════════════
            CHARACTER 1 — ORANGE (Semicircle / Half-Cylinder)
            Position: Left Front Overlap | z-index: 40
            Eyes: Solid Black | Mouth: Solid Black CIRCLE | Shorter
           ══════════════════════════════════════════════════════════ */}
        <div
          ref={c1BodyRef}
          className="absolute left-[15px] sm:left-[22px] bottom-6 z-40 w-[96px] sm:w-[108px] h-[92px] sm:h-[104px] rounded-t-full rounded-b-md shadow-[0_16px_32px_rgba(0,0,0,0.65)] flex flex-col items-center pt-4 will-change-transform"
          style={{
            background: 'linear-gradient(180deg, #fb923c 0%, #f97316 60%, #ea580c 100%)',
            transform: hasEntered ? 'none' : 'translate3d(-160px, 40px, 0) rotate(-14deg) scale(0.85)',
            transition: hasEntered ? 'none' : 'transform 700ms cubic-bezier(0.16, 1, 0.3, 1) 0ms, opacity 700ms ease 0ms',
            opacity: hasEntered ? 1 : 0,
          }}
        >
          {/* Subtle Surface Specular Arc */}
          <div className="absolute inset-x-4 top-2 h-1 bg-white/35 rounded-full blur-[0.5px]" />

          {/* Eyes Container */}
          <div
            ref={c1EyesRef}
            className="flex items-center gap-3.5 mt-2 will-change-transform"
          >
            {/* Left Eye: Full Black */}
            <div className="w-[12px] h-[12px] bg-black rounded-full relative shadow-sm">
              <div className="absolute top-0.5 right-0.5 w-1 h-1 bg-white/90 rounded-full" />
            </div>
            {/* Right Eye: Full Black */}
            <div className="w-[12px] h-[12px] bg-black rounded-full relative shadow-sm">
              <div className="absolute top-0.5 right-0.5 w-1 h-1 bg-white/90 rounded-full" />
            </div>
          </div>

          {/* Mouth: SOLID BLACK CIRCLE */}
          <div
            ref={c1MouthRef}
            className="mt-3.5 w-3.5 h-3.5 bg-black rounded-full shadow-sm will-change-transform"
          />
        </div>

      </div>
    </div>
  );
};
