import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FORMULA_MACROS,
  HERO_TRIO_IDS,
  ProductId,
  SOMA_ASSETS,
  getProductById,
} from '../data/products';
import { TRANSLATIONS, UiDictionary } from '../i18n/translations';
import {
  BASE_PRODUCT_DIMS,
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  SceneIndex,
  SceneTargets,
  StageMetrics,
  computeStageMetrics,
  getIntroStartTargets,
  getSceneTargets,
} from '../motion/stageMath';
import {
  NavigationGuardState,
  TOUCH_SWIPE_THRESHOLD,
  TransitionTimings,
  WHEEL_THRESHOLD,
  evaluateStepRequest,
  getTransitionTimings,
  interpolateSceneState,
} from '../motion/sceneController';

interface CampaignStageProps {
  activeScene: SceneIndex;
  onSceneChange: (scene: SceneIndex) => void;
  onExploreCollection: () => void;
  onShopCollection: () => void;
  onInspectProduct: (productId: ProductId) => void;
  onOpenRitualBuilder?: () => void;
  isActiveView: boolean;
  skipIntro?: boolean;
  t?: UiDictionary;
}

const FORMULA_DESKTOP_POSITIONS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 230, y: 612 }, // Silky Cream Texture
  { x: 405, y: 382 }, // Luminous Serum
  { x: 720, y: 306 }, // Refined Formulation
  { x: 1035, y: 382 }, // Delicate Eye Care
  { x: 1210, y: 612 }, // Daily Skin Ritual
];

