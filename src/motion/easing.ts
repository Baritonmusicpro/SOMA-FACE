export type EasingFn = (t: number) => number;

/**
 * Exact cubic-bezier evaluator matching CSS cubic-bezier(x1, y1, x2, y2).
 * Uses Newton-Raphson with binary-search fallback for guaranteed monotonicity.
 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): EasingFn {
  const ax = 3 * x1 - 3 * x2 + 1;
  const bx = 3 * x2 - 6 * x1;
  const cx = 3 * x1;

  const ay = 3 * y1 - 3 * y2 + 1;
  const by = 3 * y2 - 6 * y1;
  const cy = 3 * y1;

  const sampleX = (u: number) => ((ax * u + bx) * u + cx) * u;
  const sampleY = (u: number) => ((ay * u + by) * u + cy) * u;
  const sampleDerivX = (u: number) => (3 * ax * u + 2 * bx) * u + cx;

  const solveU = (x: number): number => {
    let u = x;
    for (let i = 0; i < 6; i++) {
      const err = sampleX(u) - x;
      if (Math.abs(err) < 1e-6) return u;
      const d = sampleDerivX(u);
      if (Math.abs(d) < 1e-6) break;
      u -= err / d;
    }
    let lo = 0;
    let hi = 1;
    u = x;
    for (let i = 0; i < 16; i++) {
      const val = sampleX(u);
      if (Math.abs(val - x) < 1e-6) return u;
      if (x > val) lo = u;
      else hi = u;
      u = 0.5 * (lo + hi);
    }
    return u;
  };

  return (t: number): number => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    return sampleY(solveU(t));
  };
}

/** Opening rise easing: cubic-bezier(.5, 0, 0, 1) */
export const EASE_INTRO: EasingFn = cubicBezier(0.5, 0, 0, 1);

/** Product movement easing: cubic-bezier(.3, 0, .05, 1) */
export const EASE_PRODUCT: EasingFn = cubicBezier(0.3, 0, 0.05, 1);

/** Panel movement easing: cubic-bezier(.3, 0, .15, 1) */
export const EASE_PANEL: EasingFn = cubicBezier(0.3, 0, 0.15, 1);

/** Opacity easing: cubic-bezier(.25, .1, .25, 1) */
export const EASE_OPACITY: EasingFn = cubicBezier(0.25, 0.1, 0.25, 1);

/** Delayed vertical movement easing: cubic-bezier(.5, 0, .1, 1) */
export const EASE_VERTICAL_DELAY: EasingFn = cubicBezier(0.5, 0, 0.1, 1);

export function clamp01(value: number): number {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}
