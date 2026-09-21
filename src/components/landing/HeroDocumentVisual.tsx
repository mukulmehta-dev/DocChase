import React from 'react';

/**
 * HeroDocumentVisual
 * A pure, minimalist monochrome document centerpiece.
 * Features an iconic solid dark document silhouette with a geometric folded corner,
 * illuminated by a distinct, luminous volumetric light source (radiant core + diffuse halo)
 * moving organically behind and around the document with realistic physical occlusion.
 */
export const HeroDocumentVisual: React.FC = () => {
  // SVG perimeter path coordinates (440x560 viewBox)
  const perimeterPath =
    'M 56 36 L 296 36 L 404 144 L 404 504 A 20 20 0 0 1 384 524 L 56 524 A 20 20 0 0 1 36 504 L 36 56 A 20 20 0 0 1 56 36 Z';

  // Folded corner flap geometry
  const foldFlapPath =
    'M 296 36 L 296 134 A 10 10 0 0 0 306 144 L 404 144 Z';

  return (
    <div className="relative w-full max-w-[340px] sm:max-w-[400px] lg:max-w-[440px] mx-auto select-none aspect-[440/560]">
      {/* 1. Static Deep Floor Ambient Vignette */}
      <div
        className="absolute -inset-10 bg-radial from-white/[0.04] via-transparent to-transparent blur-3xl rounded-full pointer-events-none"
        aria-hidden="true"
      />

      {/* 2. Volumetric Spatial Light Source (Behind Document) */}
      {/* Composed of a radiant bright core + broad atmospheric halo moving on a 3D-like orbital path */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-visible"
        aria-hidden="true"
      >
        <div className="relative flex items-center justify-center animate-spatial-light pointer-events-none">
          {/* 2A. Broad Atmospheric Diffuse Halo */}
          <div
            className="w-[320px] h-[320px] sm:w-[380px] sm:h-[380px] rounded-full absolute"
            style={{
              background:
                'radial-gradient(circle, rgba(255, 255, 255, 0.38) 0%, rgba(255, 255, 255, 0.16) 36%, rgba(255, 255, 255, 0.03) 68%, transparent 82%)',
              filter: 'blur(30px)',
            }}
          />

          {/* 2B. Concentrated Radiant White Core */}
          <div
            className="w-[100px] h-[100px] sm:w-[120px] sm:h-[120px] rounded-full relative"
            style={{
              background:
                'radial-gradient(circle, rgba(255, 255, 255, 0.98) 0%, rgba(255, 255, 255, 0.75) 28%, rgba(255, 255, 255, 0.25) 58%, transparent 75%)',
              filter: 'blur(10px)',
            }}
          />
        </div>
      </div>

      {/* 3. Solid Geometric Document Centerpiece (Occludes the rear light) */}
      <svg
        viewBox="0 0 440 560"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full relative z-10 drop-shadow-[0_24px_48px_rgba(0,0,0,0.85)]"
        aria-hidden="true"
      >
        <defs>
          {/* Document Body Gradient - Opaque Solid Surface */}
          <linearGradient id="doc-body-gradient" x1="50" y1="40" x2="390" y2="520" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#141418" />
            <stop offset="50%" stopColor="#0d0d10" />
            <stop offset="100%" stopColor="#08080a" />
          </linearGradient>

          {/* Fold Flap Gradient */}
          <linearGradient id="doc-fold-gradient" x1="296" y1="36" x2="380" y2="144" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#22222a" />
            <stop offset="60%" stopColor="#16161b" />
            <stop offset="100%" stopColor="#0f0f13" />
          </linearGradient>

          {/* Subtle Document Wireframe Line Gradient */}
          <linearGradient id="doc-line-gradient" x1="70" y1="0" x2="370" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(255,255,255,0.01)" />
            <stop offset="20%" stopColor="rgba(255,255,255,0.05)" />
            <stop offset="80%" stopColor="rgba(255,255,255,0.05)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.01)" />
          </linearGradient>

          {/* Localized Fold Specular Glint (Top-Right Notch) */}
          <radialGradient id="doc-fold-glint" cx="80%" cy="18%" r="28%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.60)" />
            <stop offset="45%" stopColor="rgba(255, 255, 255, 0.15)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

          {/* Localized Lower-Left Specular Glint */}
          <radialGradient id="doc-lower-glint" cx="15%" cy="82%" r="28%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.45)" />
            <stop offset="45%" stopColor="rgba(255, 255, 255, 0.12)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        {/* 1. Document Base Solid Silhouette (Completely opaque to occlude rear light) */}
        <path
          d={perimeterPath}
          fill="url(#doc-body-gradient)"
          stroke="rgba(255, 255, 255, 0.10)"
          strokeWidth="1.5"
        />

        {/* 2. Abstract Geometric Wireframe Lines */}
        <g stroke="url(#doc-line-gradient)" strokeWidth="1" strokeLinecap="round" opacity="0.8">
          <line x1="72" y1="180" x2="368" y2="180" />
          <line x1="72" y1="216" x2="368" y2="216" />
          <line x1="72" y1="252" x2="368" y2="252" />
          <line x1="72" y1="288" x2="368" y2="288" />
          <line x1="72" y1="324" x2="368" y2="324" />
          <line x1="72" y1="360" x2="368" y2="360" />
          <line x1="72" y1="396" x2="368" y2="396" />
          <line x1="72" y1="432" x2="368" y2="432" />
        </g>

        {/* 3. Central Geometric Security Watermark */}
        <g transform="translate(220, 306)" stroke="rgba(255, 255, 255, 0.035)" strokeWidth="1" fill="none">
          <circle r="60" />
          <circle r="42" strokeDasharray="3 4" />
          <polygon points="0,-28 24,14 -24,14" />
          <polygon points="0,28 24,-14 -24,-14" />
        </g>

        {/* 4. Precision Registration Micro-Crosshairs */}
        <g stroke="rgba(255, 255, 255, 0.18)" strokeWidth="1">
          {/* Top Left Crosshair */}
          <line x1="68" y1="76" x2="76" y2="76" />
          <line x1="72" y1="72" x2="72" y2="80" />

          {/* Bottom Left Crosshair */}
          <line x1="68" y1="480" x2="76" y2="480" />
          <line x1="72" y1="476" x2="72" y2="484" />

          {/* Bottom Right Crosshair */}
          <line x1="364" y1="480" x2="372" y2="480" />
          <line x1="368" y1="476" x2="368" y2="484" />
        </g>

        {/* 5. Dimensioned Folded Corner Geometry */}
        {/* Fold Flap Shadow */}
        <path
          d="M 296 36 L 296 144 L 404 144 Z"
          fill="rgba(0, 0, 0, 0.6)"
          filter="blur(4px)"
        />

        {/* Fold Flap Body */}
        <path
          d={foldFlapPath}
          fill="url(#doc-fold-gradient)"
          stroke="rgba(255, 255, 255, 0.18)"
          strokeWidth="1.2"
        />

        {/* Fold Diagonal Crease */}
        <line
          x1="296"
          y1="36"
          x2="404"
          y2="144"
          stroke="rgba(255, 255, 255, 0.28)"
          strokeWidth="1.5"
        />

        {/* 6. Localized Specular Edge Reactions (Non-tracing glints) */}
        {/* Top-Right Fold Notch Glint */}
        <path
          d={perimeterPath}
          fill="none"
          stroke="url(#doc-fold-glint)"
          strokeWidth="1.8"
          className="animate-fold-glint pointer-events-none"
        />

        {/* Lower-Left Margin Glint */}
        <path
          d={perimeterPath}
          fill="none"
          stroke="url(#doc-lower-glint)"
          strokeWidth="1.8"
          className="animate-lower-glint pointer-events-none"
        />
      </svg>
    </div>
  );
};
