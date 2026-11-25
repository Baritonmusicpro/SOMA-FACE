import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EASE_INTRO,
  EASE_OPACITY,
  EASE_PANEL,
  EASE_PRODUCT,
  EASE_VERTICAL_DELAY,
  cubicBezier,
} from './easing';
import { computeStageMetrics, getIntroStartTargets, getSceneTargets } from './stageMath';
import {
  SCENE_COOLDOWN_MS,
  evaluateStepRequest,
  getTransitionTimings,
  interpolateSceneState,
} from './sceneController';

test('cubic-bezier curves satisfy boundary conditions and monotonicity without overshoot', () => {
  const curves = [
    EASE_INTRO,
    EASE_PRODUCT,
    EASE_PANEL,
    EASE_OPACITY,
    EASE_VERTICAL_DELAY,
  ];

  for (const fn of curves) {
    assert.equal(fn(0), 0);
    assert.equal(fn(1), 1);

    let prev = 0;
    for (let i = 1; i <= 20; i++) {
      const val = fn(i / 20);
      assert.ok(val >= prev - 1e-6, `Expected monotonic increase at step ${i}`);
      assert.ok(val <= 1 + 1e-6, `Expected no bounce overshoot at step ${i}`);
      prev = val;
    }
  }
});

test('linear cubic-bezier approximates identity', () => {
  const linear = cubicBezier(0, 0, 1, 1);
  assert.ok(Math.abs(linear(0.5) - 0.5) < 1e-4);
});

test('1440x900 stage metrics produce independent cover and contain scaling across viewports', () => {
  const desktop = computeStageMetrics(1440, 900);
  assert.equal(desktop.mode, 'desktop');
  assert.equal(desktop.coverScale, 1);
  assert.equal(desktop.containScale, 1);

  const ultrawide = computeStageMetrics(2560, 1080);
  assert.equal(ultrawide.mode, 'desktop');
  assert.ok(ultrawide.coverScale > ultrawide.containScale);

  const mobile = computeStageMetrics(390, 844);
  assert.equal(mobile.mode, 'mobile');
  assert.ok(mobile.productScale > 0 && mobile.productScale <= 1.2);
});

test('intro start state offsets environment and products 27.6% below resting position', () => {
  const rest = getSceneTargets(0, 'desktop');
  const start = getIntroStartTargets('desktop');
  const expectedOffset = 900 * 0.276;

  assert.ok(Math.abs(start.cream.y - (rest.cream.y + expectedOffset)) < 1e-4);
  assert.ok(Math.abs(start.serum.y - (rest.serum.y + expectedOffset)) < 1e-4);
  assert.ok(Math.abs(start.eyeBalm.y - (rest.eyeBalm.y + expectedOffset)) < 1e-4);
  assert.equal(start.heroBgY, 27.6);
});

test('scene transitions honor exact requested timings for forward and reverse steps', () => {
  const intro = getTransitionTimings('intro', 0, false);
  assert.equal(intro.productY.duration, 1600);

  const s1ToS2 = getTransitionTimings(0, 1, false);
  assert.equal(s1ToS2.productY.duration, 1150);
  assert.equal(s1ToS2.heroBgOpacity.duration, 700);

  const s2ToS3 = getTransitionTimings(1, 2, false);
  assert.equal(s2ToS3.taupePanelY.duration, 650);
  assert.equal(s2ToS3.productX.duration, 1150);
  assert.equal(s2ToS3.handX.duration, 1150);

  const s3ToS4 = getTransitionTimings(2, 3, false);
  assert.equal(s3ToS4.productX.duration, 700);
  assert.equal(s3ToS4.productY.duration, 1600);
  assert.equal(s3ToS4.productScale.duration, 1600);
  assert.equal(s3ToS4.darkStudioOpacity.delay, 350);
  assert.equal(s3ToS4.darkStudioOpacity.duration, 650);

  // Interpolation arrives cleanly at target end state
  const from = getSceneTargets(2, 'desktop');
  const to = getSceneTargets(3, 'desktop');
  const mid = interpolateSceneState(from, to, 800, s3ToS4);
  const end = interpolateSceneState(from, to, 1800, s3ToS4);

  assert.ok(mid.cream.x !== from.cream.x);
  assert.equal(end.cream.x, to.cream.x);
  assert.equal(end.cream.y, to.cream.y);
  assert.equal(end.darkStudioOpacity, 1);
});

test('gesture guard prevents trackpad inertia scene-skipping and clamps bounds', () => {
  const initial = {
    currentScene: 0 as const,
    isLocked: false,
    lastTriggerAt: -5000,
    lastWheelDelta: 0,
  };

  // Upward scroll at Scene 0 rejected
  const clampUp = evaluateStepRequest(initial, -1, 1000, false);
  assert.equal(clampUp.accepted, false);
  assert.equal(clampUp.nextScene, 0);

  // First downward scroll accepted -> Scene 1
  const step1 = evaluateStepRequest(initial, 1, 1000, false);
  assert.equal(step1.accepted, true);
  assert.equal(step1.nextScene, 1);
  assert.equal(step1.nextGuard.isLocked, true);

  // Inertia wheel event 100ms later rejected
  const inertia = evaluateStepRequest(
    { ...step1.nextGuard, isLocked: false },
    1,
    1100,
    false
  );
  assert.equal(inertia.accepted, false);
  assert.equal(inertia.nextScene, 1);

  // Gesture after cooldown accepted -> Scene 2
  const step2 = evaluateStepRequest(
    { ...step1.nextGuard, isLocked: false },
    1,
    1000 + SCENE_COOLDOWN_MS + 50,
    false
  );
  assert.equal(step2.accepted, true);
  assert.equal(step2.nextScene, 2);
});
