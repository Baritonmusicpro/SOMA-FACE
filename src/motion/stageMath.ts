export type SceneIndex = 0 | 1 | 2 | 3;

export type ViewportMode = 'desktop' | 'tablet' | 'mobile';

export const DESIGN_WIDTH = 1440;
export const DESIGN_HEIGHT = 900;

export interface StageMetrics {
  viewportWidth: number;
  viewportHeight: number;
  mode: ViewportMode;
  /** Independent cover scale relative to 1440x900 design space */
  coverScale: number;
  /** Independent contain scale relative to 1440x900 design space */
  containScale: number;
  /** Balanced product scale blending contain & viewport proportion */
  productScale: number;
  /** Stage origin offset for centered contain space */
  containOffsetX: number;
  containOffsetY: number;
}

export interface ProductPose {
  /** Center X in 1440 design space (desktop/tablet) or normalized viewport % on mobile */
  x: number;
  /** Bottom Y in 900 design space */
  y: number;
  scale: number;
  opacity: number;
  shadowOpacity: number;
}

export interface SceneTargets {
  serum: ProductPose;
  cream: ProductPose;
  eyeBalm: ProductPose;
  heroBgOpacity: number;
  heroBgY: number;
  ivoryBgOpacity: number;
  taupePanelY: number; // 0 = fully risen, 100 = hidden below viewport (%)
  darkStudioOpacity: number;
  handX: number; // px offset from resting hand position (0 = resting in palm, -760 = off left)
  handOpacity: number;
  cameraScale: number;
  lightShift: number;
}

export function computeStageMetrics(width: number, height: number): StageMetrics {
  const safeW = Math.max(320, width);
  const safeH = Math.max(480, height);

  const scaleX = safeW / DESIGN_WIDTH;
  const scaleY = safeH / DESIGN_HEIGHT;
  const coverScale = Math.max(scaleX, scaleY);
  const containScale = Math.min(scaleX, scaleY);

  let mode: ViewportMode = 'desktop';
  if (safeW < 768) {
    mode = 'mobile';
  } else if (safeW < 1080 || safeW / safeH < 1.15) {
    mode = 'tablet';
  }

  const productScale =
    mode === 'mobile'
      ? Math.min(safeW / 410, safeH / 820)
      : containScale + (coverScale - containScale) * 0.22;

  const containOffsetX = (safeW - DESIGN_WIDTH * containScale) * 0.5;
  const containOffsetY = (safeH - DESIGN_HEIGHT * containScale) * 0.5;

  return {
    viewportWidth: safeW,
    viewportHeight: safeH,
    mode,
    coverScale,
    containScale,
    productScale,
    containOffsetX,
    containOffsetY,
  };
}

/**
 * Base product dimensions in 1440x900 design coordinates.
 * Preserves exact real-world proportions of the three SOMA FACE products:
 * - Luminous Repair Serum (30 ml): tall slender frosted cylinder
 * - Restorative Overnight Cream (50 ml): wide weighty frosted anchor jar
 * - Active Eye Balm (15 ml): compact petite frosted jar
 */
export const BASE_PRODUCT_DIMS = {
  serum: { width: 88, height: 322 },
  cream: { width: 224, height: 200 },
  eyeBalm: { width: 146, height: 127 },
} as const;

/**
 * Desktop & Tablet 1440x900 target poses for each of the four scenes.
 * Scene 0: The Essence (sunlit travertine interior)
 * Scene 1: The Formula (warm ivory studio with 5-macro arch)
 * Scene 2: The Ritual (warm taupe rising panel + photorealistic hand cradling cream)
 * Scene 3: The Collection (dramatic dark mocha studio on 3 architectural pedestals)
 */
const DESKTOP_SCENE_TARGETS: Record<SceneIndex, SceneTargets> = {
  0: {
    serum: { x: 526, y: 762, scale: 1.0, opacity: 1, shadowOpacity: 0.72 },
    cream: { x: 720, y: 786, scale: 1.0, opacity: 1, shadowOpacity: 0.78 },
    eyeBalm: { x: 924, y: 774, scale: 1.0, opacity: 1, shadowOpacity: 0.7 },
    heroBgOpacity: 1,
    heroBgY: 0,
    ivoryBgOpacity: 0,
    taupePanelY: 105,
    darkStudioOpacity: 0,
    handX: -820,
    handOpacity: 0,
    cameraScale: 1.028,
    lightShift: 0,
  },
  1: {
    serum: { x: 180, y: 808, scale: 0.88, opacity: 0, shadowOpacity: 0 },
    cream: { x: 720, y: 816, scale: 1.24, opacity: 1, shadowOpacity: 0.45 },
    eyeBalm: { x: 1260, y: 808, scale: 0.88, opacity: 0, shadowOpacity: 0 },
    heroBgOpacity: 0,
    heroBgY: -42,
    ivoryBgOpacity: 1,
    taupePanelY: 105,
    darkStudioOpacity: 0,
    handX: -820,
    handOpacity: 0,
    cameraScale: 1.0,
    lightShift: 1,
  },
  2: {
    serum: { x: 120, y: 820, scale: 0.82, opacity: 0, shadowOpacity: 0 },
    cream: { x: 472, y: 614, scale: 1.04, opacity: 1, shadowOpacity: 0.55 },
    eyeBalm: { x: 1320, y: 820, scale: 0.82, opacity: 0, shadowOpacity: 0 },
    heroBgOpacity: 0,
    heroBgY: -64,
    ivoryBgOpacity: 1,
    taupePanelY: 0,
    darkStudioOpacity: 0,
    handX: 0,
    handOpacity: 1,
    cameraScale: 1.01,
    lightShift: 2,
  },
  3: {
    // Pedestal coordinates calibrated to studio_collection_env_1795597462573.jpg (1376x768 cover-fitted to 1440x900)
    serum: { x: 414, y: 519, scale: 0.84, opacity: 1, shadowOpacity: 0.88 },
    cream: { x: 720, y: 585, scale: 0.98, opacity: 1, shadowOpacity: 0.92 },
    eyeBalm: { x: 1044, y: 613, scale: 0.84, opacity: 1, shadowOpacity: 0.88 },
    heroBgOpacity: 0,
    heroBgY: -80,
    ivoryBgOpacity: 0,
    taupePanelY: 0,
    darkStudioOpacity: 1,
    handX: -880,
    handOpacity: 0,
    cameraScale: 1.02,
    lightShift: 3,
  },
};

