import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  ArrowLeft,
  Camera,
  ChevronDown,
  ChevronUp,
  Layers,
  PackageOpen,
  RefreshCw,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Sun,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { ProductId, SOMA_PRODUCTS, SomaProduct, getProductById } from '../data/products';
import { calculateRefillSchedule } from '../store/cartLogic';
import {
  LocalePreferences,
  UiDictionary,
  formatCurrencyAmount,
  formatProductVolume,
} from '../i18n/translations';

type LightingStudio = 'morning' | 'daylight' | 'nocturne';
type QualityMode = 'auto' | 'high' | 'performance';

interface ThreeProductStudioProps {
  initialProductId: ProductId;
  initialEngraving?: string;
  prefs: LocalePreferences;
  t: UiDictionary;
  onBack: () => void;
  onAddToBag: (
    productId: ProductId,
    options?: { isRefill?: boolean; engravingText?: string }
  ) => void;
}

function playTactileSound(kind: 'cap' | 'chime' | 'pump', enabled: boolean) {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (kind === 'cap') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.14);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.start(now);
      osc.stop(now + 0.17);
    } else if (kind === 'pump') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(95, now + 0.1);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.13);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(640, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.25);
      gain.gain.setValueAtTime(0.035, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.start(now);
      osc.stop(now + 0.3);
    }
    window.setTimeout(() => {
      ctx.close().catch(() => {});
    }, 350);
  } catch {
    // AudioContext blocked or unavailable
  }
}

function createWalnutTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#3E2B1E';
    ctx.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 512; y += 3) {
      const wave = Math.sin(y * 0.045) * 10;
      ctx.fillStyle = y % 6 === 0 ? 'rgba(26,17,11,0.34)' : 'rgba(94,65,44,0.22)';
      ctx.fillRect(0, y + (wave % 2), 512, 2);
    }
    for (let i = 0; i < 180; i++) {
      ctx.fillStyle = 'rgba(20,12,8,0.12)';
      ctx.fillRect((i * 37) % 512, (i * 53) % 512, 60, 1.5);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createBrushedGoldTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 256, 0);
    grad.addColorStop(0, '#B89A65');
    grad.addColorStop(0.5, '#DEC389');
    grad.addColorStop(1, '#A68750');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 128);
    for (let y = 0; y < 128; y += 2) {
      ctx.fillStyle = y % 4 === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(40,30,18,0.08)';
      ctx.fillRect(0, y, 256, 1);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createLabelTexture(product: SomaProduct, engraving: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 1024, 512);
    // Subtle frosted translucent label panel centered on front arc
    ctx.fillStyle = 'rgba(246, 243, 238, 0.14)';
    ctx.fillRect(280, 60, 464, 392);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#251D17';
    ctx.font = '500 54px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('SOMA FACE', 512, 180);

    // Hairline gold divider
    ctx.fillStyle = '#B89A65';
    ctx.fillRect(422, 206, 180, 2);

    // Product name (split cleanly across 2 lines if long)
    ctx.fillStyle = '#2A211B';
    ctx.font = '400 28px "Manrope", sans-serif';
    const words = product.name.split(' ');
    if (words.length > 2) {
      ctx.fillText(words.slice(0, 2).join(' '), 512, 258);
      ctx.fillText(words.slice(2).join(' '), 512, 294);
    } else {
      ctx.fillText(product.name, 512, 272);
    }

    ctx.fillStyle = '#5F5144';
    ctx.font = '400 20px "Manrope", sans-serif';
    ctx.fillText(`${product.volume.toUpperCase()}  ·  ATELIER FORMULATION`, 512, 344);

    // Optional live metallic gold engraving
    const clean = engraving.trim().toUpperCase().slice(0, 12);
    if (clean) {
      ctx.fillStyle = '#C9A96A';
      ctx.font = '600 26px "Cormorant Garamond", Georgia, serif';
      ctx.fillText(`✦  ${clean}  ✦`, 512, 412);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(128, 128, 12, 128, 128, 120);
    grad.addColorStop(0, 'rgba(12, 10, 8, 0.58)');
    grad.addColorStop(0.55, 'rgba(12, 10, 8, 0.24)');
    grad.addColorStop(1, 'rgba(12, 10, 8, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createTravertineTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#D9CFC0';
    ctx.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 512; y += 4) {
      ctx.fillStyle =
        y % 12 === 0 ? 'rgba(162, 139, 115, 0.18)' : 'rgba(246, 243, 238, 0.24)';
      ctx.fillRect(0, y, 512, 2);
    }
    for (let i = 0; i < 240; i++) {
      ctx.fillStyle = 'rgba(120, 102, 84, 0.14)';
      ctx.fillRect((i * 41) % 512, (i * 29) % 512, 18, 2);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

interface VesselRig {
  root: THREE.Group;
  capGroup: THREE.Group;
  collarMesh: THREE.Mesh;
  refillGroup: THREE.Group;
  liquidMesh: THREE.Mesh;
  labelMesh: THREE.Mesh;
  giftBoxGroup: THREE.Group;
  baseCapY: number;
  baseCollarY: number;
  baseRefillY: number;
  isPump: boolean;
  isDropper: boolean;
}

function buildSomaVesselGroup(
  product: SomaProduct,
  isSoftwareGl: boolean,
  textures: {
    walnut: THREE.CanvasTexture;
    gold: THREE.CanvasTexture;
    label: THREE.CanvasTexture;
  }
): VesselRig {
  const root = new THREE.Group();
  const isJar = product.vesselStyle === 'walnut-jar' || product.vesselStyle === 'matte-jar';
  const isWalnut = product.vesselStyle.startsWith('walnut-');
  const isPump = product.vesselStyle.endsWith('-pump');
  const isDropper = product.vesselStyle === 'walnut-dropper';

  const bodyRadius = isJar ? (product.id === 'eye-balm' ? 0.62 : 0.86) : product.id === 'deep-cleanse-oil' ? 0.62 : 0.46;
  const bodyHeight = isJar ? (product.id === 'eye-balm' ? 0.72 : 1.02) : product.id === 'deep-cleanse-oil' ? 2.15 : 1.95;

  // Frosted Glass Material (software-GL safe without heavy transmission multi-pass)
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(product.vesselTintHex),
    roughness: isSoftwareGl ? 0.34 : 0.28,
    metalness: 0.04,
    clearcoat: 0.45,
    clearcoatRoughness: 0.22,
    transparent: true,
    opacity: isSoftwareGl ? 0.88 : 0.82,
    reflectivity: 0.65,
  });

  // Heavy weighted frosted glass body via LatheGeometry
  const pts: THREE.Vector2[] = [
    new THREE.Vector2(0.001, 0),
    new THREE.Vector2(bodyRadius * 0.92, 0),
    new THREE.Vector2(bodyRadius, 0.08),
    new THREE.Vector2(bodyRadius, bodyHeight - 0.14),
    new THREE.Vector2(bodyRadius * 0.92, bodyHeight),
    new THREE.Vector2(bodyRadius * (isJar ? 0.86 : 0.52), bodyHeight),
  ];
  const outerGeo = new THREE.LatheGeometry(pts, 48);
  const outerMesh = new THREE.Mesh(outerGeo, glassMat);
  outerMesh.name = 'frosted-vessel-body';
  root.add(outerMesh);

  // Inner thickened crystal base disc
  const baseDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(bodyRadius * 0.88, bodyRadius * 0.86, 0.14, 40),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(product.vesselTintHex).offsetHSL(0, 0, 0.08),
      roughness: 0.18,
      metalness: 0.08,
    })
  );
  baseDisc.position.y = 0.075;
  root.add(baseDisc);

  // Inner Refill Capsule + Liquid/Emulsion Core
  const refillGroup = new THREE.Group();
  const innerRadius = bodyRadius * 0.78;
  const innerHeight = bodyHeight * 0.74;
  const capsuleWall = new THREE.Mesh(
    new THREE.CylinderGeometry(innerRadius, innerRadius * 0.97, innerHeight, 36),
    new THREE.MeshStandardMaterial({
      color: '#F6F3EE',
      roughness: 0.35,
      metalness: 0.05,
      transparent: true,
      opacity: 0.45,
    })
  );
  capsuleWall.position.y = innerHeight * 0.5;
  refillGroup.add(capsuleWall);

  const liquidMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(innerRadius * 0.92, innerRadius * 0.9, innerHeight * 0.88, 36),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(product.liquidTintHex),
      roughness: isJar ? 0.25 : 0.16,
      metalness: 0.04,
    })
  );
  liquidMesh.position.y = innerHeight * 0.46;
  refillGroup.add(liquidMesh);

  const baseRefillY = 0.16;
  refillGroup.position.y = baseRefillY;
  root.add(refillGroup);

  // Front Curved Label Cylinder (exact SOMA FACE typography + live engraving)
  const labelGeo = new THREE.CylinderGeometry(
    bodyRadius + 0.008,
    bodyRadius + 0.008,
    bodyHeight * 0.68,
    40,
    1,
    true,
    -Math.PI * 0.45,
    Math.PI * 0.9
  );
  const labelMat = new THREE.MeshStandardMaterial({
    map: textures.label,
    transparent: true,
    roughness: 0.45,
    metalness: 0.08,
    depthWrite: false,
  });
  const labelMesh = new THREE.Mesh(labelGeo, labelMat);
  labelMesh.position.y = bodyHeight * 0.5;
  root.add(labelMesh);

  // Brushed Champagne-Gold Collar Ring
  const collarRadius = isJar ? bodyRadius * 0.96 : bodyRadius * 0.56;
  const collarHeight = isJar ? 0.075 : 0.12;
  const goldMat = new THREE.MeshStandardMaterial({
    map: textures.gold,
    color: '#D4B678',
    metalness: 0.9,
    roughness: 0.24,
  });
  const collarMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(collarRadius, collarRadius, collarHeight, 44),
    goldMat
  );
  const baseCollarY = bodyHeight + collarHeight * 0.5;
  collarMesh.position.y = baseCollarY;
  root.add(collarMesh);

  // Cap / Dropper / Pump Group
  const capGroup = new THREE.Group();
  const capMat = isWalnut
    ? new THREE.MeshStandardMaterial({
        map: textures.walnut,
        roughness: 0.52,
        metalness: 0.06,
      })
    : new THREE.MeshStandardMaterial({
        color: '#191817',
        roughness: 0.62,
        metalness: 0.12,
      });

  if (isJar) {
    const capH = product.id === 'eye-balm' ? 0.34 : 0.44;
    const capMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(bodyRadius * 0.97, bodyRadius * 0.97, capH, 44),
      capMat
    );
    capMesh.position.y = capH * 0.5;
    capGroup.add(capMesh);

    // Subtle beveled crown ring
    const crown = new THREE.Mesh(
      new THREE.TorusGeometry(bodyRadius * 0.94, 0.025, 16, 44),
      capMat
    );
    crown.rotation.x = Math.PI * 0.5;
    crown.position.y = capH;
    capGroup.add(crown);
  } else if (isDropper) {
    // Walnut collar + soft matte dropper bulb + internal glass pipette stem
    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(bodyRadius * 0.58, bodyRadius * 0.58, 0.28, 36),
      capMat
    );
    collar.position.y = 0.14;
    capGroup.add(collar);

    const bulb = new THREE.Mesh(
      new THREE.CapsuleGeometry(bodyRadius * 0.28, 0.34, 12, 24),
      new THREE.MeshStandardMaterial({ color: '#1E1C1A', roughness: 0.72, metalness: 0.04 })
    );
    bulb.position.y = 0.46;
    capGroup.add(bulb);

    const pipette = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.032, bodyHeight * 0.8, 20),
      new THREE.MeshStandardMaterial({
        color: '#F5F0E8',
        transparent: true,
        opacity: 0.62,
        roughness: 0.12,
      })
    );
    pipette.position.y = -bodyHeight * 0.4;
    capGroup.add(pipette);
  } else if (isPump) {
    // Architectural actuator stem + curved dispensing spout
    const pumpHead = new THREE.Mesh(
      new THREE.CylinderGeometry(bodyRadius * 0.48, bodyRadius * 0.52, 0.36, 36),
      capMat
    );
    pumpHead.position.y = 0.18;
    capGroup.add(pumpHead);

    const nozzle = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.1, 0.44),
      capMat
    );
    nozzle.position.set(0, 0.28, 0.24);
    capGroup.add(nozzle);
  } else {
    // Tall architectural cylinder overcap (Luminous Repair Serum, The Essence Serum, Radiant Serum)
    const capH = 0.64;
    const tallCap = new THREE.Mesh(
      new THREE.CylinderGeometry(bodyRadius * 0.88, bodyRadius * 0.88, capH, 44),
      capMat
    );
    tallCap.position.y = capH * 0.5;
    capGroup.add(tallCap);
  }

  const baseCapY = bodyHeight + collarHeight;
  capGroup.position.y = baseCapY;
  root.add(capGroup);

  // Architectural Linen Outer Gift Sleeve (revealed when Virtual Unboxing is active)
  const giftBoxGroup = new THREE.Group();
  const boxW = bodyRadius * 2.5;
  const boxH = bodyHeight + 1.1;
  const sleeveMat = new THREE.MeshStandardMaterial({
    color: '#EAE3D7',
    roughness: 0.82,
    metalness: 0.02,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  });
  const sleeve = new THREE.Mesh(new THREE.BoxGeometry(boxW, boxH, boxW), sleeveMat);
  sleeve.position.y = boxH * 0.5;
  giftBoxGroup.add(sleeve);

  const goldRibbon = new THREE.Mesh(
    new THREE.BoxGeometry(boxW + 0.02, 0.05, boxW + 0.02),
    new THREE.MeshStandardMaterial({
      color: '#CFAF70',
      metalness: 0.85,
      roughness: 0.25,
      transparent: true,
      opacity: 0,
    })
  );
  goldRibbon.position.y = boxH * 0.55;
  giftBoxGroup.add(goldRibbon);
  giftBoxGroup.visible = false;
  root.add(giftBoxGroup);

  return {
    root,
    capGroup,
    collarMesh,
    refillGroup,
    liquidMesh,
    labelMesh,
    giftBoxGroup,
    baseCapY,
    baseCollarY,
    baseRefillY,
    isPump,
    isDropper,
  };
}

