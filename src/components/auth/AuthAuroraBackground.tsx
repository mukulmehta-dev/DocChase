import React, { useEffect, useRef } from 'react';

/**
 * AuthAuroraBackground
 * 
 * High-Density Underwater Sunlight & Caustic Light Field
 * 
 * Visual Architecture:
 * 1. Dual-Axis Motion:
 *    - Vertical Descent: Light streams enter from the TOP (water surface) and travel downward,
 *      stretching, bending, and progressively diffusing into deep abyssal dark water.
 *    - Lateral Wave Drift: An undulating horizontal swell (LEFT <-> RIGHT) combined with traveling
 *      wave packets causes the entire caustic structure and individual strands to continuously drift,
 *      sweep sideways, and shimmer organically.
 * 2. Light Structure:
 *    - 15–25 narrow, elongated primary and secondary light strands of varying widths, speeds, and intensities.
 *    - Multi-scale nonlinear wave distortion: strands bend in organic S-curves, widen, narrow, split, and merge.
 * 3. Caustic Shimmer & White Highlights:
 *    - High-order caustic lines that reach brilliant cool white / blue-white at their sharp focal peaks.
 *    - Shimmering transition: bright -> soft glow -> thin bright streak -> diffuse glow -> dark -> streak.
 * 4. Multi-Layer Depth:
 *    - Background: deep slow-moving oceanic haze and wide diffuse rays.
 *    - Midground: primary undulating caustic curtains and drifting strands.
 *    - Foreground: sharp, fast-shimmering white/cyan caustic filaments.
 * 5. Full viewport coverage, zero horizontal ribbons, zero floating blobs.
 * 6. 100% compliant with prefers-reduced-motion (renders a static balanced caustic composition).
 */
