/* ============================================================
   DEVTALKS — MAGIC RINGS
   ------------------------------------------------------------
   Concentric rings that swell out of the centre, fade, and
   restart on a staggered clock — a fragment shader on one
   full-screen triangle. Ported from React Bits' <MagicRings />.

   WHAT CHANGED FROM THE ORIGINAL, AND WHY
   • No three.js. The original pulls in a whole scene graph, camera
     and renderer to draw one quad. Raw WebGL does the same job in
     about 150 lines and adds nothing to the bundle.
   • The shader does less per pixel. The rings were re-deriving
     length() and atan() for every ring even though, with no mouse
     parallax, they are identical for all of them; both are now
     computed once, and the per-ring pow() is a running product.
   • It renders small and lets the browser scale it up. The rings
     are soft by design, so a canvas capped at `maxSide` px looks
     the same as a full-resolution one and costs a fraction as much.
   • It draws at `fps` (default 30). The rings move once every 3.45s;
     60 frames a second of that is the same picture drawn twice.
   • It stops. Not on screen, tab hidden, or `paused` -> no rAF
     callback at all, and under prefers-reduced-motion it draws one
     still frame and never starts a loop.
   • Its edge fades out inside the shader, so the canvas never reads
     as a rectangle. There is no CSS mask, which would cost an extra
     composited pass every frame.
   • Mouse-follow, hover scale, click burst, blur and the coverage
     alpha mode are gone: nothing on this page uses them, and the
     first three each needed a pointer listener.

   OUTPUT
   The shader writes premultiplied alpha straight into the canvas
   (which is a premultiplied surface), so there is no blending pass.
   ============================================================ */

import { useEffect, useRef, useState } from 'react';
import './MagicRings.css';

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform float uTime, uAttenuation, uLineThickness;
uniform float uBaseRadius, uRadiusStep, uScaleRate;
uniform float uOpacity, uNoiseAmount, uRotation, uRingGap3;
uniform float uFadeIn, uFadeOut, uEdge;
uniform vec2 uResolution;
uniform vec3 uColor, uColorTwo;
uniform int uRingCount;

const float HP = 1.5707963;
const float CYCLE = 3.45;