/**
 * Mobile portrait/compact targets (mapped in 410x844 logical mobile frame)
 * Rearranges compositions vertically rather than shrinking desktop layout.
 */
const MOBILE_SCENE_TARGETS: Record<SceneIndex, SceneTargets> = {
  0: {
    serum: { x: 96, y: 718, scale: 0.64, opacity: 1, shadowOpacity: 0.7 },
    cream: { x: 205, y: 742, scale: 0.68, opacity: 1, shadowOpacity: 0.75 },
    eyeBalm: { x: 320, y: 730, scale: 0.64, opacity: 1, shadowOpacity: 0.68 },
    heroBgOpacity: 1,
    heroBgY: 0,
    ivoryBgOpacity: 0,
    taupePanelY: 105,
    darkStudioOpacity: 0,
    handX: -480,
    handOpacity: 0,
    cameraScale: 1.02,
    lightShift: 0,
  },
  1: {
    serum: { x: -40, y: 735, scale: 0.56, opacity: 0, shadowOpacity: 0 },
    cream: { x: 205, y: 748, scale: 0.76, opacity: 1, shadowOpacity: 0.42 },
    eyeBalm: { x: 450, y: 735, scale: 0.56, opacity: 0, shadowOpacity: 0 },
    heroBgOpacity: 0,
    heroBgY: -30,
    ivoryBgOpacity: 1,
    taupePanelY: 105,
    darkStudioOpacity: 0,
    handX: -480,
    handOpacity: 0,
    cameraScale: 1.0,
    lightShift: 1,
  },
  2: {
    serum: { x: -60, y: 740, scale: 0.52, opacity: 0, shadowOpacity: 0 },
    cream: { x: 222, y: 405, scale: 0.58, opacity: 1, shadowOpacity: 0.5 },
    eyeBalm: { x: 470, y: 740, scale: 0.52, opacity: 0, shadowOpacity: 0 },
    heroBgOpacity: 0,
    heroBgY: -45,
    ivoryBgOpacity: 1,
    taupePanelY: 0,
    darkStudioOpacity: 0,
    handX: 0,
    handOpacity: 1,
    cameraScale: 1.0,
    lightShift: 2,
  },
  3: {
    serum: { x: 88, y: 616, scale: 0.56, opacity: 1, shadowOpacity: 0.82 },
    cream: { x: 205, y: 650, scale: 0.64, opacity: 1, shadowOpacity: 0.88 },
    eyeBalm: { x: 322, y: 662, scale: 0.56, opacity: 1, shadowOpacity: 0.82 },
    heroBgOpacity: 0,
    heroBgY: -60,
    ivoryBgOpacity: 0,
    taupePanelY: 0,
    darkStudioOpacity: 1,
    handX: -520,
    handOpacity: 0,
    cameraScale: 1.01,
    lightShift: 3,
  },
};

export function getSceneTargets(scene: SceneIndex, mode: ViewportMode): SceneTargets {
  if (mode === 'mobile') {
    return MOBILE_SCENE_TARGETS[scene];
  }
  return DESKTOP_SCENE_TARGETS[scene];
}

/**
 * Opening animation start state:
 * Environment and products rise together from 27.6% below resting position.
 */
export function getIntroStartTargets(mode: ViewportMode): SceneTargets {
  const rest = getSceneTargets(0, mode);
  const riseOffset = mode === 'mobile' ? 844 * 0.276 : DESIGN_HEIGHT * 0.276;
  return {
    ...rest,
    serum: { ...rest.serum, y: rest.serum.y + riseOffset },
    cream: { ...rest.cream, y: rest.cream.y + riseOffset },
    eyeBalm: { ...rest.eyeBalm, y: rest.eyeBalm.y + riseOffset },
    heroBgY: 27.6, // percentage rise matching 27.6% below resting position
    cameraScale: 1.0,
  };
}