export const AuthAuroraBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animationFrameId: number;
    let isDestroyed = false;

    // Prefers-reduced-motion listener
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let prefersReducedMotion = mediaQuery.matches;

    // Try WebGL
    const gl =
      canvas.getContext('webgl', { alpha: false, depth: false, antialias: true }) ||
      (canvas.getContext('experimental-webgl', { alpha: false, depth: false }) as WebGLRenderingContext | null);

    if (gl) {
      // ════════════════════════════════════════════════════════════════════════
      // WEBGL VOLUMETRIC HIGH-DENSITY UNDERWATER CAUSTIC SHADER
      // ════════════════════════════════════════════════════════════════════════

      const vsSource = `
        attribute vec2 position;
        void main() {
          gl_Position = vec4(position, 0.0, 1.0);
        }
      `;

      const fsSource = `
        precision highp float;
        uniform vec2 u_resolution;
        uniform float u_time;

        // Smooth procedural hash
        float hash(vec2 p) {
          p = fract(p * vec2(127.1, 311.7));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
        }

        // 2D Noise
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
            mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
            u.y
          );
        }

        // 4-octave Fractional Brownian Motion for fluid turbidity
        float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          mat2 rot = mat2(0.866, 0.500, -0.500, 0.866);
          for (int i = 0; i < 4; i++) {
            v += a * noise(p);
            p = rot * p * 2.04 + vec2(1.7, 0.9);
            a *= 0.5;
          }
          return v;
        }

        void main() {
          // Normalized UV: (0,0) bottom-left, (1,1) top-right
          vec2 uv = gl_FragCoord.xy / u_resolution.xy;
          float aspect = u_resolution.x / u_resolution.y;

          // Normalized coordinates: x centered with aspect ratio, y: 0.0 (bottom abyss) -> 1.0 (top surface)
          float x = (uv.x - 0.5) * aspect;
          float y = uv.y;
          float depth = 1.0 - y; // 0.0 at surface, 1.0 at deep bottom

          // Organic time scales
          float t = u_time * 0.075;

          // ── 1. HORIZONTAL / LATERAL WAVE DRIFT (SWELL & TRAVEL) ──
          // Broad horizontal swell oscillating left <-> right
          float swell = sin(t * 0.35) * 0.28 + sin(t * 0.18 + 2.1) * 0.16;

          // Lateral wave drift traversing the scene
          float driftA = t * 0.22;
          float driftB = -t * 0.17;
          float driftFast = t * 0.45;

          // ── 2. NONLINEAR SURFACE REFRACTION & DOWNWARD WARPING ──
          // Moving water surface wave perturbation propagating downward with depth delay
          float w1 = sin(x * 3.8 + t * 0.85 + depth * 1.6) * 0.075;
          float w2 = cos(x * 7.5 - t * 0.65 + depth * 2.4) * 0.045;
          float w3 = sin(x * 15.0 + t * 1.15 + depth * 4.2) * 0.022;
          float surfDistort = w1 + w2 + w3;

          // Organic vertical fluid displacement stretching downward
          vec2 flowUV = vec2(x * 1.6 + surfDistort + swell * 0.4, y * 0.6 - t * 0.25);
          float turb = fbm(flowUV);
          float warpX = surfDistort * 1.5 + (turb - 0.5) * 0.28 * (0.3 + 0.7 * y);

          // ── 3. MULTI-LAYER LIGHT STRUCTURE (15-25 NARROW STRANDS) ──
          // Ray coordinates with independent horizontal drift and depth-dependent bending
          float rx1 = x + swell * 0.45 + warpX - (depth - 0.5) * 0.14 + driftA;
          float rx2 = x - swell * 0.35 + warpX * 1.3 + (depth - 0.5) * 0.18 + driftB;
          float rx3 = x + swell * 0.75 + warpX * 1.8 + driftFast;

          // ── LAYER A: Mid-Density Primary Curtains (~7-8 narrow strands) ──
          float strandsA = 0.0;
          float sA1 = sin(rx1 * 9.5) * 0.5 + 0.5;
          sA1 = pow(sA1, 4.5);
          float sA2 = sin(rx1 * 13.5 + 1.7) * 0.5 + 0.5;
          sA2 = pow(sA2, 5.0);
          float sA3 = cos(rx1 * 7.0 - 0.9) * 0.5 + 0.5;
          sA3 = pow(sA3, 3.8);
          // Modulate with traveling lateral envelope to create grouping & separation
          float envA = sin(x * 2.8 + driftA * 1.2) * 0.4 + 0.6;
          strandsA = (sA1 * 0.45 + sA2 * 0.35 + sA3 * 0.30) * envA;

          // ── LAYER B: Interleaved Angled Secondary Strands (~8-10 narrow strands) ──
          float strandsB = 0.0;
          float sB1 = sin(rx2 * 11.5 + 2.4) * 0.5 + 0.5;
          sB1 = pow(sB1, 5.0);
          float sB2 = sin(rx2 * 17.0 - 1.2) * 0.5 + 0.5;
          sB2 = pow(sB2, 6.0);
          float sB3 = cos(rx2 * 8.5 + 3.1) * 0.5 + 0.5;
          sB3 = pow(sB3, 4.2);
          float envB = cos(x * 3.4 + driftB * 1.4) * 0.45 + 0.55;
          strandsB = (sB1 * 0.40 + sB2 * 0.38 + sB3 * 0.32) * envB;

          // ── LAYER C: High-Frequency Shimmering Filaments (~10-12 thin bright strands) ──
          float strandsC = 0.0;
          float sC1 = sin(rx3 * 22.0 + 0.5) * 0.5 + 0.5;
          sC1 = pow(sC1, 8.0);
          float sC2 = sin(rx3 * 29.0 + 3.8) * 0.5 + 0.5;
          sC2 = pow(sC2, 10.0);
          float sC3 = cos(rx3 * 18.0 - 2.1) * 0.5 + 0.5;
          sC3 = pow(sC3, 7.5);
          float envC = sin(x * 4.2 + driftFast * 0.8) * 0.5 + 0.5;
          strandsC = (sC1 * 0.45 + sC2 * 0.40 + sC3 * 0.35) * envC;

          // ── 4. SHARP FOCAL CAUSTIC PEAKS (BRILLIANT WHITE HIGHLIGHTS) ──
          // Razor-sharp caustic focal lines that flash and sweep sideways
          float causticLine1 = pow(sin((x + swell * 0.6 + warpX * 2.2) * 26.0 + t * 0.65) * 0.5 + 0.5, 18.0);
          float causticLine2 = pow(sin((x - swell * 0.5 + warpX * 2.6 - depth * 0.22) * 34.0 - t * 0.55 + 2.5) * 0.5 + 0.5, 22.0);
          float causticPeaks = (causticLine1 * 0.65 + causticLine2 * 0.55);

          // Soft volumetric 2D caustic modulation network
          vec2 cUV = vec2(x * 9.0 + warpX * 2.8 + driftA * 0.5, y * 2.4 + t * 0.22);
          float cM1 = sin(cUV.x * 2.5 + t * 0.6) * sin(cUV.y * 2.0 - t * 0.4);
          float cM2 = cos(cUV.x * 4.5 - t * 0.45 + cM1 * 1.6) * sin(cUV.y * 3.0 + t * 0.32);
          float softCaustics = pow(abs(cM1 + cM2) * 0.5, 2.4);

          // ── 5. VERTICAL ATTENUATION (TOP SUNLIGHT -> BOTTOM ABYSS) ──
          // Top: bright sunlight entering water surface
          // Middle: bending light curtains and visible rays
          // Lower: soft diffuse haze
          // Bottom: deep darkness
          float topGlow = pow(y, 1.6) * 1.45;
          float midFalloff = pow(y, 1.25) * 0.85 + 0.12;
          float rayPower = (strandsA * 0.55 + strandsB * 0.50 + strandsC * 0.38) * midFalloff;

          // ── 6. COLOR PALETTE: DARK UNDERWATER + WHITE/CYAN SUNLIGHT ──
          // Deep abyss base (near-black, deep navy)
          vec3 cAbyss    = vec3(0.006, 0.012, 0.026);
          vec3 cDeepNavy = vec3(0.012, 0.035, 0.075);
          vec3 cOceanBlue= vec3(0.025, 0.120, 0.250);
          vec3 cDeepTeal = vec3(0.040, 0.300, 0.400);
          vec3 cPaleCyan = vec3(0.180, 0.650, 0.820);
          vec3 cCoolWhite= vec3(0.920, 0.980, 1.000); // Brilliant sunlight caustic focus

          // Background base gradient
          vec3 col = mix(cAbyss, cDeepNavy, smoothstep(0.0, 0.85, y));

          // Ambient fluid depth
          col = mix(col, cOceanBlue, turb * 0.6 * y);

          // Add midground caustic rays (teal and pale cyan)
          col += cDeepTeal * rayPower * 1.25;
          col += cPaleCyan * pow(rayPower, 1.4) * (0.4 + 0.6 * topGlow) * 0.85;

          // Add shimmering foreground filaments
          col += cPaleCyan * strandsC * topGlow * 0.45;

          // Add soft caustic web
          col += cPaleCyan * softCaustics * topGlow * 0.25;

          // Add BRILLIANT WHITE caustic focal lines (sweeping across the screen)
          col += cCoolWhite * causticPeaks * topGlow * 0.75;
          col += cCoolWhite * pow(strandsA + strandsB, 3.0) * topGlow * 0.22;

          // Top water surface luminous crest
          float surfaceCrest = smoothstep(0.70, 1.0, y);
          col += cPaleCyan * surfaceCrest * (0.35 + 0.25 * sin(x * 5.0 + t * 0.7));
          col += cCoolWhite * pow(surfaceCrest, 3.0) * 0.35;

          // Peripheral subtle vignette to ensure no harsh viewport cutoffs
          float edgeVig = smoothstep(0.0, 0.12, uv.x) * smoothstep(1.0, 0.88, uv.x) *
                          smoothstep(0.0, 0.10, uv.y);
          col = mix(cAbyss, col, 0.85 + 0.15 * edgeVig);

          gl_FragColor = vec4(col, 1.0);
        }
      `;

      const createShader = (type: number, src: string) => {
        const shader = gl.createShader(type);
        if (!shader) return null;
        gl.shaderSource(shader, src);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          console.error(gl.getShaderInfoLog(shader));
          gl.deleteShader(shader);
          return null;
        }
        return shader;
      };

      const vs = createShader(gl.VERTEX_SHADER, vsSource);
      const fs = createShader(gl.FRAGMENT_SHADER, fsSource);
      if (!vs || !fs) return;

      const program = gl.createProgram();
      if (!program) return;
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
        return;
      }

      gl.useProgram(program);

      // Quad covering viewport
      const posBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW
      );

      const posAttrib = gl.getAttribLocation(program, 'position');
      gl.enableVertexAttribArray(posAttrib);
      gl.vertexAttribPointer(posAttrib, 2, gl.FLOAT, false, 0, 0);

      const uRes = gl.getUniformLocation(program, 'u_resolution');
      const uTime = gl.getUniformLocation(program, 'u_time');

      let width = 0;
      let height = 0;

      const handleResize = () => {
        const parent = canvas.parentElement;
        if (!parent) return;

        const rect = parent.getBoundingClientRect();
        width = Math.max(320, rect.width);
        height = Math.max(480, rect.height);

        // Optimal DPR for fluid 60fps and volumetric softness
        const dpr = Math.min(1.5, window.devicePixelRatio || 1);
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(uRes, canvas.width, canvas.height);

        if (prefersReducedMotion) {
          gl.uniform1f(uTime, 12.0);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
      };

      const resizeObserver = new ResizeObserver(() => handleResize());
      if (canvas.parentElement) {
        resizeObserver.observe(canvas.parentElement);
      }
      handleResize();

      let startTime = performance.now();

      const renderLoop = (now: number) => {
        if (isDestroyed) return;

        const elapsed = (now - startTime) * 0.001;
        gl.uniform1f(uTime, elapsed);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        if (!prefersReducedMotion) {
          animationFrameId = requestAnimationFrame(renderLoop);
        }
      };

      const handleMediaChange = (e: MediaQueryListEvent) => {
        prefersReducedMotion = e.matches;
        if (prefersReducedMotion) {
          cancelAnimationFrame(animationFrameId);
          gl.uniform1f(uTime, 12.0);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
        } else {
          startTime = performance.now();
          animationFrameId = requestAnimationFrame(renderLoop);
        }
      };

      mediaQuery.addEventListener('change', handleMediaChange);

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(renderLoop);
      } else {
        gl.uniform1f(uTime, 12.0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      return () => {
        isDestroyed = true;
        cancelAnimationFrame(animationFrameId);
        resizeObserver.disconnect();
        mediaQuery.removeEventListener('change', handleMediaChange);
        gl.deleteProgram(program);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        gl.deleteBuffer(posBuffer);
      };
    } else {
      // ════════════════════════════════════════════════════════════════════════
      // CANVAS 2D PROCEDURAL FALLBACK (IF WEBGL UNAVAILABLE)
      // ════════════════════════════════════════════════════════════════════════
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let width = 0;
      let height = 0;

      const handleResize = () => {
        const parent = canvas.parentElement;
        if (!parent) return;
        const rect = parent.getBoundingClientRect();
        width = Math.max(320, rect.width);
        height = Math.max(480, rect.height);
        canvas.width = width;
        canvas.height = height;
      };

      handleResize();
      const resizeObserver = new ResizeObserver(() => handleResize());
      if (canvas.parentElement) resizeObserver.observe(canvas.parentElement);

      let t = 0;
      const numStrands = 18;

      const draw2DFallback = () => {
        if (isDestroyed) return;

        // Base linear gradient: top surface lighter, bottom deep abyss
        const baseGrad = ctx.createLinearGradient(0, 0, 0, height);
        baseGrad.addColorStop(0, '#062442');
        baseGrad.addColorStop(0.35, '#04152a');
        baseGrad.addColorStop(0.70, '#020914');
        baseGrad.addColorStop(1, '#01040a');
        ctx.fillStyle = baseGrad;
        ctx.fillRect(0, 0, width, height);

        // Volumetric vertical ray strands descending from top with horizontal swell
        ctx.save();
        ctx.globalCompositeOperation = 'screen';

        const lateralSwell = Math.sin(t * 0.4) * (width * 0.08);

        for (let i = 0; i < numStrands; i++) {
          const normIndex = i / (numStrands - 1);
          const baseOriginX = width * normIndex + lateralSwell;
          const deformX = Math.sin(t * 0.75 + i * 1.3) * 35;
          const rayWidthTop = 15 + Math.sin(t * 0.6 + i * 0.8) * 10;
          const rayWidthBottom = 45 + Math.cos(t * 0.5 + i * 1.5) * 25;

          const isHighlight = i % 3 === 0;

          const rayGrad = ctx.createLinearGradient(0, 0, 0, height * 0.82);
          if (isHighlight) {
            rayGrad.addColorStop(0, 'rgba(240, 253, 255, 0.45)');
            rayGrad.addColorStop(0.2, 'rgba(56, 189, 248, 0.28)');
            rayGrad.addColorStop(0.55, 'rgba(11, 92, 115, 0.12)');
            rayGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          } else {
            rayGrad.addColorStop(0, 'rgba(56, 189, 248, 0.22)');
            rayGrad.addColorStop(0.3, 'rgba(14, 116, 144, 0.14)');
            rayGrad.addColorStop(0.65, 'rgba(3, 40, 79, 0.06)');
            rayGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          }

          ctx.fillStyle = rayGrad;
          ctx.beginPath();
          ctx.moveTo(baseOriginX - rayWidthTop * 0.5, 0);
          ctx.lineTo(baseOriginX + rayWidthTop * 0.5, 0);
          ctx.bezierCurveTo(
            baseOriginX + rayWidthTop * 0.8 + deformX * 0.6,
            height * 0.30,
            baseOriginX + rayWidthBottom * 0.5 + deformX,
            height * 0.60,
            baseOriginX + rayWidthBottom * 0.5 + deformX,
            height * 0.82
          );
          ctx.lineTo(baseOriginX - rayWidthBottom * 0.5 + deformX, height * 0.82);
          ctx.bezierCurveTo(
            baseOriginX - rayWidthBottom * 0.5 + deformX,
            height * 0.60,
            baseOriginX - rayWidthTop * 0.8 + deformX * 0.6,
            height * 0.30,
            baseOriginX - rayWidthTop * 0.5,
            0
          );
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();

        t += 0.012;
        if (!prefersReducedMotion) {
          animationFrameId = requestAnimationFrame(draw2DFallback);
        }
      };

      draw2DFallback();

      return () => {
        isDestroyed = true;
        cancelAnimationFrame(animationFrameId);
        resizeObserver.disconnect();
      };
    }
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0" aria-hidden="true">
      {/* Full-Viewport Underwater Sunlight & Caustic Light Field Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {/* Atmospheric depth vignette fading peripheral boundaries smoothly */}
      <div className="absolute inset-0 bg-radial from-transparent via-black/10 to-black/50 pointer-events-none" />

      {/* Filmic micro-texture to eliminate banding in deep 8-bit dark ocean gradients */}
      <div
        className="absolute inset-0 opacity-[0.022] mix-blend-screen pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
};
