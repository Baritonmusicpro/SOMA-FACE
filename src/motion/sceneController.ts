import {
  EASE_INTRO,
  EASE_OPACITY,
  EASE_PANEL,
  EASE_PRODUCT,
  EASE_VERTICAL_DELAY,
  EasingFn,
  clamp01,
  lerp,
} from './easing';
import {
  ProductPose,
  SceneIndex,
  SceneTargets,
  ViewportMode,
  getIntroStartTargets,
  getSceneTargets,
} from './stageMath';

export interface ChannelTiming {
  duration: number;
  delay: number;
  ease: EasingFn;
}

export interface TransitionTimings {
  productX: ChannelTiming;
  productY: ChannelTiming;
  productScale: ChannelTiming;
  productOpacity: ChannelTiming;
  heroBgOpacity: ChannelTiming;
  heroBgY: ChannelTiming;
  ivoryBgOpacity: ChannelTiming;
  taupePanelY: ChannelTiming;
  darkStudioOpacity: ChannelTiming;
  handX: ChannelTiming;
  handOpacity: ChannelTiming;
  cameraScale: ChannelTiming;
  totalDuration: number;
}

/**
 * Computes exact per-channel durations, delays, and easing curves
 * for intro and every forward/reverse scene transition.
 */
export function getTransitionTimings(
  from: SceneIndex | 'intro',
  to: SceneIndex,
  reducedMotion: boolean
): TransitionTimings {
  if (reducedMotion) {
    const instant: ChannelTiming = { duration: 1, delay: 0, ease: (t) => t };
    return {
      productX: instant,
      productY: instant,
      productScale: instant,
      productOpacity: instant,
      heroBgOpacity: instant,
      heroBgY: instant,
      ivoryBgOpacity: instant,
      taupePanelY: instant,
      darkStudioOpacity: instant,
      handX: instant,
      handOpacity: instant,
      cameraScale: instant,
      totalDuration: 1,
    };
  }

  // Opening intro: 1600ms cubic-bezier(.5, 0, 0, 1)
  if (from === 'intro') {
    return {
      productX: { duration: 1600, delay: 0, ease: EASE_INTRO },
      productY: { duration: 1600, delay: 0, ease: EASE_INTRO },
      productScale: { duration: 1600, delay: 0, ease: EASE_INTRO },
      productOpacity: { duration: 900, delay: 0, ease: EASE_OPACITY },
      heroBgOpacity: { duration: 900, delay: 0, ease: EASE_OPACITY },
      heroBgY: { duration: 1600, delay: 0, ease: EASE_INTRO },
      ivoryBgOpacity: { duration: 600, delay: 0, ease: EASE_OPACITY },
      taupePanelY: { duration: 650, delay: 0, ease: EASE_PANEL },
      darkStudioOpacity: { duration: 650, delay: 0, ease: EASE_OPACITY },
      handX: { duration: 1150, delay: 0, ease: EASE_PRODUCT },
      handOpacity: { duration: 600, delay: 0, ease: EASE_OPACITY },
      cameraScale: { duration: 3600, delay: 200, ease: EASE_OPACITY },
      totalDuration: 1600,
    };
  }

  // Transition into or out of Scene 4 (The Collection)
  if (to === 3 || from === 3) {
    const enteringDark = to === 3;
    return {
      productX: { duration: 700, delay: enteringDark ? 0 : 120, ease: EASE_PRODUCT },
      productY: { duration: 1600, delay: 0, ease: EASE_VERTICAL_DELAY },
      productScale: { duration: 1600, delay: 0, ease: EASE_PRODUCT },
      productOpacity: { duration: 750, delay: enteringDark ? 240 : 0, ease: EASE_OPACITY },
      heroBgOpacity: { duration: 650, delay: 0, ease: EASE_OPACITY },
      heroBgY: { duration: 850, delay: 0, ease: EASE_PANEL },
      ivoryBgOpacity: { duration: 650, delay: enteringDark ? 250 : 0, ease: EASE_OPACITY },
      taupePanelY: { duration: 650, delay: 0, ease: EASE_PANEL },
      darkStudioOpacity: {
        duration: 650,
        delay: enteringDark ? 350 : 0,
        ease: EASE_OPACITY,
      },
      handX: { duration: 950, delay: 0, ease: EASE_PRODUCT },
      handOpacity: { duration: 520, delay: enteringDark ? 0 : 180, ease: EASE_OPACITY },
      cameraScale: { duration: 1600, delay: 0, ease: EASE_OPACITY },
      totalDuration: 1600,
    };
  }

  // Transition involving Scene 3 (The Ritual): panel rise 650ms, product & hand 1150ms
  if (to === 2 || from === 2) {
    return {
      productX: { duration: 1150, delay: 0, ease: EASE_PRODUCT },
      productY: { duration: 1150, delay: 0, ease: EASE_PRODUCT },
      productScale: { duration: 1150, delay: 0, ease: EASE_PRODUCT },
      productOpacity: { duration: 700, delay: 0, ease: EASE_OPACITY },
      heroBgOpacity: { duration: 700, delay: 0, ease: EASE_OPACITY },
      heroBgY: { duration: 700, delay: 0, ease: EASE_PANEL },
      ivoryBgOpacity: { duration: 700, delay: 0, ease: EASE_OPACITY },
      taupePanelY: { duration: 650, delay: 0, ease: EASE_PANEL },
      darkStudioOpacity: { duration: 650, delay: 0, ease: EASE_OPACITY },
      handX: { duration: 1150, delay: 0, ease: EASE_PRODUCT },
      handOpacity: { duration: 650, delay: to === 2 ? 120 : 0, ease: EASE_OPACITY },
      cameraScale: { duration: 1150, delay: 0, ease: EASE_OPACITY },
      totalDuration: 1150,
    };
  }

  // Scene 1 <-> Scene 2 (The Formula): product 1150ms, background 700ms
  return {
    productX: { duration: 1150, delay: 0, ease: EASE_PRODUCT },
    productY: { duration: 1150, delay: 0, ease: EASE_PRODUCT },
    productScale: { duration: 1150, delay: 0, ease: EASE_PRODUCT },
    productOpacity: { duration: 750, delay: 0, ease: EASE_OPACITY },
    heroBgOpacity: { duration: 700, delay: 0, ease: EASE_OPACITY },
    heroBgY: { duration: 700, delay: 0, ease: EASE_PANEL },
    ivoryBgOpacity: { duration: 700, delay: 0, ease: EASE_OPACITY },
    taupePanelY: { duration: 650, delay: 0, ease: EASE_PANEL },
    darkStudioOpacity: { duration: 650, delay: 0, ease: EASE_OPACITY },
    handX: { duration: 900, delay: 0, ease: EASE_PRODUCT },
    handOpacity: { duration: 500, delay: 0, ease: EASE_OPACITY },
    cameraScale: { duration: 1150, delay: 0, ease: EASE_OPACITY },
    totalDuration: 1150,
  };
}

