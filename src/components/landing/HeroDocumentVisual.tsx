import React from 'react';

/**
 * HeroDocumentVisual
 * A pure, minimalist monochrome physical document centerpiece.
 *
 * Visual hierarchy:
 * 1. Deep Floor Ambient Vignette (Background)
 * 2. Glowing Elliptical Ring (White luminous tilted stationary ellipse with traveling highlight)
 * 3. Solid Opaque Document (100% opaque near-black physical object with dimensional fold)
 * 4. Subtle Document Edge (Micro-rim highlight)
 *
 * Completely eliminates any rear-light/beam/orb and surface translucency.
 * The document physically occludes the ring so it passes seamlessly behind it.
 */
export const HeroDocumentVisual: React.FC = () => {
  // SVG perimeter path coordinates (440x560 viewBox)
  const perimeterPath =
    'M 56 36 L 296 36 L 404 144 L 404 504 A 20 20 0 0 1 384 524 L 56 524 A 20 20 0 0 1 36 504 L 36 56 A 20 20 0 0 1 56 36 Z';

  // Folded corner flap geometry
  const foldFlapPath =
    'M 296 36 L 296 134 A 10 10 0 0 0 306 144 L 404 144 Z';

  return (
    <div className="relative w-full max-w-[270px] sm:max-w-[320px] lg:max-w-[352px] mx-auto select-none aspect-[440/560] flex items-center justify-center bg-transparent">
      {/* ── 2. Glowing Elliptical White Light Ring — BACK LAYER (z-0) ──
          Stationary ellipse tilted in 3D perspective, substantially enlarged (rx=370, ry=180).
          Renders the upper rear sweep behind the opaque document.
          Clipped along the 3D tilt horizon with infinite coordinate bounds to avoid any visible container box. */}
      <svg
        viewBox="0 0 440 560"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full absolute inset-0 overflow-visible pointer-events-none z-0"
        aria-hidden="true"
      >
        <defs>
          {/* Back half clipping polygon: covers the rear/upper arc above the 3D perspective horizon with vast bounds */}
          <clipPath id="hero-back-ring-clip">
            <polygon points="-2500,-2500 2500,-2500 2500,-603 -2500,1314" />
          </clipPath>

          {/* Blurred outer halo with generous filter bounds */}
          <filter id="hero-ring-halo" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="34" />
          </filter>
          {/* Diffuse glow */}
          <filter id="hero-ring-glow-wide" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="16" />
          </filter>
          {/* Soft mid glow */}
          <filter id="hero-ring-glow-mid" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
          {/* Bright core bloom */}
          <filter id="hero-highlight-core-bloom" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.4" />
          </filter>
        </defs>

        {/* ── Back Ring Group (Clipped to rear sweep) ── */}
        <g clipPath="url(#hero-back-ring-clip)">
          {/* Stationary Base Ring (Visible around/behind the document) */}
          <g opacity="0.95">
            {/* 1. Outer glow: thick, soft, blurred atmospheric falloff */}
            <ellipse
              cx="220"
              cy="270"
              rx="370"
              ry="180"
              transform="rotate(-21 220 270)"
              stroke="#ffffff"
              strokeWidth="36"
              opacity="0.06"
              filter="url(#hero-ring-halo)"
            />
            <ellipse
              cx="220"
              cy="270"
              rx="370"
              ry="180"
              transform="rotate(-21 220 270)"
              stroke="#ffffff"
              strokeWidth="16"
              opacity="0.12"
              filter="url(#hero-ring-glow-wide)"
            />
            {/* 2. Middle glow: noticeably thicker, brighter */}
            <ellipse
              cx="220"
              cy="270"
              rx="370"
              ry="180"
              transform="rotate(-21 220 270)"
              stroke="#ffffff"
              strokeWidth="6.5"
              opacity="0.28"
              filter="url(#hero-ring-glow-mid)"
            />
            {/* 3. Inner ring: clearly visible, thicker than previous version */}
            <ellipse
              cx="220"
              cy="270"
              rx="370"
              ry="180"
              transform="rotate(-21 220 270)"
              stroke="#ffffff"
              strokeWidth="2.8"
              opacity="0.55"
            />
            <ellipse
              cx="220"
              cy="270"
              rx="370"
              ry="180"
              transform="rotate(-21 220 270)"
              stroke="#ffffff"
              strokeWidth="1.3"
              opacity="0.75"
            />
          </g>

          {/* ── Luminous Traveling Section (✦) across rear sweep ── */}
          <g className="animate-ring-bloom-sync">
            {/* Wide traveling atmospheric bloom */}
            <ellipse
              cx="220"
              cy="270"
              rx="370"
              ry="180"
              transform="rotate(-21 220 270)"
              stroke="#ffffff"
              strokeWidth="54"
              strokeLinecap="round"
              pathLength="1000"
              opacity="0.32"
              filter="url(#hero-ring-halo)"
              className="animate-ring-highlight-wide"
            />
            {/* Mid traveling glow */}
            <ellipse
              cx="220"
              cy="270"
              rx="370"
              ry="180"
              transform="rotate(-21 220 270)"
              stroke="#ffffff"
              strokeWidth="26"
              strokeLinecap="round"
              pathLength="1000"
              opacity="0.55"
              filter="url(#hero-ring-glow-wide)"
              className="animate-ring-highlight-mid"
            />
            {/* Soft traveling inner bloom */}
            <ellipse
              cx="220"
              cy="270"
              rx="370"
              ry="180"
              transform="rotate(-21 220 270)"
              stroke="#ffffff"
              strokeWidth="10"
              strokeLinecap="round"
              pathLength="1000"
              opacity="0.85"
              filter="url(#hero-ring-glow-mid)"
              className="animate-ring-highlight-soft"
            />
            {/* Intense defined bright traveling core */}
            <ellipse
              cx="220"
              cy="270"
              rx="370"
              ry="180"
              transform="rotate(-21 220 270)"
              stroke="#ffffff"
              strokeWidth="3.8"
              strokeLinecap="round"
              pathLength="1000"
              opacity="1.0"
              filter="url(#hero-highlight-core-bloom)"
              className="animate-ring-highlight-core"
            />
          </g>
        </g>
      </svg>

      {/* ── 3. Solid Opaque Geometric Document Centerpiece (z-10) ──
          Completely blocks all light from behind. No translucency. No rear beam shines through. */}
      <svg
        viewBox="0 0 440 560"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full relative z-10 drop-shadow-[0_28px_64px_rgba(0,0,0,0.98)]"
        aria-hidden="true"
      >
        <defs>
          {/* Solid 100% Opaque Document Base Material (#111114 -> #0C0C0E -> #09090B) */}
          <linearGradient id="hero-doc-solid-base" x1="60" y1="40" x2="380" y2="520" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#141418" />
            <stop offset="45%" stopColor="#0e0e12" />
            <stop offset="100%" stopColor="#09090b" />
          </linearGradient>

          {/* Fold Flap Material */}
          <linearGradient id="hero-fold-solid-base" x1="296" y1="36" x2="380" y2="144" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1e1e26" />
            <stop offset="55%" stopColor="#131318" />
            <stop offset="100%" stopColor="#0b0b0e" />
          </linearGradient>

          {/* Internal Wireframe Lines */}
          <linearGradient id="hero-wire-grad" x1="70" y1="0" x2="370" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(255,255,255,0.015)" />
            <stop offset="25%" stopColor="rgba(255,255,255,0.065)" />
            <stop offset="75%" stopColor="rgba(255,255,255,0.065)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.015)" />
          </linearGradient>
        </defs>

        {/* ── A. SOLID 100% OPAQUE BASE (Occludes the ring completely) ── */}
        <path
          d={perimeterPath}
          fill="url(#hero-doc-solid-base)"
          stroke="rgba(255, 255, 255, 0.11)"
          strokeWidth="1.3"
        />

        {/* ── B. Precision Geometric Wireframe Document Content ── */}
        <g stroke="url(#hero-wire-grad)" strokeWidth="1" strokeLinecap="round" opacity="0.95">
          <line x1="72" y1="180" x2="368" y2="180" />
          <line x1="72" y1="216" x2="368" y2="216" />
          <line x1="72" y1="252" x2="368" y2="252" />
          <line x1="72" y1="288" x2="368" y2="288" />
          <line x1="72" y1="324" x2="368" y2="324" />
          <line x1="72" y1="360" x2="368" y2="360" />
          <line x1="72" y1="396" x2="368" y2="396" />
          <line x1="72" y1="432" x2="368" y2="432" />
        </g>

        {/* ── C. Central Geometric Security Watermark ── */}
        <g transform="translate(220, 306)" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1" fill="none">
          <circle r="60" />
          <circle r="42" strokeDasharray="3 4" />
          <polygon points="0,-28 24,14 -24,14" />
          <polygon points="0,28 24,-14 -24,-14" />
        </g>

        {/* ── D. Precision Registration Micro-Crosshairs ── */}
        <g stroke="rgba(255, 255, 255, 0.18)" strokeWidth="1">
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

        {/* ── E. Physical Folded Corner Geometry ── */}
        {/* Fold Flap Shadow */}
        <path
          d="M 296 36 L 296 144 L 404 144 Z"
          fill="rgba(0, 0, 0, 0.88)"
          filter="blur(5px)"
        />

        {/* Fold Flap Solid Body */}
        <path
          d={foldFlapPath}
          fill="url(#hero-fold-solid-base)"
          stroke="rgba(255, 255, 255, 0.18)"
          strokeWidth="1.3"
        />

        {/* Fold Diagonal Crease Line */}
        <line
          x1="296"
          y1="36"
          x2="404"
          y2="144"
          stroke="rgba(255, 255, 255, 0.28)"
          strokeWidth="1.3"
        />
      </svg>

      {/* ── 4. Glowing Elliptical White Light Ring — FRONT ARC SEGMENT (z-20) ──
          Passes IN FRONT of the document to establish true 3D spatial enclosure:
          BACK RING (z-0) ──► DOCUMENT (z-10) ──► FRONT RING SEGMENT (z-20).
          Clipped along the 3D perspective horizon line: passes unbroken across the lower front of the document.
          Generous breathing room (~167px clearance on both sides) ensures the document sits comfortably inside the ring. */}
      <svg
        viewBox="0 0 440 560"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full absolute inset-0 overflow-visible pointer-events-none z-20"
        aria-hidden="true"
      >
        <defs>
          {/* Front arc clipping polygon: covers the lower front sweep below the 3D perspective horizon with vast bounds */}
          <clipPath id="hero-front-ring-clip">
            <polygon points="-2500,1310 2500,-607 2500,2500 -2500,2500" />
          </clipPath>

          {/* Front-layer glow filters with generous filter bounds */}
          <filter id="hero-front-ring-halo" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="34" />
          </filter>
          <filter id="hero-front-ring-glow-wide" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="16" />
          </filter>
          <filter id="hero-front-ring-glow-mid" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
          <filter id="hero-front-highlight-core" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.4" />
          </filter>
        </defs>

        {/* Clipped Front Ring Segment Group */}
        <g clipPath="url(#hero-front-ring-clip)">
          {/* Base stationary front ring strokes */}
          <g opacity="0.95">
            {/* Diffuse glow layer */}
            <ellipse
              cx="220"
              cy="270"
              rx="370"
              ry="180"
              transform="rotate(-21 220 270)"
              stroke="#ffffff"
              strokeWidth="16"
              opacity="0.14"
              filter="url(#hero-front-ring-glow-wide)"
            />
            {/* Middle luminous body */}
            <ellipse
              cx="220"
              cy="270"
              rx="370"
              ry="180"
              transform="rotate(-21 220 270)"
              stroke="#ffffff"
              strokeWidth="6.5"
              opacity="0.32"
              filter="url(#hero-front-ring-glow-mid)"
            />
            {/* Main visible ring */}
            <ellipse
              cx="220"
              cy="270"
              rx="370"
              ry="180"
              transform="rotate(-21 220 270)"
              stroke="#ffffff"
              strokeWidth="2.8"
              opacity="0.70"
            />
            {/* Crisp inner edge */}
            <ellipse
              cx="220"
              cy="270"
              rx="370"
              ry="180"
              transform="rotate(-21 220 270)"
              stroke="#ffffff"
              strokeWidth="1.3"
              opacity="0.90"
            />
          </g>

          {/* Synchronized Traveling Highlight across front arc */}
          <g className="animate-ring-bloom-sync">
            {/* Wide traveling atmospheric bloom */}
            <ellipse
              cx="220"
              cy="270"
              rx="370"
              ry="180"
              transform="rotate(-21 220 270)"
              stroke="#ffffff"
              strokeWidth="54"
              strokeLinecap="round"
              pathLength="1000"
              opacity="0.32"
              filter="url(#hero-front-ring-halo)"
              className="animate-ring-highlight-wide"
            />
            {/* Mid traveling glow */}
            <ellipse
              cx="220"
              cy="270"
              rx="370"
              ry="180"
              transform="rotate(-21 220 270)"
              stroke="#ffffff"
              strokeWidth="26"
              strokeLinecap="round"
              pathLength="1000"
              opacity="0.55"
              filter="url(#hero-front-ring-glow-wide)"
              className="animate-ring-highlight-mid"
            />
            {/* Soft traveling inner bloom */}
            <ellipse
              cx="220"
              cy="270"
              rx="370"
              ry="180"
              transform="rotate(-21 220 270)"
              stroke="#ffffff"
              strokeWidth="10"
              strokeLinecap="round"
              pathLength="1000"
              opacity="0.85"
              filter="url(#hero-front-ring-glow-mid)"
              className="animate-ring-highlight-soft"
            />
            {/* Intense defined bright traveling core */}
            <ellipse
              cx="220"
              cy="270"
              rx="370"
              ry="180"
              transform="rotate(-21 220 270)"
              stroke="#ffffff"
              strokeWidth="3.8"
              strokeLinecap="round"
              pathLength="1000"
              opacity="1.0"
              filter="url(#hero-front-highlight-core)"
              className="animate-ring-highlight-core"
            />
          </g>
        </g>
      </svg>
    </div>
  );
};