export function CampaignStage({
  activeScene,
  onSceneChange,
  onExploreCollection,
  onShopCollection,
  onInspectProduct,
  onOpenRitualBuilder,
  isActiveView,
  skipIntro = false,
  t = TRANSLATIONS.en,
}: CampaignStageProps) {
  const [metrics, setMetrics] = useState<StageMetrics>(() =>
    computeStageMetrics(
      typeof window !== 'undefined' ? window.innerWidth : DESIGN_WIDTH,
      typeof window !== 'undefined' ? window.innerHeight : DESIGN_HEIGHT
    )
  );
  const [assetsReady, setAssetsReady] = useState(skipIntro);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [selectedMacroIndex, setSelectedMacroIndex] = useState<number>(0);

  // Scene-timed reveal flags (triggered cleanly by transition timers, never bouncing)
  const [introTextVisible, setIntroTextVisible] = useState(skipIntro);
  const [formulaTextVisible, setFormulaTextVisible] = useState(false);
  const [formulaCirclesVisible, setFormulaCirclesVisible] = useState(false);
  const [ritualTextVisible, setRitualTextVisible] = useState(false);
  const [collectionHeadlineVisible, setCollectionHeadlineVisible] = useState(false);
  const [collectionCtaVisible, setCollectionCtaVisible] = useState(false);

  // Direct DOM refs for 60 FPS rAF compositor-only updates (transform & opacity only)
  const heroBgLayerRef = useRef<HTMLDivElement>(null);
  const heroCameraRef = useRef<HTMLDivElement>(null);
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const ivoryBgRef = useRef<HTMLDivElement>(null);
  const taupePanelRef = useRef<HTMLDivElement>(null);
  const darkStudioLayerRef = useRef<HTMLDivElement>(null);

  const serumWrapRef = useRef<HTMLButtonElement>(null);
  const serumShadowRef = useRef<HTMLDivElement>(null);
  const creamWrapRef = useRef<HTMLButtonElement>(null);
  const creamShadowRef = useRef<HTMLDivElement>(null);
  const eyeBalmWrapRef = useRef<HTMLButtonElement>(null);
  const eyeBalmShadowRef = useRef<HTMLDivElement>(null);

  const handBackRef = useRef<HTMLDivElement>(null);
  const handFrontRef = useRef<HTMLDivElement>(null);
  const handPalmShadowRef = useRef<HTMLDivElement>(null);

  // Mutable animation engine refs
  const currentPoseRef = useRef<SceneTargets>(
    skipIntro
      ? getSceneTargets(activeScene, metrics.mode)
      : getIntroStartTargets(metrics.mode)
  );
  const transitionRef = useRef<{
    from: SceneTargets;
    to: SceneTargets;
    timings: TransitionTimings;
    startTime: number;
    running: boolean;
  } | null>(null);
  const prevSceneRef = useRef<SceneIndex | 'intro'>('intro');
  const metricsRef = useRef<StageMetrics>(metrics);
  const guardRef = useRef<NavigationGuardState>({
    currentScene: activeScene,
    isLocked: false,
    lastTriggerAt: -5000,
    lastWheelDelta: 0,
  });
  const touchStartYRef = useRef<number | null>(null);
  const touchStartXRef = useRef<number | null>(null);

  // Detect prefers-reduced-motion
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // Preload critical product cutouts & backdrops before opening animation begins
  useEffect(() => {
    if (assetsReady) return;
    let cancelled = false;
    const criticalUrls = [
      SOMA_ASSETS.heroEnvImage,
      SOMA_ASSETS.studioEnvImage,
      SOMA_ASSETS.handBack,
      SOMA_ASSETS.handForeground,
      ...HERO_TRIO_IDS.map((id) => getProductById(id).cutoutImage),
    ];

    const loaders = criticalUrls.map(
      (url) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = url;
        })
    );

    // Safety ceiling of 650ms so intro never stalls on slow connections
    const ceiling = new Promise<void>((resolve) => setTimeout(resolve, 650));

    Promise.race([Promise.all(loaders), ceiling]).then(() => {
      if (!cancelled) {
        setAssetsReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [assetsReady]);

  // Helper: map design coordinates into viewport pixels using cover/contain scaling
  const applyVisualState = useCallback((state: SceneTargets, m: StageMetrics) => {
    const isMobile = m.mode === 'mobile';
    const stageW = isMobile ? 410 : DESIGN_WIDTH;
    const stageH = isMobile ? 844 : DESIGN_HEIGHT;
    const scaleX = m.viewportWidth / stageW;
    const scaleY = m.viewportHeight / stageH;

    // Position helper preserving aspect-locked spatial continuity across desktop & mobile
    const mapX = (designX: number): number => {
      if (isMobile) {
        return (designX / stageW) * m.viewportWidth;
      }
      // On wide screens keep centered 1440-relative composition tied cleanly to cover/contain blend
      const centeredOffset = (designX - DESIGN_WIDTH * 0.5) * m.coverScale;
      // Blend toward contain on tall viewports so left/right pedestals stay inside frame
      const containOffset = (designX - DESIGN_WIDTH * 0.5) * m.containScale;
      const blend = m.viewportWidth / m.viewportHeight < 1.35 ? 0.15 : 0.85;
      return m.viewportWidth * 0.5 + containOffset + (centeredOffset - containOffset) * blend;
    };

    const mapY = (designY: number): number => {
      if (isMobile) {
        return (designY / stageH) * m.viewportHeight;
      }
      // Align vertical anchors cleanly with cover-fitted background environments
      const bgScale = m.coverScale;
      const bgRenderedH = DESIGN_HEIGHT * bgScale;
      const bgTop = (m.viewportHeight - bgRenderedH) * 0.5;
      return bgTop + designY * bgScale;
    };

    // Scale products proportionally to the background cover scale on desktop so pedestals stay locked
    const unitScale = isMobile
      ? Math.min(scaleX, scaleY)
      : m.coverScale * (m.viewportWidth / m.viewportHeight < 1.35 ? 0.9 : 1);

    // 1. Hero Environment + Subtle Cinematic Push-In
    if (heroBgLayerRef.current) {
      heroBgLayerRef.current.style.opacity = String(state.heroBgOpacity);
      heroBgLayerRef.current.style.transform = `translate3d(0, ${state.heroBgY}%, 0)`;
    }
    if (heroCameraRef.current) {
      heroCameraRef.current.style.transform = `scale3d(${state.cameraScale}, ${state.cameraScale}, 1)`;
    }

    // 2. Warm Ivory Backdrop (Scene 2)
    if (ivoryBgRef.current) {
      ivoryBgRef.current.style.opacity = String(state.ivoryBgOpacity);
    }

    // 3. Warm Taupe Rising Panel (Scene 3)
    if (taupePanelRef.current) {
      taupePanelRef.current.style.transform = `translate3d(0, ${state.taupePanelY}%, 0)`;
    }

    // 4. Dramatic Dark Mocha Studio (Scene 4)
    if (darkStudioLayerRef.current) {
      darkStudioLayerRef.current.style.opacity = String(state.darkStudioOpacity);
      const studioScale = 1 + (state.cameraScale - 1) * 0.7;
      darkStudioLayerRef.current.style.transform = `scale3d(${studioScale}, ${studioScale}, 1)`;
    }

    // 5. Persistent Product Layers (Serum, Overnight Cream, Active Eye Balm)
    const positionProduct = (
      el: HTMLButtonElement | null,
      shadowEl: HTMLDivElement | null,
      pose: SceneTargets['serum'],
      baseW: number,
      baseH: number
    ) => {
      if (!el) return;
      const w = baseW * unitScale * pose.scale;
      const h = baseH * unitScale * pose.scale;
      const px = mapX(pose.x) - w * 0.5;
      const py = mapY(pose.y) - h;

      el.style.width = `${w}px`;
      el.style.height = `${h}px`;
      el.style.transform = `translate3d(${px}px, ${py}px, 0)`;
      el.style.opacity = String(pose.opacity);
      el.style.pointerEvents = pose.opacity > 0.35 ? 'auto' : 'none';

      if (shadowEl) {
        shadowEl.style.opacity = String(pose.shadowOpacity);
      }
    };

    positionProduct(
      serumWrapRef.current,
      serumShadowRef.current,
      state.serum,
      BASE_PRODUCT_DIMS.serum.width,
      BASE_PRODUCT_DIMS.serum.height
    );
    positionProduct(
      creamWrapRef.current,
      creamShadowRef.current,
      state.cream,
      BASE_PRODUCT_DIMS.cream.width,
      BASE_PRODUCT_DIMS.cream.height
    );
    positionProduct(
      eyeBalmWrapRef.current,
      eyeBalmShadowRef.current,
      state.eyeBalm,
      BASE_PRODUCT_DIMS.eyeBalm.width,
      BASE_PRODUCT_DIMS.eyeBalm.height
    );

    // 6. Photorealistic Female Hand (Back layer behind jar + Foreground thumb/palm occlusion layer in front of jar!)
    const handW = isMobile ? 485 * unitScale : 920 * unitScale;
    const handH = handW * (768 / 1376);
    // Align palm cradle cleanly beneath the raised cream jar so thumb hugs the lower glass base without obscuring label typography
    const creamRestX = mapX(isMobile ? 222 : 472);
    const creamRestY = mapY(isMobile ? 405 : 630);
    const handRestLeft = creamRestX - handW * 0.675;
    const handRestTop = creamRestY - handH * 0.562;
    const handOffsetPx = state.handX * unitScale;

    const handTransform = `translate3d(${handRestLeft + handOffsetPx}px, ${handRestTop}px, 0)`;
    if (handBackRef.current) {
      handBackRef.current.style.width = `${handW}px`;
      handBackRef.current.style.height = `${handH}px`;
      handBackRef.current.style.transform = handTransform;
      handBackRef.current.style.opacity = String(state.handOpacity);
    }
    if (handFrontRef.current) {
      handFrontRef.current.style.width = `${handW}px`;
      handFrontRef.current.style.height = `${handH}px`;
      handFrontRef.current.style.transform = handTransform;
      handFrontRef.current.style.opacity = String(state.handOpacity);
    }
    if (handPalmShadowRef.current) {
      const shadowW = BASE_PRODUCT_DIMS.cream.width * unitScale * (isMobile ? 0.56 : 0.96);
      handPalmShadowRef.current.style.width = `${shadowW}px`;
      handPalmShadowRef.current.style.transform = `translate3d(${creamRestX - shadowW * 0.5 + handOffsetPx * 0.4}px, ${creamRestY - 12 * unitScale}px, 0)`;
      handPalmShadowRef.current.style.opacity = String(state.handOpacity * 0.52);
    }
  }, []);

  // Viewport resize listener
  useEffect(() => {
    const onResize = () => {
      const next = computeStageMetrics(window.innerWidth, window.innerHeight);
      metricsRef.current = next;
      setMetrics(next);
      const settledTarget = getSceneTargets(guardRef.current.currentScene, next.mode);
      if (!transitionRef.current?.running) {
        currentPoseRef.current = settledTarget;
        applyVisualState(settledTarget, next);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [applyVisualState]);

  // Pause hero video whenever Scene 1 is hidden or campaign route is not active (Section 13)
  useEffect(() => {
    const video = heroVideoRef.current;
    if (!video) return;
    if (isActiveView && activeScene === 0 && !reducedMotion) {
      video.play().catch(() => {
        // Autoplay policy fallback: still hero image behind video seamlessly remains visible
      });
    } else {
      video.pause();
    }
  }, [activeScene, isActiveView, reducedMotion]);

  // Trigger timed rAF channel transitions whenever activeScene or assetsReady changes
  useEffect(() => {
    if (!assetsReady) return;

    const prev = prevSceneRef.current;
    const target = getSceneTargets(activeScene, metricsRef.current.mode);
    const fromState =
      prev === 'intro'
        ? skipIntro || reducedMotion
          ? target
          : getIntroStartTargets(metricsRef.current.mode)
        : currentPoseRef.current;

    const timings = getTransitionTimings(prev, activeScene, reducedMotion || (prev === 'intro' && skipIntro));
    prevSceneRef.current = activeScene;
    guardRef.current.currentScene = activeScene;

    transitionRef.current = {
      from: fromState,
      to: target,
      timings,
      startTime: performance.now(),
      running: true,
    };

    // Scene-specific choreographed text & circular macro entrance timers
    const timers: number[] = [];

    if (activeScene === 0) {
      setFormulaTextVisible(false);
      setFormulaCirclesVisible(false);
      setRitualTextVisible(false);
      setCollectionHeadlineVisible(false);
      setCollectionCtaVisible(false);
      timers.push(
        window.setTimeout(() => setIntroTextVisible(true), reducedMotion || skipIntro ? 0 : 420)
      );
    } else if (activeScene === 1) {
      setIntroTextVisible(false);
      setRitualTextVisible(false);
      setCollectionHeadlineVisible(false);
      setCollectionCtaVisible(false);
      timers.push(window.setTimeout(() => setFormulaTextVisible(true), reducedMotion ? 0 : 280));
      // Section 6: Circular elements enter after 1000 ms (scale 0.7 -> 1, fade 0 -> 1)
      timers.push(window.setTimeout(() => setFormulaCirclesVisible(true), reducedMotion ? 0 : 1000));
    } else if (activeScene === 2) {
      setIntroTextVisible(false);
      setFormulaTextVisible(false);
      setFormulaCirclesVisible(false);
      setCollectionHeadlineVisible(false);
      setCollectionCtaVisible(false);
      timers.push(window.setTimeout(() => setRitualTextVisible(true), reducedMotion ? 0 : 320));
    } else if (activeScene === 3) {
      setIntroTextVisible(false);
      setFormulaTextVisible(false);
      setFormulaCirclesVisible(false);
      setRitualTextVisible(false);
      // Section 8: Headline entrance delay 1350ms, CTA entrance delay 1500ms
      timers.push(
        window.setTimeout(() => setCollectionHeadlineVisible(true), reducedMotion ? 0 : 1350)
      );
      timers.push(
        window.setTimeout(() => setCollectionCtaVisible(true), reducedMotion ? 0 : 1500)
      );
    }

    // Unlock gesture guard cleanly after primary channel finishes
    timers.push(
      window.setTimeout(() => {
        guardRef.current.isLocked = false;
      }, reducedMotion ? 80 : Math.min(timings.totalDuration, 1080))
    );

    let rafId = 0;
    const tick = (now: number) => {
      const tr = transitionRef.current;
      if (!tr || !tr.running) return;
      const elapsed = now - tr.startTime;
      const pose = interpolateSceneState(tr.from, tr.to, elapsed, tr.timings);
      currentPoseRef.current = pose;
      applyVisualState(pose, metricsRef.current);

      if (elapsed < tr.timings.totalDuration + 120) {
        rafId = requestAnimationFrame(tick);
      } else {
        currentPoseRef.current = tr.to;
        applyVisualState(tr.to, metricsRef.current);
        tr.running = false;
      }
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [activeScene, assetsReady, reducedMotion, skipIntro, applyVisualState]);

  // Step helper enforcing strict single-scene transitions
  const requestStep = useCallback(
    (direction: -1 | 1) => {
      const res = evaluateStepRequest(
        guardRef.current,
        direction,
        performance.now(),
        reducedMotion
      );
      if (res.accepted) {
        guardRef.current = res.nextGuard;
        onSceneChange(res.nextScene);
      }
    },
    [onSceneChange, reducedMotion]
  );

  // Wheel, keyboard, and touch swipe listeners (only while campaign view is active)
  useEffect(() => {
    if (!isActiveView) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (Math.abs(e.deltaY) < WHEEL_THRESHOLD) return;
      requestStep(e.deltaY > 0 ? 1 : -1);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        requestStep(1);
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        requestStep(-1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        guardRef.current.isLocked = false;
        onSceneChange(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        guardRef.current.isLocked = false;
        onSceneChange(3);
      } else if (e.key === '1' || e.key === '2' || e.key === '3' || e.key === '4') {
        guardRef.current.isLocked = false;
        onSceneChange((Number(e.key) - 1) as SceneIndex);
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      touchStartYRef.current = e.touches[0].clientY;
      touchStartXRef.current = e.touches[0].clientX;
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (touchStartYRef.current === null || touchStartXRef.current === null) return;
      const touch = e.changedTouches[0];
      const deltaY = touchStartYRef.current - touch.clientY;
      const deltaX = touchStartXRef.current - touch.clientX;
      touchStartYRef.current = null;
      touchStartXRef.current = null;

      if (Math.abs(deltaY) < TOUCH_SWIPE_THRESHOLD || Math.abs(deltaY) < Math.abs(deltaX)) {
        return;
      }
      requestStep(deltaY > 0 ? 1 : -1);
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [isActiveView, onSceneChange, requestStep]);

  const isMobile = metrics.mode === 'mobile';
  const selectedMacro = FORMULA_MACROS[selectedMacroIndex] ?? FORMULA_MACROS[0];

  const serumProduct = getProductById('serum');
  const creamProduct = getProductById('cream');
  const eyeBalmProduct = getProductById('eye-balm');

  return (
    <main
      className="relative h-screen w-screen overflow-hidden select-none bg-[#F5F0E8]"
      data-scene={activeScene + 1}
      data-testid="campaign-stage"
    >
      {/* =====================================================================
          LAYER 1: SCENE 1 — THE ESSENCE (WARM TRAVERTINE INTERIOR)
         ===================================================================== */}
      <div
        ref={heroBgLayerRef}
        className="absolute inset-0 z-[1] will-change-transform"
        style={{ opacity: 1 }}
      >
        <div
          ref={heroCameraRef}
          className="absolute inset-0 origin-center will-change-transform"
        >
          {/* High-res travertine interior photograph */}
          <img
            src={SOMA_ASSETS.heroEnvImage}
            alt="Sunlit minimalist travertine interior"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover object-center"
          />

          {/* Seamlessly looping ambient sunlight video (auto-paused when Scene 1 hidden) */}
          <video
            ref={heroVideoRef}
            src={SOMA_ASSETS.heroEnvVideo}
            poster={SOMA_ASSETS.heroEnvImage}
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover object-center opacity-75 pointer-events-none"
          />

          {/* Subtle directional natural sunlight moving gently across plaster & travertine */}
          <div
            aria-hidden="true"
            className={`${
              isActiveView && activeScene === 0 ? 'animate-sunbeam' : ''
            } pointer-events-none absolute -top-1/4 -left-1/4 h-[150%] w-[75%] bg-gradient-to-r from-transparent via-[#FFF9EE]/30 to-transparent blur-2xl`}
          />

          {/* Soft upper reading scrim so editorial headline stays effortlessly legible */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[42%] bg-gradient-to-b from-[#F5F0E8]/68 via-[#F5F0E8]/26 to-transparent"
          />
        </div>

        {/* Pale editorial SOMA FACE architectural wordmark behind collection (Section 5) */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-0 flex justify-center transition-opacity duration-[1200ms] ease-out ${
            introTextVisible && activeScene === 0 ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ top: isMobile ? '36%' : '35%' }}
        >
          <span className="font-display font-light uppercase tracking-[0.28em] text-[#9E8770]/[0.20] whitespace-nowrap text-[clamp(3.2rem,12.5vw,11.5rem)] leading-none">
            SOMA FACE
          </span>
        </div>
      </div>

      {/* =====================================================================
          LAYER 2: SCENE 2 — THE FORMULA (WARM IVORY ENVIRONMENT)
         ===================================================================== */}
      <div
        ref={ivoryBgRef}
        aria-hidden={activeScene !== 1}
        className="absolute inset-0 z-[2] pointer-events-none"
        style={{
          opacity: 0,
          background:
            'radial-gradient(circle at 50% 62%, #FBF8F3 0%, #F5F0E8 52%, #EAE0D2 100%)',
        }}
      />

      {/* =====================================================================
          LAYER 3: SCENE 3 — THE RITUAL (WARM TAUPE RISING PANEL)
         ===================================================================== */}
      <div
        ref={taupePanelRef}
        aria-hidden={activeScene !== 2}
        className="absolute inset-0 z-[3] pointer-events-none will-change-transform"
        style={{
          transform: 'translate3d(0, 105%, 0)',
          background:
            'radial-gradient(ellipse at 28% 55%, #B19B84 0%, #A28B73 54%, #8E7760 100%)',
        }}
      >
        {/* Soft natural directional side illumination */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-[#F5F0E8]/12 via-transparent to-[#30251F]/18"
        />
      </div>

      {/* =====================================================================
          LAYER 4: SCENE 4 — THE COLLECTION (DARK MOCHA LUXURY STUDIO)
         ===================================================================== */}
      <div
        ref={darkStudioLayerRef}
        aria-hidden={activeScene !== 3}
        className="absolute inset-0 z-[4] pointer-events-none will-change-transform bg-[#191817]"
        style={{ opacity: 0 }}
      >
        <img
          src={SOMA_ASSETS.studioEnvImage}
          alt="Dark mocha architectural stone pedestal studio"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover object-center"
        />
        {/* Subtle volumetric champagne-gold overhead studio light */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 55% 44% at 50% 24%, rgba(184, 154, 101, 0.14) 0%, rgba(48, 37, 31, 0.08) 50%, rgba(25, 24, 23, 0.42) 100%)',
          }}
        />
      </div>

      {/* =====================================================================
          LAYER 5: PERSISTENT PRODUCT CUTOUTS & PHOTOREALISTIC HAND OCCLUSION
          Order ensures true 3D occlusion in Scene 3:
            z-10: Serum
            z-11: Hand Back (back fingers curling behind jar)
            z-12: Palm Contact Shadow
            z-13: Restorative Overnight Cream (Central Anchor)
            z-14: Hand Foreground (thumb & lower palm naturally covering jar bottom)
            z-15: Active Eye Balm
         ===================================================================== */}
      <div className="absolute inset-0 z-[10] pointer-events-none">
        {/* Persistent Product 1: SOMA FACE — Luminous Repair Serum */}
        <button
          ref={serumWrapRef}
          type="button"
          onClick={() => onInspectProduct('serum')}
          aria-label={`${serumProduct.brand} ${serumProduct.name} — View details`}
          className="group absolute top-0 left-0 z-[10] origin-bottom will-change-transform cursor-pointer focus-visible:outline-none"
          style={{ opacity: 0 }}
        >
          <div
            ref={serumShadowRef}
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-[4%] left-1/2 -translate-x-1/2 h-[8%] w-[112%] rounded-full bg-[#191817]/45 blur-[8px]"
          />
          <img
            src={serumProduct.cutoutImage}
            alt="SOMA FACE Luminous Repair Serum 30 ml"
            referrerPolicy="no-referrer"
            draggable={false}
            className="relative h-full w-full object-contain transition-transform duration-300 group-hover:-translate-y-1 drop-shadow-[0_12px_18px_rgba(25,24,23,0.18)]"
          />
        </button>

        {/* Photorealistic Female Hand — Back Layer (forearm + four curved fingers behind jar) */}
        <div
          ref={handBackRef}
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-0 z-[11] will-change-transform"
          style={{ opacity: 0 }}
        >
          <img
            src={SOMA_ASSETS.handBack}
            alt=""
            referrerPolicy="no-referrer"
            draggable={false}
            className="h-full w-full object-contain drop-shadow-[0_18px_28px_rgba(48,37,31,0.24)]"
          />
        </div>

        {/* Soft ambient occlusion shadow cast by cream jar onto the palm */}
        <div
          ref={handPalmShadowRef}
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-0 z-[12] h-5 rounded-full bg-[#30251F]/55 blur-[10px] will-change-transform"
          style={{ opacity: 0 }}
        />

        {/* Persistent Product 2: SOMA FACE — Restorative Overnight Cream (Central Anchor) */}
        <button
          ref={creamWrapRef}
          type="button"
          onClick={() => onInspectProduct('cream')}
          aria-label={`${creamProduct.brand} ${creamProduct.name} — View details`}
          className="group absolute top-0 left-0 z-[13] origin-bottom will-change-transform cursor-pointer focus-visible:outline-none"
          style={{ opacity: 0 }}
        >
          <div
            ref={creamShadowRef}
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-[5%] left-1/2 -translate-x-1/2 h-[11%] w-[94%] rounded-full bg-[#191817]/48 blur-[10px]"
          />
          <img
            src={creamProduct.cutoutImage}
            alt="SOMA FACE Restorative Overnight Cream 50 ml"
            referrerPolicy="no-referrer"
            draggable={false}
            className="relative h-full w-full object-contain transition-transform duration-300 group-hover:-translate-y-1 drop-shadow-[0_14px_22px_rgba(25,24,23,0.18)]"
          />
        </button>

        {/* Photorealistic Female Hand — Foreground Occlusion Layer (thumb & front palm over jar base) */}
        <div
          ref={handFrontRef}
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-0 z-[14] will-change-transform"
          style={{ opacity: 0 }}
        >
          <img
            src={SOMA_ASSETS.handForeground}
            alt=""
            referrerPolicy="no-referrer"
            draggable={false}
            className="h-full w-full object-contain"
          />
        </div>

        {/* Persistent Product 3: SOMA FACE — Active Eye Balm */}
        <button
          ref={eyeBalmWrapRef}
          type="button"
          onClick={() => onInspectProduct('eye-balm')}
          aria-label={`${eyeBalmProduct.brand} ${eyeBalmProduct.name} — View details`}
          className="group absolute top-0 left-0 z-[15] origin-bottom will-change-transform cursor-pointer focus-visible:outline-none"
          style={{ opacity: 0 }}
        >
          <div
            ref={eyeBalmShadowRef}
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-[6%] left-1/2 -translate-x-1/2 h-[13%] w-[96%] rounded-full bg-[#191817]/48 blur-[9px]"
          />
          <img
            src={eyeBalmProduct.cutoutImage}
            alt="SOMA FACE Active Eye Balm 15 ml"
            referrerPolicy="no-referrer"
            draggable={false}
            className="relative h-full w-full object-contain transition-transform duration-300 group-hover:-translate-y-1 drop-shadow-[0_12px_18px_rgba(25,24,23,0.18)]"
          />
        </button>
      </div>

      {/* =====================================================================
          LAYER 6: EDITORIAL TYPOGRAPHY & INTERACTIVE SCENE OVERLAYS
         ===================================================================== */}

      {/* SCENE 1 EDITORIAL COPY — The Essence */}
      <section
        aria-label="Scene 1: The Essence"
        aria-hidden={activeScene !== 0}
        className={`absolute inset-x-0 top-0 z-[20] flex flex-col items-center text-center px-6 pt-20 md:pt-24 transition-all duration-[1000ms] ease-[cubic-bezier(.25,.1,.25,1)] ${
          activeScene === 0 && introTextVisible
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-3 pointer-events-none'
        }`}
      >
        <p className="text-[10px] md:text-[11px] font-medium tracking-[0.34em] uppercase text-[#8E7760]">
          DECODE &bull; BALANCE &bull; BEAUTY
        </p>
        <h1 className="mt-2 font-display text-[clamp(2.8rem,5.4vw,4.9rem)] font-light leading-[1.03] tracking-[0.02em] text-[#1C1B19] [text-wrap:balance]">
          {t.heroTitle}
        </h1>
        <p className="mt-3 max-w-md text-[14px] md:text-[15px] font-light tracking-[0.06em] text-[#30251F]/80">
          {t.heroSubtitle}
        </p>
        <div className="mt-5">
          <button
            type="button"
            onClick={onExploreCollection}
            className="inline-flex items-center gap-3 border border-[#1C1B19]/45 bg-[#F6F3EE]/92 px-7 py-2.5 text-[11.5px] font-medium tracking-[0.18em] uppercase text-[#1C1B19] transition-all duration-300 hover:bg-[#1C1B19] hover:text-[#F6F3EE] hover:border-[#1C1B19] cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#B6975C]"
          >
            {t.heroCta}
          </button>
        </div>
      </section>

      {/* SCENE 2 EDITORIAL COPY & 5-MACRO ARCH — The Formula */}
      <section
        aria-label="Scene 2: The Formula"
        aria-hidden={activeScene !== 1}
        className={`absolute inset-0 z-[20] ${
          activeScene === 1 ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
      >
        {/* Top Centered Headline */}
        <div
          className={`absolute inset-x-0 top-0 flex flex-col items-center text-center px-6 pt-20 md:pt-24 transition-all duration-[850ms] ease-[cubic-bezier(.25,.1,.25,1)] ${
            activeScene === 1 && formulaTextVisible
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-3'
          }`}
        >
          <h2 className="font-display text-[clamp(2.4rem,4.5vw,4rem)] font-light leading-[1.06] tracking-[0.02em] text-[#1C1B19] [text-wrap:balance]">
            {t.formulaTitle}
          </h2>
          <p className="mt-2.5 max-w-lg text-[13.5px] md:text-[14.5px] font-light tracking-[0.04em] text-[#30251F]/72">
            {selectedMacro.caption}
          </p>
        </div>

        {/* Desktop & Tablet: Five Circular Macro Images in a Balanced Arch */}
        {!isMobile && (
          <div className="absolute inset-0 pointer-events-none">
            {FORMULA_MACROS.map((macro, idx) => {
              const pos = FORMULA_DESKTOP_POSITIONS[idx];
              const leftPct = (pos.x / DESIGN_WIDTH) * 100;
              const topPct = (pos.y / DESIGN_HEIGHT) * 100;
              const isSelected = selectedMacroIndex === idx;
              const show = activeScene === 1 && formulaCirclesVisible;

              return (
                <button
                  key={macro.id}
                  type="button"
                  onClick={() => setSelectedMacroIndex(idx)}
                  onMouseEnter={() => setSelectedMacroIndex(idx)}
                  aria-label={`${macro.label}: ${macro.caption}`}
                  style={{
                    left: `${leftPct}%`,
                    top: `${topPct}%`,
                    transitionDuration: reducedMotion ? '0ms' : '720ms',
                    transitionDelay: reducedMotion ? '0ms' : `${idx * 65}ms`,
                    transform: show
                      ? 'translate3d(-50%, -50%, 0) scale(1)'
                      : 'translate3d(-50%, -50%, 0) scale(0.7)',
                    opacity: show ? 1 : 0,
                  }}
                  className={`group absolute flex flex-col items-center gap-3 transition-[transform,opacity] ease-[cubic-bezier(.25,.1,.25,1)] cursor-pointer focus-visible:outline-none ${
                    activeScene === 1 ? 'pointer-events-auto' : 'pointer-events-none'
                  }`}
                >
                  <div
                    className={`relative h-24 w-24 lg:h-32 lg:w-32 rounded-full p-1.5 transition-all duration-300 ${
                      isSelected
                        ? 'border border-[#B89A65] shadow-[0_14px_30px_rgba(48,37,31,0.12)]'
                        : 'border border-[#A28B73]/40 group-hover:border-[#B89A65]/80'
                    } bg-[#F5F0E8]`}
                  >
                    <div className="h-full w-full overflow-hidden rounded-full bg-[#EAE0D2]">
                      <img
                        src={macro.image}
                        alt={macro.label}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                  </div>
                  <span
                    className={`text-[11px] lg:text-[11.5px] font-medium tracking-[0.14em] uppercase whitespace-nowrap transition-colors duration-300 ${
                      isSelected ? 'text-[#30251F]' : 'text-[#30251F]/68 group-hover:text-[#30251F]'
                    }`}
                  >
                    {macro.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Mobile Balanced Vertical Arch Grid above Central Cream Jar */}
        {isMobile && (
          <div
            className={`absolute inset-x-0 top-[23%] px-5 transition-all duration-700 ease-out ${
              activeScene === 1 && formulaCirclesVisible
                ? 'opacity-100 scale-100'
                : 'opacity-0 scale-[0.85]'
            }`}
          >
            <div className="mx-auto grid max-w-[360px] grid-cols-3 gap-x-3 gap-y-4">
              {FORMULA_MACROS.slice(0, 3).map((macro, idx) => (
                <button
                  key={macro.id}
                  type="button"
                  onClick={() => setSelectedMacroIndex(idx)}
                  className="flex flex-col items-center gap-1.5 text-center"
                >
                  <span
                    className={`h-16 w-16 rounded-full p-1 border bg-[#F5F0E8] ${
                      selectedMacroIndex === idx ? 'border-[#B89A65]' : 'border-[#A28B73]/40'
                    }`}
                  >
                    <img
                      src={macro.image}
                      alt={macro.label}
                      referrerPolicy="no-referrer"
                      className="h-full w-full rounded-full object-cover"
                    />
                  </span>
                  <span className="text-[10px] leading-tight tracking-[0.08em] uppercase text-[#30251F]/80">
                    {macro.label}
                  </span>
                </button>
              ))}
            </div>
            <div className="mx-auto mt-3.5 flex max-w-[260px] justify-center gap-8">
              {FORMULA_MACROS.slice(3, 5).map((macro, offset) => {
                const idx = offset + 3;
                return (
                  <button
                    key={macro.id}
                    type="button"
                    onClick={() => setSelectedMacroIndex(idx)}
                    className="flex flex-col items-center gap-1.5 text-center"
                  >
                    <span
                      className={`h-16 w-16 rounded-full p-1 border bg-[#F5F0E8] ${
                        selectedMacroIndex === idx ? 'border-[#B89A65]' : 'border-[#A28B73]/40'
                      }`}
                    >
                      <img
                        src={macro.image}
                        alt={macro.label}
                        referrerPolicy="no-referrer"
                        className="h-full w-full rounded-full object-cover"
                      />
                    </span>
                    <span className="text-[10px] leading-tight tracking-[0.08em] uppercase text-[#30251F]/80">
                      {macro.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* SCENE 3 EDITORIAL COPY & STAGGERED PRODUCT ROWS — The Ritual */}
      <section
        aria-label="Scene 3: The Ritual"
        aria-hidden={activeScene !== 2}
        className={`absolute inset-0 z-[20] flex flex-col justify-end md:justify-center md:items-end px-6 pb-14 md:pb-0 md:pr-32 lg:pr-44 transition-opacity duration-500 ${
          activeScene === 2 ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="w-full md:w-[46%] lg:w-[42%] max-w-[540px]">
          <div
            className={`transition-all duration-[900ms] ease-[cubic-bezier(.25,.1,.25,1)] ${
              activeScene === 2 && ritualTextVisible
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-4'
            }`}
          >
            <h2 className="font-display text-[clamp(2.25rem,4.2vw,3.9rem)] font-light leading-[1.06] tracking-[0.02em] text-[#F5F0E8] [text-wrap:balance]">
              {t.ritualTitle}
            </h2>
          </div>

          <div className="mt-5 md:mt-8 divide-y divide-[#F5F0E8]/22 border-t border-b border-[#F5F0E8]/22">
            {HERO_TRIO_IDS.map((heroId, index) => {
              const product = getProductById(heroId);
              const stepNum = `0${index + 1}`;
              const show = activeScene === 2 && ritualTextVisible;
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => onInspectProduct(product.id)}
                  style={{
                    transitionDuration: reducedMotion ? '0ms' : '1000ms',
                    transitionDelay: reducedMotion ? '0ms' : `${index * 120}ms`,
                  }}
                  className={`group w-full py-3.5 md:py-5 flex items-center justify-between gap-4 text-left transition-[transform,opacity] ease-[cubic-bezier(.3,0,.05,1)] cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#F5F0E8] ${
                    show ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <h3 className="font-display text-[19px] md:text-[24px] font-normal tracking-[0.02em] text-[#F5F0E8] group-hover:text-[#F5F0E8]/85 transition-colors">
                      {stepNum} — {product.name}
                    </h3>
                    <p className="mt-1 text-[12.5px] md:text-[13.5px] font-light leading-relaxed text-[#F5F0E8]/80">
                      {product.ritualLine}
                    </p>
                  </div>

                  <div className="h-12 w-12 md:h-16 md:w-16 shrink-0 rounded-full border border-[#F5F0E8]/35 p-1 bg-[#8E7760]/40 transition-transform duration-300 group-hover:scale-105">
                    <img
                      src={product.macroImage}
                      alt={`${product.name} texture macro`}
                      referrerPolicy="no-referrer"
                      className="h-full w-full rounded-full object-cover"
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {onOpenRitualBuilder && (
            <div
              className={`mt-5 transition-opacity duration-700 ${
                activeScene === 2 && ritualTextVisible ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <button
                type="button"
                onClick={onOpenRitualBuilder}
                className="border border-[#F5F0E8]/45 px-5 py-2 text-[11px] font-medium tracking-[0.18em] uppercase text-[#F5F0E8] hover:bg-[#F5F0E8] hover:text-[#30251F] transition-colors cursor-pointer"
              >
                Build Your 3-Step Ritual (15% Off)
              </button>
            </div>
          )}
        </div>
      </section>

      {/* SCENE 4 EDITORIAL COPY & CHAMPAGNE-GOLD CTA — The Collection */}
      <section
        aria-label="Scene 4: The Collection"
        aria-hidden={activeScene !== 3}
        className={`absolute inset-x-0 top-0 z-[20] flex flex-col items-center text-center px-6 pt-22 md:pt-24 ${
          activeScene === 3 ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
      >
        <div
          className={`transition-all duration-[950ms] ease-[cubic-bezier(.25,.1,.25,1)] ${
            activeScene === 3 && collectionHeadlineVisible
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4'
          }`}
        >
          <h2 className="font-display text-[clamp(2.3rem,4.6vw,4.35rem)] font-light leading-[1.06] tracking-[0.14em] uppercase text-[#F2ECE1] [text-wrap:balance]">
            {t.collectionSceneTitle}
          </h2>
          <p className="mt-3 text-[13.5px] md:text-[15px] font-light tracking-[0.08em] text-[#D8C8B5]">
            {t.collectionSceneSubtitle}
          </p>
        </div>

        <div
          className={`mt-6 transition-all duration-[850ms] ease-[cubic-bezier(.25,.1,.25,1)] ${
            activeScene === 3 && collectionCtaVisible
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-3'
          }`}
        >
          <button
            type="button"
            onClick={onShopCollection}
            className="inline-flex items-center justify-center border border-[#CFAF70] bg-[#111110]/75 px-8 py-3 text-[12px] font-medium tracking-[0.2em] uppercase text-[#F2ECE1] transition-all duration-300 hover:bg-[#CFAF70] hover:text-[#111110] cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#F2ECE1]"
          >
            {t.collectionSceneCta}
          </button>
        </div>
      </section>
    </main>
  );
}
