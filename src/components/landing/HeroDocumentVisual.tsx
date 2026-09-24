import React from 'react';

/**
 * HeroDocumentVisual
 * A pure, minimalist monochrome physical document centerpiece.
 * Features an opaque, solid dark document silhouette with tactile micro-texture and folded corner.
 * A hidden elongated light band (soft strip/beam) moves in 3D space behind the opaque document,
 * casting a soft directional atmospheric edge spill and illuminating the physical material surface,
 * wireframes, and fold geometry without ever exposing raw light sources through the document.
 */
export const HeroDocumentVisual: React.FC = () => {
  // SVG perimeter path coordinates (440x560 viewBox)
  const perimeterPath =
    'M 56 36 L 296 36 L 404 144 L 404 504 A 20 20 0 0 1 384 524 L 56 524 A 20 20 0 0 1 36 504 L 36 56 A 20 20 0 0 1 56 36 Z';

  // Folded corner flap geometry
  const foldFlapPath =
    'M 296 36 L 296 134 A 10 10 0 0 0 306 144 L 404 144 Z';

  return (
    <div className="relative w-full max-w-[270px] sm:max-w-[320px] lg:max-w-[352px] mx-auto select-none aspect-[440/560] flex items-center justify-center">
      {/* 1. Static Deep Floor Ambient Vignette */}
      <div
        className="absolute -inset-12 bg-radial from-white/[0.04] via-transparent to-transparent blur-3xl rounded-full pointer-events-none"
        aria-hidden="true"
      />

      {/* 2. Hidden Elongated Light Band (Moving behind the opaque document)
          CRITICAL: This is an elongated soft light strip that travels in 3D space.
          The document in front is 100% opaque, so only the soft edge spill and surface reaction are visible. */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-visible"
        aria-hidden="true"
      >
        <div className="relative flex items-center justify-center animate-hero-elongated-light pointer-events-none">
          {/* Elongated soft beam/strip: brighter in center, gradually fading to both ends */}
          <div
            className="w-[340px] h-[95px] sm:w-[400px] sm:h-[110px] rounded-full absolute"
            style={{
              background:
                'radial-gradient(ellipse 65% 50% at 50% 50%, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.22) 35%, rgba(255, 255, 255, 0.05) 70%, transparent 95%)',
              filter: 'blur(32px)',
            }}
          />
        </div>
      </div>

      {/* 3. Solid Opaque Geometric Document Centerpiece */}
      <svg
        viewBox="0 0 440 560"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full relative z-10 drop-shadow-[0_28px_56px_rgba(0,0,0,0.98)]"
        aria-hidden="true"
      >
        <defs>
          {/* Document Silhouette Clip Path - strictly confines internal surface reactions */}
          <clipPath id="hero-doc-clip">
            <path d={perimeterPath} />
          </clipPath>

          {/* Procedural High-Fidelity Micro-Texture Filter */}
          <filter id="hero-material-roughness" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves="4" result="noise" />
            <feColorMatrix
              type="matrix"
              values="1 0 0 0 1
                      0 1 0 0 1
                      0 0 1 0 1
                      0 0 0 0.16 0"
              in="noise"
              result="coloredNoise"
            />
            <feComposite operator="in" in2="SourceGraphic" />
          </filter>

          {/* Solid Opaque Document Base Material */}
          <linearGradient id="hero-opaque-base" x1="60" y1="40" x2="380" y2="520" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#17171d" />
            <stop offset="40%" stopColor="#101014" />
            <stop offset="100%" stopColor="#09090c" />
          </linearGradient>

          {/* Fold Flap Material */}
          <linearGradient id="hero-fold-base" x1="296" y1="36" x2="380" y2="144" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#25252f" />
            <stop offset="55%" stopColor="#181820" />
            <stop offset="100%" stopColor="#0d0d12" />
          </linearGradient>

          {/* Internal Wireframe Lines */}
          <linearGradient id="hero-wire-grad" x1="70" y1="0" x2="370" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(255,255,255,0.02)" />
            <stop offset="25%" stopColor="rgba(255,255,255,0.09)" />
            <stop offset="75%" stopColor="rgba(255,255,255,0.09)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
          </linearGradient>

          {/* Elongated Surface Light Beam Gradient */}
          <radialGradient id="hero-surface-beam-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.38)" />
            <stop offset="30%" stopColor="rgba(255, 255, 255, 0.18)" />
            <stop offset="65%" stopColor="rgba(255, 255, 255, 0.04)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        {/* ── 1. SOLID 100% OPAQUE BASE (Blocks rear light completely) ── */}
        <path
          d={perimeterPath}
          fill="url(#hero-opaque-base)"
          stroke="rgba(255, 255, 255, 0.12)"
          strokeWidth="1.3"
        />

        {/* ── 2. ILLUMINATED PHYSICAL SURFACE & MICRO-TEXTURE ── */}
        <g clipPath="url(#hero-doc-clip)">
          {/* Tactile Micro-Texture Grain (Revealed under moving surface illumination) */}
          <rect
            x="0"
            y="0"
            width="440"
            height="560"
            fill="#ffffff"
            filter="url(#hero-material-roughness)"
            opacity="0.85"
            className="pointer-events-none"
          />

          {/* Synchronized Elongated Moving Surface Light Beam */}
          <g className="animate-hero-surface-beam pointer-events-none">
            {/* Elongated directional beam on the document surface */}
            <ellipse
              cx="220"
              cy="280"
              rx="180"
              ry="65"
              fill="url(#hero-surface-beam-grad)"
              className="transform -rotate-12"
            />
          </g>

          {/* ── 3. Abstract Geometric Wireframe Document Content ── */}
          <g stroke="url(#hero-wire-grad)" strokeWidth="1" strokeLinecap="round" opacity="0.9">
            <line x1="72" y1="180" x2="368" y2="180" />
            <line x1="72" y1="216" x2="368" y2="216" />
            <line x1="72" y1="252" x2="368" y2="252" />
            <line x1="72" y1="288" x2="368" y2="288" />
            <line x1="72" y1="324" x2="368" y2="324" />
            <line x1="72" y1="360" x2="368" y2="360" />
            <line x1="72" y1="396" x2="368" y2="396" />
            <line x1="72" y1="432" x2="368" y2="432" />
          </g>

          {/* ── 4. Central Geometric Security Watermark ── */}
          <g transform="translate(220, 306)" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="1" fill="none">
            <circle r="60" />
            <circle r="42" strokeDasharray="3 4" />
            <polygon points="0,-28 24,14 -24,14" />
            <polygon points="0,28 24,-14 -24,-14" />
          </g>

          {/* ── 5. Precision Registration Micro-Crosshairs ── */}
          <g stroke="rgba(255, 255, 255, 0.22)" strokeWidth="1">
            {/* Top Left */}
            <line x1="68" y1="76" x2="76" y2="76" />
            <line x1="72" y1="72" x2="72" y2="80" />

            {/* Bottom Left */}
            <line x1="68" y1="480" x2="76" y2="480" />
            <line x1="72" y1="476" x2="72" y2="484" />

            {/* Bottom Right */}
            <line x1="364" y1="480" x2="372" y2="480" />
            <line x1="368" y1="476" x2="368" y2="484" />
          </g>
        </g>

        {/* ── 6. Dimensioned Folded Corner Geometry ── */}
        {/* Fold Flap Shadow */}
        <path
          d="M 296 36 L 296 144 L 404 144 Z"
          fill="rgba(0, 0, 0, 0.8)"
          filter="blur(6px)"
        />

        {/* Fold Flap Solid Body */}
        <path
          d={foldFlapPath}
          fill="url(#hero-fold-base)"
          stroke="rgba(255, 255, 255, 0.20)"
          strokeWidth="1.3"
        />

        {/* Fold Diagonal Crease Line */}
        <line
          x1="296"
          y1="36"
          x2="404"
          y2="144"
          stroke="rgba(255, 255, 255, 0.32)"
          strokeWidth="1.4"
        />

        {/* Fold Specular Highlight (Blooms when light traverses top-right) */}
        <path
          d={foldFlapPath}
          fill="none"
          stroke="rgba(255, 255, 255, 0.65)"
          strokeWidth="1.6"
          className="animate-hero-fold-highlight pointer-events-none"
        />
      </svg>
    </div>
  );
};