function evalChannel(fromVal: number, toVal: number, elapsedMs: number, timing: ChannelTiming): number {
  if (timing.duration <= 0) return toVal;
  const raw = clamp01((elapsedMs - timing.delay) / timing.duration);
  return lerp(fromVal, toVal, timing.ease(raw));
}

function evalProductPose(
  from: ProductPose,
  to: ProductPose,
  elapsedMs: number,
  timings: TransitionTimings
): ProductPose {
  return {
    x: evalChannel(from.x, to.x, elapsedMs, timings.productX),
    y: evalChannel(from.y, to.y, elapsedMs, timings.productY),
    scale: evalChannel(from.scale, to.scale, elapsedMs, timings.productScale),
    opacity: evalChannel(from.opacity, to.opacity, elapsedMs, timings.productOpacity),
    shadowOpacity: evalChannel(from.shadowOpacity, to.shadowOpacity, elapsedMs, timings.productOpacity),
  };
}

export function interpolateSceneState(
  fromState: SceneTargets,
  toState: SceneTargets,
  elapsedMs: number,
  timings: TransitionTimings
): SceneTargets {
  return {
    serum: evalProductPose(fromState.serum, toState.serum, elapsedMs, timings),
    cream: evalProductPose(fromState.cream, toState.cream, elapsedMs, timings),
    eyeBalm: evalProductPose(fromState.eyeBalm, toState.eyeBalm, elapsedMs, timings),
    heroBgOpacity: evalChannel(fromState.heroBgOpacity, toState.heroBgOpacity, elapsedMs, timings.heroBgOpacity),
    heroBgY: evalChannel(fromState.heroBgY, toState.heroBgY, elapsedMs, timings.heroBgY),
    ivoryBgOpacity: evalChannel(fromState.ivoryBgOpacity, toState.ivoryBgOpacity, elapsedMs, timings.ivoryBgOpacity),
    taupePanelY: evalChannel(fromState.taupePanelY, toState.taupePanelY, elapsedMs, timings.taupePanelY),
    darkStudioOpacity: evalChannel(
      fromState.darkStudioOpacity,
      toState.darkStudioOpacity,
      elapsedMs,
      timings.darkStudioOpacity
    ),
    handX: evalChannel(fromState.handX, toState.handX, elapsedMs, timings.handX),
    handOpacity: evalChannel(fromState.handOpacity, toState.handOpacity, elapsedMs, timings.handOpacity),
    cameraScale: evalChannel(fromState.cameraScale, toState.cameraScale, elapsedMs, timings.cameraScale),
    lightShift: evalChannel(fromState.lightShift, toState.lightShift, elapsedMs, timings.ivoryBgOpacity),
  };
}

export interface NavigationGuardState {
  currentScene: SceneIndex;
  isLocked: boolean;
  lastTriggerAt: number;
  lastWheelDelta: number;
}

export const SCENE_COOLDOWN_MS = 1050;
export const WHEEL_THRESHOLD = 18;
export const TOUCH_SWIPE_THRESHOLD = 42;

/**
 * Pure gesture guard that enforces:
 * - One wheel gesture, touch swipe, or key triggers strictly ONE scene step
 * - Never skips scenes during trackpad momentum / inertia tails
 * - Clamps cleanly at [0, 3]
 */
export function evaluateStepRequest(
  state: NavigationGuardState,
  direction: -1 | 1,
  nowMs: number,
  reducedMotion: boolean
): { nextScene: SceneIndex; accepted: boolean; nextGuard: NavigationGuardState } {
  const cooldown = reducedMotion ? 160 : SCENE_COOLDOWN_MS;
  if (state.isLocked || nowMs - state.lastTriggerAt < cooldown) {
    return { nextScene: state.currentScene, accepted: false, nextGuard: state };
  }

  const candidate = state.currentScene + direction;
  if (candidate < 0 || candidate > 3) {
    return { nextScene: state.currentScene, accepted: false, nextGuard: state };
  }

  const nextScene = candidate as SceneIndex;
  return {
    nextScene,
    accepted: true,
    nextGuard: {
      currentScene: nextScene,
      isLocked: true,
      lastTriggerAt: nowMs,
      lastWheelDelta: 0,
    },
  };
}

export function createInitialTransitionState(mode: ViewportMode, skipIntro: boolean) {
  const target = getSceneTargets(0, mode);
  return {
    from: skipIntro ? target : getIntroStartTargets(mode),
    to: target,
    timings: getTransitionTimings('intro', 0, skipIntro),
  };
}