void main() {
  float px = 1.0 / min(uResolution.x, uResolution.y);
  vec2 q = (gl_FragCoord.xy - 0.5 * uResolution) * px;

  float cr = cos(uRotation), sr = sin(uRotation);
  vec2 p = mat2(cr, -sr, sr, cr) * q;

  // Everything that does not depend on the ring is worked out once.
  float len = length(p);
  float a = atan(abs(p.y), abs(p.x)) / HP;
  float a3 = a * a * a;
  float th = max(1.0 - a, 0.5) * px * uLineThickness;

  vec3 c = vec3(0.0);
  float rcf = max(float(uRingCount) - 1.0, 1.0);
  float g3 = 1.0;

  for (int i = 0; i < 10; i++) {
    if (i >= uRingCount) break;
    float fi = float(i);

    float t = mod(uTime + (i == 0 ? 0.0 : 2.95 * fi), CYCLE);
    float r = uBaseRadius + fi * uRadiusStep + t / CYCLE * uScaleRate;

    float d = abs(len - r);
    float h = (1.0 - smoothstep(th, th * 1.5, d)) + 1.0;
    d += g3 * a3 * r;

    float f = t < uFadeIn
      ? smoothstep(0.0, uFadeIn, t)
      : 1.0 - smoothstep(uFadeOut, CYCLE - 0.2, t);

    vec3 rc = mix(uColor, uColorTwo, fi / rcf);
    c = mix(c, rc, vec3(h * exp(-uAttenuation * d) * f));
    g3 *= uRingGap3;
  }

  float n = fract(sin(dot(gl_FragCoord.xy + uTime * 100.0, vec2(12.9898, 78.233))) * 43758.5453);
  c += (n - 0.5) * uNoiseAmount;

  float intensity = max(c.r, max(c.g, c.b));
  vec3 tint = intensity > 0.0001 ? clamp(c / intensity, 0.0, 1.0) : vec3(0.0);

  float edge = 1.0 - smoothstep(uEdge, 0.5, length(q));
  float alpha = clamp(intensity * uOpacity, 0.0, 1.0) * edge;

  gl_FragColor = vec4(tint * alpha, alpha);
}
`;

type GL = WebGLRenderingContext | WebGL2RenderingContext;

const CONTEXT_OPTIONS: WebGLContextAttributes = {
  alpha: true,
  antialias: false,
  depth: false,
  stencil: false,
  premultipliedAlpha: true,
  // A decorative effect has no business waking the discrete GPU.
  powerPreference: 'low-power'
};

/** One ring cycle is 3.45s; this is a moment when several rings are up. */
const STILL_FRAME_TIME = 1.6;

const hexToRgb = (hex: string): [number, number, number] => {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  if (isNaN(n) || h.length !== 6) return [1, 1, 1];
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

function compile(gl: GL, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    if (import.meta.env.DEV) console.warn('MagicRings shader:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export interface MagicRingsProps {
  color?: string;
  colorTwo?: string;
  ringCount?: number;
  speed?: number;
  attenuation?: number;
  lineThickness?: number;
  baseRadius?: number;
  radiusStep?: number;
  scaleRate?: number;
  opacity?: number;
  noiseAmount?: number;
  rotation?: number;
  ringGap?: number;
  fadeIn?: number;
  fadeOut?: number;
  /** Distance from the centre (0-0.5, in canvas heights) where the fade to nothing begins. */
  edgeFade?: number;
  /** Pixel-ratio ceiling for the backing store. */
  maxDpr?: number;
  /** The backing store is never larger than this on its longest side. */
  maxSide?: number;
  fps?: number;
  /** True stops the loop entirely. The parent knows when it is out of sight. */
  paused?: boolean;
  className?: string;
}

export default function MagicRings({
  color = '#fc42ff',
  colorTwo = '#42fcff',
  ringCount = 6,
  speed = 1,
  attenuation = 10,
  lineThickness = 2,
  baseRadius = 0.35,
  radiusStep = 0.1,
  scaleRate = 0.1,
  opacity = 1,
  noiseAmount = 0.1,
  rotation = 0,
  ringGap = 1.5,
  fadeIn = 0.7,
  fadeOut = 0.5,
  edgeFade = 0.34,
  maxDpr = 1,
  maxSide = 880,
  fps = 30,
  paused = false,
  className = ''
}: MagicRingsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(paused);
  const syncRef = useRef<(() => void) | null>(null);

  // Bumped when the browser hands the GL context back after losing it.
  const [generation, setGeneration] = useState(0);

  pausedRef.current = paused;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let cancelled = false;
    let teardown: (() => void) | null = null;

    const boot = () => {
      if (cancelled) return;

      const gl = (canvas.getContext('webgl2', CONTEXT_OPTIONS) ||
        canvas.getContext('webgl', CONTEXT_OPTIONS)) as GL | null;
      if (!gl) return; // no WebGL: the landing page is complete without it

      const vs = compile(gl, gl.VERTEX_SHADER, VERT);
      const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
      const program = gl.createProgram();
      if (!vs || !fs || !program) return;

      gl.bindAttribLocation(program, 0, 'aPos');
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        if (import.meta.env.DEV) console.warn('MagicRings link:', gl.getProgramInfoLog(program));
        return;
      }
      gl.useProgram(program);

      // One oversized triangle covers the viewport; a quad is two.
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.disable(gl.BLEND);

      const loc = (name: string) => gl.getUniformLocation(program, name);
      const uTime = loc('uTime');
      const uResolution = loc('uResolution');

      // Everything except time and resolution is fixed for this mount.
      gl.uniform1f(loc('uAttenuation'), attenuation);
      gl.uniform1f(loc('uLineThickness'), lineThickness);
      gl.uniform1f(loc('uBaseRadius'), baseRadius);
      gl.uniform1f(loc('uRadiusStep'), radiusStep);
      gl.uniform1f(loc('uScaleRate'), scaleRate);
      gl.uniform1f(loc('uOpacity'), opacity);
      gl.uniform1f(loc('uNoiseAmount'), noiseAmount);
      gl.uniform1f(loc('uRotation'), (rotation * Math.PI) / 180);
      gl.uniform1f(loc('uRingGap3'), Math.pow(ringGap, 3));
      gl.uniform1f(loc('uFadeIn'), fadeIn);
      gl.uniform1f(loc('uFadeOut'), fadeOut);
      gl.uniform1f(loc('uEdge'), edgeFade);
      gl.uniform1i(loc('uRingCount'), Math.max(1, Math.min(10, Math.round(ringCount))));
      gl.uniform3fv(loc('uColor'), hexToRgb(color));
      gl.uniform3fv(loc('uColorTwo'), hexToRgb(colorTwo));

      let elapsed = reduced ? STILL_FRAME_TIME : 0;
      let shown = false;

      const draw = () => {
        gl.uniform1f(uTime, elapsed);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        if (!shown) {
          shown = true;
          canvas.classList.add('is-on');
        }
      };

      const fit = () => {
        const cssW = canvas.clientWidth;
        const cssH = canvas.clientHeight;
        if (!cssW || !cssH) return;

        let scale = Math.min(window.devicePixelRatio || 1, maxDpr);
        const longest = Math.max(cssW, cssH) * scale;
        if (longest > maxSide) scale *= maxSide / longest;

        const w = Math.max(1, Math.round(cssW * scale));
        const h = Math.max(1, Math.round(cssH * scale));
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
          gl.viewport(0, 0, w, h);
          gl.uniform2f(uResolution, w, h);
        }
        // Resizing clears the buffer; put the picture back this frame rather
        // than waiting for the next tick (or forever, if we are not looping).
        draw();
      };

      fit();
      const ro = new ResizeObserver(fit);
      ro.observe(canvas);

      // ---- the loop -------------------------------------------------
      const interval = 1000 / fps;
      let raf = 0;
      let last = 0;

      const frame = (t: number) => {
        raf = requestAnimationFrame(frame);
        if (last && t - last < interval - 1) return;
        const dt = last ? Math.min(t - last, 100) : 0; // a stalled tab must not jump the rings
        last = t;
        elapsed += dt * 0.001 * speed;
        draw();
      };

      const sync = () => {
        const want = !reduced && !pausedRef.current && !document.hidden;
        if (want && !raf) {
          last = 0;
          raf = requestAnimationFrame(frame);
        } else if (!want && raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      };
      syncRef.current = sync;

      const onVisibility = () => sync();
      document.addEventListener('visibilitychange', onVisibility);

      const onLost = (e: Event) => {
        e.preventDefault();
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
      };
      const onRestored = () => setGeneration((g) => g + 1);
      canvas.addEventListener('webglcontextlost', onLost);
      canvas.addEventListener('webglcontextrestored', onRestored);

      sync();

      teardown = () => {
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        syncRef.current = null;
        ro.disconnect();
        document.removeEventListener('visibilitychange', onVisibility);
        canvas.removeEventListener('webglcontextlost', onLost);
        canvas.removeEventListener('webglcontextrestored', onRestored);
        gl.deleteBuffer(buffer);
        gl.deleteProgram(program);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
      };
    };

    // The doors intro is playing when this mounts. Compiling a shader in
    // the middle of it is exactly the kind of hitch that shows on a slow
    // machine, so wait for the browser to be idle.
    // (Safari still has no requestIdleCallback.)
    const hasIdle = typeof window.requestIdleCallback === 'function';
    const idle = hasIdle
      ? window.requestIdleCallback(boot, { timeout: 1500 })
      : window.setTimeout(boot, 300);

    return () => {
      cancelled = true;
      if (hasIdle) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      teardown?.();
    };
  }, [
    color, colorTwo, ringCount, speed, attenuation, lineThickness, baseRadius,
    radiusStep, scaleRate, opacity, noiseAmount, rotation, ringGap, fadeIn,
    fadeOut, edgeFade, maxDpr, maxSide, fps, generation
  ]);

  useEffect(() => {
    syncRef.current?.();
  }, [paused]);

  return <canvas ref={canvasRef} className={`magic-rings ${className}`.trim()} aria-hidden="true" />;
}
