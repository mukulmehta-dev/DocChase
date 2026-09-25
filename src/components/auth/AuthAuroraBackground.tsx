import React, { useEffect, useRef } from 'react';

/**
 * AuthAuroraBackground
 * 
 * A full-viewport continuous volumetric light field:
 * "Deep ocean + sunlight passing through water + aurora + futuristic dark SaaS"
 * 
 * Implementation:
 * - Pure native WebGL fragment shader with domain-warped fractional Brownian motion (fBm).
 * - Continuous organic deformation where the light geometry itself folds, stretches, and morphs over time.
 * - Layered volumetric depth: deep navy/blue-black abyss base (#02050A), slow indigo currents,
 *   oceanic teal, cool blue ribbons, and volumetric sunlight shafts passing through water.
 * - Restrained palette: strictly navy, teal, cyan, blue, indigo. Zero saturated neon or rainbow blobs.
 * - Full `prefers-reduced-motion` compliance: renders a single balanced static atmospheric frame.
 * - Robust Canvas2D fallback if WebGL is unavailable.
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

    // Try WebGL first
    const gl =
      canvas.getContext('webgl', { alpha: false, depth: false, antialias: true }) ||
      (canvas.getContext('experimental-webgl', { alpha: false, depth: false }) as WebGLRenderingContext | null);

    if (gl) {
      // ════════════════════════════════════════════════════════════════════════
      // WEBGL VOLUMETRIC DOMAIN-WARPED LIGHT FIELD SHADER
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

        // Fast procedural hash
        float hash(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
        }

        // Smooth 2D noise
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

        // 4-octave Fractional Brownian Motion with rotation
        float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          mat2 rot = mat2(0.877, 0.479, -0.479, 0.877);
          for (int i = 0; i < 4; i++) {
            v += a * noise(p);
            p = rot * p * 2.05 + vec2(1.2, 0.8);
            a *= 0.5;
          }
          return v;
        }

        void main() {
          vec2 st = gl_FragCoord.xy / u_resolution.xy;
          // Normalized aspect-ratio coordinates
          vec2 p = st;
          p.x *= u_resolution.x / u_resolution.y;

          // Ultra-slow, calm, hypnotic time progression
          float t = u_time * 0.045;

          // ── Domain Warping Layer 1: broad oceanic currents ──
          vec2 q = vec2(
            fbm(p * 0.85 + vec2(0.0, t * 0.35)),
            fbm(p * 0.85 + vec2(5.2, t * 0.28))
          );

          // ── Domain Warping Layer 2: interacting flowing sheets / curtains ──
          vec2 r = vec2(
            fbm(p * 1.35 + 2.8 * q + vec2(1.7, 9.2) + vec2(t * 0.22, t * 0.18)),
            fbm(p * 1.35 + 2.8 * q + vec2(8.3, 2.8) - vec2(t * 0.15, t * 0.25))
          );

          // ── Final continuous light field value ──
          float f = fbm(p * 1.1 + 3.2 * r + vec2(0.0, t * 0.12));

          // ── Volumetric underwater sunlight rays passing through surface ──
          float shaftCoord = (st.x * 2.2 - st.y * 1.4 + q.x * 0.7);
          float rays = sin(shaftCoord * 5.0 + t * 0.7) * 0.5 + 0.5;
          rays = pow(rays, 3.5) * (1.0 - st.y * 0.65);

          // ── Controlled cinematic color palette ──
          // Deep abyss base: dark navy / almost-black
          vec3 cBase = vec3(0.012, 0.024, 0.045);
          vec3 cAbyss = vec3(0.008, 0.016, 0.032);

          // Atmospheric Aurora tones
          vec3 cIndigo   = vec3(0.065, 0.050, 0.180);
          vec3 cDeepTeal = vec3(0.025, 0.240, 0.280);
          vec3 cCoolBlue = vec3(0.015, 0.280, 0.440);
          vec3 cCyan     = vec3(0.060, 0.550, 0.580);
          vec3 cSpecular = vec3(0.180, 0.780, 0.760);

          // Blend layers into ONE continuous light field
          vec3 col = mix(cBase, cAbyss, st.y);
          col = mix(col, cIndigo, clamp(length(q) * 0.65, 0.0, 1.0));
          col = mix(col, cCoolBlue, clamp(r.x * 0.75, 0.0, 1.0));
          col = mix(col, cDeepTeal, clamp(pow(f, 2.0) * 1.35, 0.0, 1.0));
          col = mix(col, cCyan, clamp(pow(f, 3.4) * 1.7 * (1.0 - st.y * 0.35), 0.0, 1.0));

          // Modulate volumetric shafts
          col += cSpecular * rays * 0.16 * (f * 0.75 + 0.25);

          // Ambient central breathing pool (subtle luminance behind glass auth card)
          float centerDist = length((st - vec2(0.5, 0.48)) * vec2(1.0, 1.25));
          float centerPool = smoothstep(0.75, 0.05, centerDist);
          col += cDeepTeal * centerPool * 0.09;

          // Edge vignette to smoothly fade viewport borders
          float edgeVig = smoothstep(0.0, 0.15, st.x) * smoothstep(1.0, 0.85, st.x) *
                          smoothstep(0.0, 0.15, st.y) * smoothstep(1.0, 0.85, st.y);
          col = mix(cAbyss, col, 0.75 + 0.25 * edgeVig);

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

      // Quad vertices
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

        // Render at half DPR for silky 60fps performance and atmospheric softness
        const dpr = Math.min(1.5, window.devicePixelRatio || 1);
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(uRes, canvas.width, canvas.height);

        if (prefersReducedMotion) {
          gl.uniform1f(uTime, 14.0);
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
          gl.uniform1f(uTime, 14.0);
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
        gl.uniform1f(uTime, 14.0);
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
      const draw2DFallback = () => {
        if (isDestroyed) return;
        ctx.fillStyle = '#030814';
        ctx.fillRect(0, 0, width, height);

        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, '#040d1e');
        grad.addColorStop(0.5, '#071828');
        grad.addColorStop(1, '#02050b');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        t += 0.005;
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
      {/* Full-Viewport Volumetric Aurora Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {/* Atmospheric vignette blending seamlessly with the dark UI */}
      <div className="absolute inset-0 bg-radial from-transparent via-black/15 to-black/55 pointer-events-none" />

      {/* Extremely subtle organic filmic grain to eliminate any color banding */}
      <div
        className="absolute inset-0 opacity-[0.022] mix-blend-screen pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
};