export function ThreeProductStudio({
  initialProductId,
  initialEngraving = '',
  prefs,
  t,
  onBack,
  onAddToBag,
}: ThreeProductStudioProps) {
  const [selectedId, setSelectedId] = useState<ProductId>(initialProductId);
  const [lighting, setLighting] = useState<LightingStudio>('morning');
  const [capOpen, setCapOpen] = useState(false);
  const [unboxingMode, setUnboxingMode] = useState(false);
  const [refillMode, setRefillMode] = useState(false);
  const [explodedAmount, setExplodedAmount] = useState(0);
  const [showSwatch, setShowSwatch] = useState(false);
  const [engraving, setEngraving] = useState(initialEngraving);
  const [asmrEnabled, setAsmrEnabled] = useState(false);
  const [qualityMode, setQualityMode] = useState<QualityMode>('auto');
  const [photoFallback, setPhotoFallback] = useState(false);
  const [arModalOpen, setArModalOpen] = useState(false);
  const [dockExpanded, setDockExpanded] = useState(true);
  const [usesPerDay, setUsesPerDay] = useState(2);

  const mountRef = useRef<HTMLDivElement>(null);
  const requestRenderRef = useRef<(() => void) | null>(null);
  const stateRef = useRef({
    capOpen,
    unboxingMode,
    refillMode,
    explodedAmount,
    lighting,
  });

  stateRef.current = {
    capOpen,
    unboxingMode,
    refillMode,
    explodedAmount,
    lighting,
  };

  const product = useMemo(() => getProductById(selectedId), [selectedId]);
  const lifespan = useMemo(
    () => calculateRefillSchedule(product.volumeValue, product.dosagePerUse, usesPerDay),
    [product.volumeValue, product.dosagePerUse, usesPerDay]
  );

  // Trigger re-render when interactive UI controls change
  useEffect(() => {
    requestRenderRef.current?.();
  }, [capOpen, unboxingMode, refillMode, explodedAmount, lighting, qualityMode]);

  // Three.js Scene Lifecycle
  useEffect(() => {
    if (photoFallback) return;
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: qualityMode !== 'performance',
        alpha: false,
        powerPreference: qualityMode === 'performance' ? 'low-power' : 'high-performance',
      });
    } catch {
      setPhotoFallback(true);
      return;
    }

    const gl = renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
    const isSoftwareGl =
      qualityMode === 'performance' || /swiftshader|llvmpipe|softpipe|mesa/i.test(rendererStr);

    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth || 1280, container.clientHeight || 720);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = false; // Crisp procedural contact shadow plane avoids shadow-pass stutter

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#E8DFD1');

    const camera = new THREE.PerspectiveCamera(
      34,
      (container.clientWidth || 1280) / (container.clientHeight || 720),
      0.1,
      50
    );
    camera.position.set(0.25, 2.35, 6.4);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.52, 0);
    controls.enablePan = false;
    controls.minDistance = 2.6;
    controls.maxDistance = 8.2;
    controls.minPolarAngle = 0.25;
    controls.maxPolarAngle = Math.PI * 0.495;
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.autoRotate = false;
    controls.update();

    // Physically based studio reflections via PMREM RoomEnvironment
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;

    // 3-Point Studio Lighting Rig
    const hemiLight = new THREE.HemisphereLight('#FFF8EC', '#8E7760', 0.9);
    const keyLight = new THREE.DirectionalLight('#FFF3DC', 2.1);
    keyLight.position.set(4.5, 6.2, 4.2);
    const rimLight = new THREE.DirectionalLight('#E8D4AE', 1.15);
    rimLight.position.set(-4.2, 3.8, -3.5);
    const fillLight = new THREE.PointLight('#F6E8CE', 0.85, 16);
    fillLight.position.set(-2.5, 2.2, 3.4);
    scene.add(hemiLight, keyLight, rimLight, fillLight);

    // Architectural Travertine Plinth & Grounded Contact Shadow
    const travertineTex = createTravertineTexture();
    const shadowTex = createContactShadowTexture();
    const plinthMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(1.75, 1.82, 0.24, 60),
      new THREE.MeshStandardMaterial({
        map: travertineTex,
        roughness: 0.78,
        metalness: 0.04,
      })
    );
    plinthMesh.position.y = -0.12;
    scene.add(plinthMesh);

    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(2.35, 2.35),
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
      })
    );
    shadowPlane.rotation.x = -Math.PI * 0.5;
    shadowPlane.position.y = 0.004;
    scene.add(shadowPlane);

    // Build selected SOMA FACE Vessel
    const walnutTex = createWalnutTexture();
    const goldTex = createBrushedGoldTexture();
    const labelTex = createLabelTexture(product, engraving);
    const rig = buildSomaVesselGroup(product, isSoftwareGl, {
      walnut: walnutTex,
      gold: goldTex,
      label: labelTex,
    });
    scene.add(rig.root);

    // Apply lighting studio mood
    const applyStudioMood = (mood: LightingStudio) => {
      if (mood === 'morning') {
        scene.background = new THREE.Color('#EAE1D3');
        keyLight.color.set('#FFF1D6');
        keyLight.intensity = 2.25;
        hemiLight.intensity = 0.95;
        rimLight.intensity = 1.15;
        renderer.toneMappingExposure = 1.12;
      } else if (mood === 'daylight') {
        scene.background = new THREE.Color('#F2EFEA');
        keyLight.color.set('#FFFFFF');
        keyLight.intensity = 2.0;
        hemiLight.intensity = 1.2;
        rimLight.intensity = 0.95;
        renderer.toneMappingExposure = 1.16;
      } else {
        scene.background = new THREE.Color('#131210');
        keyLight.color.set('#E8C98F');
        keyLight.intensity = 1.85;
        hemiLight.intensity = 0.42;
        rimLight.intensity = 1.65;
        renderer.toneMappingExposure = 1.02;
      }
    };

    // Animated interpolation targets
    const animState = {
      capLift: 0,
      refillLift: 0,
      explode: 0,
      unbox: 0,
      shimmerT: 0,
    };

    const applyRigTransforms = () => {
      const s = stateRef.current;
      applyStudioMood(s.lighting);

      const targetCap = s.capOpen ? 1 : 0;
      const targetRefill = s.refillMode ? 1 : 0;
      const targetExplode = s.explodedAmount;
      const targetUnbox = s.unboxingMode ? 1 : 0;

      if (isSoftwareGl) {
        animState.capLift = targetCap;
        animState.refillLift = targetRefill;
        animState.explode = targetExplode;
        animState.unbox = targetUnbox;
      } else {
        animState.capLift += (targetCap - animState.capLift) * 0.12;
        animState.refillLift += (targetRefill - animState.refillLift) * 0.12;
        animState.explode += (targetExplode - animState.explode) * 0.14;
        animState.unbox += (targetUnbox - animState.unbox) * 0.12;
      }

      // Cap / Pump / Dropper kinematics
      if (rig.isPump && animState.capLift > 0.01 && animState.explode < 0.05) {
        rig.capGroup.position.y = rig.baseCapY - animState.capLift * 0.16;
        rig.capGroup.rotation.y = 0;
      } else {
        const capRise =
          animState.capLift * (rig.isDropper ? 0.95 : 0.72) +
          animState.explode * 1.1 +
          animState.refillLift * 0.85;
        rig.capGroup.position.y = rig.baseCapY + capRise;
        rig.capGroup.rotation.y = animState.capLift * 0.95;
      }

      // Collar separation in exploded view
      rig.collarMesh.position.y = rig.baseCollarY + animState.explode * 0.55;

      // Refill capsule lift
      rig.refillGroup.position.y =
        rig.baseRefillY + Math.max(animState.refillLift * 0.95, animState.explode * 0.72);

      // Subtle internal liquid movement
      animState.shimmerT += 0.03;
      rig.liquidMesh.rotation.y = animState.shimmerT * 0.25;

      // Virtual Unboxing sleeve slide-off
      rig.giftBoxGroup.visible = animState.unbox > 0.02;
      if (rig.giftBoxGroup.visible) {
        rig.giftBoxGroup.position.y = (1 - animState.unbox) * 1.6;
        rig.giftBoxGroup.children.forEach((child) => {
          const mesh = child as THREE.Mesh;
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.opacity = animState.unbox * 0.82;
        });
      }
    };

    let rafId = 0;
    let renderQueued = false;

    const drawFrame = () => {
      applyRigTransforms();
      controls.update();
      renderer.render(scene, camera);
    };

    const requestRender = () => {
      if (isSoftwareGl) {
        if (renderQueued) return;
        renderQueued = true;
        rafId = requestAnimationFrame(() => {
          renderQueued = false;
          drawFrame();
        });
      }
    };
    requestRenderRef.current = requestRender;

    controls.addEventListener('change', requestRender);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 1280;
      const h = container.clientHeight || 720;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      drawFrame();
    };
    window.addEventListener('resize', onResize);

    if (isSoftwareGl) {
      drawFrame();
    } else {
      const loop = () => {
        rafId = requestAnimationFrame(loop);
        drawFrame();
      };
      rafId = requestAnimationFrame(loop);
    }

    return () => {
      requestRenderRef.current = null;
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      controls.removeEventListener('change', requestRender);
      controls.dispose();
      envTarget.dispose();
      pmrem.dispose();
      travertineTex.dispose();
      shadowTex.dispose();
      walnutTex.dispose();
      goldTex.dispose();
      labelTex.dispose();

      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      });

      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [product, engraving, photoFallback, qualityMode]);

  const handleToggleCap = useCallback(() => {
    setCapOpen((prev) => {
      const next = !prev;
      playTactileSound(product.vesselStyle.endsWith('-pump') ? 'pump' : 'cap', asmrEnabled);
      return next;
    });
  }, [asmrEnabled, product.vesselStyle]);

  return (
    <main
      className="relative h-screen w-screen overflow-hidden bg-[#131210] text-[#F2ECE1]"
      data-testid="three-product-studio"
    >
      {/* Full-Viewport 3D Canvas OR Photographic Fallback */}
      {photoFallback ? (
        <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-b from-[#EAE3D7] via-[#F6F3EE] to-[#D8CEBE] dark:from-[#1B1A18] dark:to-[#111110] p-8">
          <img
            src={product.cutoutImage}
            alt={`${product.brand} ${product.name}`}
            className="max-h-[55vh] w-auto object-contain drop-shadow-[0_24px_34px_rgba(17,17,16,0.28)]"
          />
          {engraving.trim() && (
            <p className="mt-4 border border-[#B6975C]/60 bg-[#191817]/90 px-4 py-1.5 font-display text-lg tracking-[0.26em] uppercase text-[#E7D09B]">
              {engraving.trim()}
            </p>
          )}
          <p className="mt-4 text-[12px] tracking-[0.14em] uppercase text-[#5C4E41]">
            High-Resolution Photographic Studio View
          </p>
        </div>
      ) : (
        <div ref={mountRef} className="h-full w-full cursor-grab active:cursor-grabbing" />
      )}

      {/* Top-Left Minimal Studio Title Overlay (compact, zero backdrop-blur) */}
      <div className="pointer-events-none fixed top-20 md:top-24 left-4 md:left-10 z-20 flex flex-col gap-2">
        <button
          type="button"
          onClick={onBack}
          className="pointer-events-auto inline-flex w-fit items-center gap-2 border border-[#CFAF70]/35 bg-[#1B1A18]/92 px-3.5 py-2 text-[10.5px] font-medium tracking-[0.18em] uppercase text-[#F2ECE1] hover:border-[#CFAF70] cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>

        <div className="pointer-events-auto border border-[#CFAF70]/22 bg-[#1B1A18]/92 px-4 py-3 max-w-[300px]">
          <p className="text-[9.5px] tracking-[0.22em] uppercase text-[#CFAF70]">
            {product.seriesLabel}
          </p>
          <h1 className="mt-0.5 font-display text-2xl font-light leading-tight text-[#F2ECE1]">
            {product.name}
          </h1>
          <p className="mt-1 text-[11.5px] text-[#F2ECE1]/75 tabular-nums">
            {formatProductVolume(product.volume, product.volumeImperial, prefs.volumeSystem)} &middot;{' '}
            {formatCurrencyAmount(
              refillMode && product.refillPriceUsd ? product.refillPriceUsd : product.price,
              prefs.currency
            )}
          </p>
        </div>
      </div>

      {/* Texture Swatch Simulation Panel (top-right, appears only when toggled) */}
      {showSwatch && (
        <div className="fixed top-20 md:top-24 right-4 md:right-10 z-20 w-[260px] border border-[#CFAF70]/35 bg-[#1B1A18]/95 p-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <span className="text-[10px] tracking-[0.2em] uppercase text-[#CFAF70]">
              Texture Swatch
            </span>
            <button
              type="button"
              onClick={() => setShowSwatch(false)}
              className="opacity-70 hover:opacity-100 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-3 h-32 w-full overflow-hidden border border-[#F2ECE1]/15">
            <img
              src={product.macroImage}
              alt={`${product.name} texture swatch`}
              className="h-full w-full object-cover"
            />
          </div>
          <p className="mt-2.5 text-[12px] font-light leading-relaxed text-[#F2ECE1]/82">
            {product.textureNote}
          </p>
        </div>
      )}

      {/* Collapsible Bottom Control Dock (zero mid-viewport occlusion, zero backdrop-blur) */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-1.5rem)] max-w-[1260px] border border-[#CFAF70]/25 bg-[#1B1A18]/96 shadow-2xl">
        {/* Dock Header Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#F2ECE1]/10">
          <div className="flex items-center gap-3 text-[10.5px] tracking-[0.18em] uppercase text-[#CFAF70]">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>3D Atelier Controls · Drag to Orbit · Scroll to Zoom</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setAsmrEnabled((v) => {
                  const next = !v;
                  playTactileSound('chime', next);
                  return next;
                });
              }}
              title="Toggle subtle tactile ASMR audio (muted by default)"
              className="inline-flex items-center gap-1 border border-[#F2ECE1]/18 px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase hover:border-[#CFAF70] cursor-pointer"
            >
              {asmrEnabled ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
              <span className="hidden sm:inline">ASMR</span>
            </button>
            <button
              type="button"
              onClick={() => setPhotoFallback((v) => !v)}
              className="inline-flex items-center gap-1 border border-[#F2ECE1]/18 px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase hover:border-[#CFAF70] cursor-pointer"
            >
              <Camera className="h-3 w-3" />
              <span className="hidden sm:inline">{photoFallback ? '3D WebGL' : 'Photo View'}</span>
            </button>
            <button
              type="button"
              onClick={() => setDockExpanded((e) => !e)}
              aria-label={dockExpanded ? 'Collapse studio controls' : 'Expand studio controls'}
              className="inline-flex h-7 w-7 items-center justify-center border border-[#F2ECE1]/18 hover:border-[#CFAF70] cursor-pointer"
            >
              {dockExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {dockExpanded && (
          <div className="p-4 space-y-3.5">
            {/* Row 1: Vessel Switcher (All 12) + Lighting Presets */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                <label
                  htmlFor="studio-vessel-select"
                  className="text-[10px] tracking-[0.16em] uppercase text-[#CFAF70] shrink-0"
                >
                  Vessel
                </label>
                <select
                  id="studio-vessel-select"
                  value={selectedId}
                  onChange={(e) => {
                    setSelectedId(e.target.value as ProductId);
                    setCapOpen(false);
                    setRefillMode(false);
                    playTactileSound('chime', asmrEnabled);
                  }}
                  className="flex-1 max-w-[300px] border border-[#F2ECE1]/20 bg-[#111110] px-3 py-1.5 text-[12px] text-[#F2ECE1] outline-none cursor-pointer"
                >
                  {SOMA_PRODUCTS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.orderLabel} · {p.name} ({p.volume})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <Sun className="h-3.5 w-3.5 text-[#CFAF70] mr-1" />
                {(
                  [
                    { id: 'morning', label: 'Morning Sun' },
                    { id: 'daylight', label: 'Mirror Daylight' },
                    { id: 'nocturne', label: 'Evening Nocturne' },
                  ] as const
                ).map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setLighting(preset.id)}
                    className={`border px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase transition-colors cursor-pointer ${
                      lighting === preset.id
                        ? 'border-[#CFAF70] bg-[#CFAF70] text-[#111110] font-medium'
                        : 'border-[#F2ECE1]/18 text-[#F2ECE1]/80 hover:border-[#CFAF70]'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 2: Interactive Kinematics, Refill, Unboxing, Exploded Slider, Engraving, AR, Add to Bag */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleToggleCap}
                className={`border px-3 py-1.5 text-[10.5px] tracking-[0.14em] uppercase transition-colors cursor-pointer ${
                  capOpen
                    ? 'border-[#CFAF70] bg-[#CFAF70] text-[#111110] font-medium'
                    : 'border-[#F2ECE1]/20 hover:border-[#CFAF70]'
                }`}
              >
                {product.vesselStyle.endsWith('-pump')
                  ? capOpen
                    ? 'Release Pump'
                    : 'Press Pump'
                  : product.vesselStyle === 'walnut-dropper'
                  ? capOpen
                    ? 'Seat Dropper'
                    : 'Lift Dropper'
                  : capOpen
                  ? 'Close Cap'
                  : 'Open Cap'}
              </button>

              <button
                type="button"
                onClick={() => setUnboxingMode((v) => !v)}
                className={`inline-flex items-center gap-1.5 border px-3 py-1.5 text-[10.5px] tracking-[0.14em] uppercase transition-colors cursor-pointer ${
                  unboxingMode
                    ? 'border-[#CFAF70] bg-[#CFAF70] text-[#111110] font-medium'
                    : 'border-[#F2ECE1]/20 hover:border-[#CFAF70]'
                }`}
              >
                <PackageOpen className="h-3.5 w-3.5" />
                Gift Box
              </button>

              {product.refillEligible && (
                <button
                  type="button"
                  onClick={() => {
                    setRefillMode((v) => !v);
                    playTactileSound('cap', asmrEnabled);
                  }}
                  className={`inline-flex items-center gap-1.5 border px-3 py-1.5 text-[10.5px] tracking-[0.14em] uppercase transition-colors cursor-pointer ${
                    refillMode
                      ? 'border-[#CFAF70] bg-[#CFAF70] text-[#111110] font-medium'
                      : 'border-[#F2ECE1]/20 hover:border-[#CFAF70]'
                  }`}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refill Capsule
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowSwatch((v) => !v)}
                className={`inline-flex items-center gap-1.5 border px-3 py-1.5 text-[10.5px] tracking-[0.14em] uppercase transition-colors cursor-pointer ${
                  showSwatch
                    ? 'border-[#CFAF70] bg-[#CFAF70] text-[#111110] font-medium'
                    : 'border-[#F2ECE1]/20 hover:border-[#CFAF70]'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Swatch
              </button>

              <label className="inline-flex items-center gap-2 border border-[#F2ECE1]/18 px-3 py-1 text-[10px] tracking-[0.14em] uppercase">
                <Layers className="h-3 w-3 text-[#CFAF70]" />
                <span>Explode</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={explodedAmount}
                  onChange={(e) => setExplodedAmount(Number(e.target.value))}
                  aria-label="Exploded vessel view slider"
                  className="w-20 accent-[#CFAF70]"
                />
              </label>

              {product.personalizationEligible && (
                <input
                  type="text"
                  maxLength={12}
                  value={engraving}
                  onChange={(e) => setEngraving(e.target.value)}
                  placeholder="Engrave (12 ch)"
                  aria-label="Live 3D gold engraving text"
                  className="w-36 border border-[#F2ECE1]/20 bg-[#111110] px-2.5 py-1.5 text-[11px] tracking-[0.14em] uppercase text-[#E7D09B] outline-none focus:border-[#CFAF70]"
                />
              )}

              <button
                type="button"
                onClick={() => setArModalOpen(true)}
                className="inline-flex items-center gap-1.5 border border-[#F2ECE1]/20 px-3 py-1.5 text-[10.5px] tracking-[0.14em] uppercase hover:border-[#CFAF70] cursor-pointer"
              >
                <Smartphone className="h-3.5 w-3.5" />
                WebAR
              </button>

              <select
                aria-label="3D rendering quality mode"
                value={qualityMode}
                onChange={(e) => setQualityMode(e.target.value as QualityMode)}
                className="border border-[#F2ECE1]/20 bg-[#111110] px-2 py-1.5 text-[10px] tracking-[0.12em] uppercase text-[#F2ECE1]/80"
              >
                <option value="auto">Quality: Auto</option>
                <option value="high">Quality: High</option>
                <option value="performance">Performance</option>
              </select>

              <button
                type="button"
                onClick={() =>
                  onAddToBag(product.id, {
                    isRefill: refillMode && product.refillEligible,
                    engravingText:
                      product.personalizationEligible && !refillMode ? engraving.trim() : undefined,
                  })
                }
                className="ml-auto border border-[#CFAF70] bg-[#CFAF70] px-4 py-1.5 text-[10.5px] font-medium tracking-[0.16em] uppercase text-[#111110] hover:bg-[#DEC185] cursor-pointer"
              >
                {refillMode && product.refillEligible ? 'Add Refill' : t.addToBag}
              </button>
            </div>

            {/* Refill Lifespan Strip (visible when Refill Capsule Mode is toggled) */}
            {refillMode && product.refillEligible && (
              <div className="pt-2.5 border-t border-[#F2ECE1]/10 flex flex-wrap items-center justify-between gap-3 text-[11.5px] text-[#F2ECE1]/80">
                <span>
                  <strong className="text-[#CFAF70] font-medium">Refill Capsule Mode:</strong> Keep
                  your frosted glass vessel and replace the inner cartridge cleanly.
                </span>
                <div className="flex items-center gap-2">
                  <span>Cadence:</span>
                  {[1, 2].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setUsesPerDay(f)}
                      className={`border px-2 py-0.5 text-[10px] uppercase cursor-pointer ${
                        usesPerDay === f ? 'border-[#CFAF70] text-[#CFAF70]' : 'border-[#F2ECE1]/20'
                      }`}
                    >
                      {f}x/day
                    </button>
                  ))}
                  <span className="tabular-nums opacity-85">
                    ~{lifespan.estimatedDays} days (next refill {lifespan.replenishmentDateIso})
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* WebAR Placement Panel */}
      {arModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#111110]/82 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="WebAR Vanity Placement Preview"
          onClick={(e) => {
            if (e.target === e.currentTarget) setArModalOpen(false);
          }}
        >
          <div className="w-full max-w-[520px] border border-[#CFAF70]/35 bg-[#1B1A18] p-6 md:p-8 text-[#F2ECE1] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#F2ECE1]/12 pb-3">
              <p className="text-[11px] tracking-[0.2em] uppercase text-[#CFAF70]">
                WebAR Vanity Placement
              </p>
              <button
                type="button"
                onClick={() => setArModalOpen(false)}
                className="cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <h2 className="font-display text-3xl font-light">{product.name}</h2>
            <p className="text-[13px] font-light leading-relaxed text-[#F2ECE1]/80">
              Preview physical vessel scale ({product.volume}) directly on your vanity surface. On
              WebXR-capable mobile browsers (iOS Safari Quick Look / Android Scene Viewer), connect
              custom `.usdz` or `.glb` vessel assets via `optionalModelUrl` in the catalog for native
              room-scale placement.
            </p>
            <div className="border border-[#F2ECE1]/14 bg-[#111110] p-4 flex items-center gap-4">
              <img
                src={product.cutoutImage}
                alt={product.name}
                className="h-24 w-16 object-contain shrink-0"
              />
              <div className="text-[12px] font-light space-y-1">
                <p className="text-[#CFAF70] uppercase tracking-[0.14em] text-[10px]">
                  Desktop Preview Scale
                </p>
                <p>Vessel Silhouette: {product.vesselStyle.replace('-', ' ')}</p>
                <p>
                  Volume: {formatProductVolume(product.volume, product.volumeImperial, prefs.volumeSystem)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setArModalOpen(false)}
              className="w-full border border-[#CFAF70] py-2.5 text-[11px] tracking-[0.18em] uppercase text-[#CFAF70] hover:bg-[#CFAF70] hover:text-[#111110] transition-colors cursor-pointer"
            >
              Return to 3D Studio
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
