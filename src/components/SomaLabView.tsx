import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Box,
  Camera,
  Check,
  FlaskConical,
  ScanFace,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
  Video,
  VideoOff,
} from 'lucide-react';
import { ProductId, SOMA_PRODUCTS, getProductById } from '../data/products';
import { SkinJournalEntry } from '../store/cartLogic';
import {
  LocalePreferences,
  UiDictionary,
  formatCurrencyAmount,
} from '../i18n/translations';
import { WeatherSnapshot } from './CollectionStore';

export type SomaLabTab = 'analysis' | 'simulator' | 'routine' | 'inci' | 'journal';

interface SomaLabViewProps {
  initialTab: SomaLabTab;
  prefs: LocalePreferences;
  t: UiDictionary;
  weather: WeatherSnapshot | null;
  onSelectProduct: (id: ProductId) => void;
  onInspect3D: (id: ProductId) => void;
  onAddToBag: (id: ProductId) => void;
  onAddRoutineToBag: (ids: ProductId[]) => void;
  onTabRouteChange?: (tab: SomaLabTab) => void;
}

interface SkinAnalysisResult {
  undertoneCalibration: string;
  observations: string[];
  limitations: string;
  routineSummary: string;
  recommendedIds: ProductId[];
}

interface RoutineGeneratorResult {
  headline: string;
  morning: Array<{ step: string; productId: ProductId; reason: string }>;
  evening: Array<{ step: string; productId: ProductId; reason: string }>;
  notes: string;
}

interface InciDecoderResult {
  summary: string;
  ingredients: Array<{ name: string; role: string; note: string }>;
  compatibilityCautions: string[];
  layeringSuggestions: { am: string; pm: string };
}

const JOURNAL_STORAGE_KEY = 'soma_skin_journal_v2';

function loadJournal(): SkinJournalEntry[] {
  try {
    const raw = localStorage.getItem(JOURNAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function SomaLabView({
  initialTab,
  prefs,
  t,
  weather,
  onSelectProduct,
  onInspect3D,
  onAddToBag,
  onAddRoutineToBag,
  onTabRouteChange,
}: SomaLabViewProps) {
  const [activeTab, setActiveTab] = useState<SomaLabTab>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const switchTab = (next: SomaLabTab) => {
    setActiveTab(next);
    onTabRouteChange?.(next);
  };

  // --- Shared Portrait State (Analysis + Virtual Simulator) ---
  const [portraitDataUrl, setPortraitDataUrl] = useState<string | null>(null);
  const [portraitConsent, setPortraitConsent] = useState(false);
  const [showLandmarks, setShowLandmarks] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // --- Tab 1: AI Skin Analysis ---
  const [analysisNotes, setAnalysisNotes] = useState('');
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<SkinAnalysisResult | null>(null);

  // --- Tab 2: Virtual Skincare Simulator ---
  const [simProductId, setSimProductId] = useState<ProductId>('serum');
  const [simTimeframe, setSimTimeframe] = useState<'instant' | 'day14' | 'day30'>('instant');
  const [simSlider, setSimSlider] = useState<number>(52);

  // --- Tab 3: AI Routine Generator ---
  const [skinFeel, setSkinFeel] = useState('Balanced to Dry');
  const [cosmeticFocus, setCosmeticFocus] = useState('Luminous comfort & overnight nourishment');
  const [routineLoading, setRoutineLoading] = useState(false);
  const [routineError, setRoutineError] = useState<string | null>(null);
  const [routineResult, setRoutineResult] = useState<RoutineGeneratorResult | null>(null);
  const [routineAddedNotice, setRoutineAddedNotice] = useState(false);

  // --- Tab 4: AI INCI Decoder ---
  const [inciText, setInciText] = useState('');
  const [inciProductId, setInciProductId] = useState<string>('');
  const [inciPhotoUrl, setInciPhotoUrl] = useState<string | null>(null);
  const [inciConsent, setInciConsent] = useState(false);
  const [inciLoading, setInciLoading] = useState(false);
  const [inciError, setInciError] = useState<string | null>(null);
  const [inciResult, setInciResult] = useState<InciDecoderResult | null>(null);

  // --- Tab 5: Private Skin Journal ---
  const [journal, setJournal] = useState<SkinJournalEntry[]>(loadJournal);
  const [journalDayTag, setJournalDayTag] = useState<SkinJournalEntry['dayTag']>('Day 1');
  const [journalHydration, setJournalHydration] = useState(7);
  const [journalAppearance, setJournalAppearance] = useState(7);
  const [journalNotes, setJournalNotes] = useState('');
  const [journalProducts, setJournalProducts] = useState<ProductId[]>(['serum', 'cream']);
  const [journalPhoto, setJournalPhoto] = useState<string | undefined>(undefined);
  const [compareLeftId, setCompareLeftId] = useState<string>('');
  const [compareRightId, setCompareRightId] = useState<string>('');

  useEffect(() => {
    try {
      localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(journal));
    } catch {
      // ignore storage quota errors
    }
  }, [journal]);

  // Stop webcam cleanly on unmount
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((tr) => tr.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Live webcam capture is unavailable in this browser. Please upload a portrait image.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
      });
      streamRef.current = stream;
      setCameraActive(true);
      window.setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 60);
    } catch {
      setCameraError('Camera access was denied or unavailable. You can upload a portrait photo instead.');
    }
  };

  const captureFromWebcam = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 640;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      setPortraitDataUrl(canvas.toDataURL('image/jpeg', 0.85));
    }
    stopCamera();
  };

  const handlePortraitUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setAnalysisError('Please select a JPEG, PNG, or WebP portrait image.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPortraitDataUrl(String(reader.result));
      setAnalysisError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleInciPhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setInciPhotoUrl(String(reader.result));
    reader.readAsDataURL(file);
  };

  const handleJournalPhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setJournalPhoto(String(reader.result));
    reader.readAsDataURL(file);
  };

  // --- API Handlers ---
  const runSkinAnalysis = async (e: FormEvent) => {
    e.preventDefault();
    setAnalysisError(null);
    if (!portraitDataUrl) {
      setAnalysisError('Please upload a portrait or capture a frame via webcam first.');
      return;
    }
    if (!portraitConsent) {
      setAnalysisError('Please confirm explicit photo analysis consent before submitting.');
      return;
    }

    setAnalysisLoading(true);
    try {
      const res = await fetch('/api/ai/skin-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageDataUrl: portraitDataUrl,
          consentAccepted: true,
          language: prefs.language,
          userNotes: analysisNotes.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAnalysisError(data?.error || 'Skin analysis service returned an error.');
      } else {
        setAnalysisResult(data);
      }
    } catch {
      setAnalysisError('Could not connect to SOMA LAB server analysis endpoint.');
    } finally {
      setAnalysisLoading(false);
    }
  };

  const runRoutineGenerator = async (e: FormEvent) => {
    e.preventDefault();
    setRoutineError(null);
    setRoutineLoading(true);
    try {
      const res = await fetch('/api/ai/routine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skinFeel,
          cosmeticFocus,
          language: prefs.language,
          weatherSummary: weather
            ? `${weather.city}: ${Math.round(weather.temperatureC)}C, ${Math.round(weather.humidityPct)}% humidity, UV ${weather.uvIndex}`
            : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRoutineError(data?.error || 'Routine generator returned an error.');
      } else {
        setRoutineResult(data);
      }
    } catch {
      setRoutineError('Could not reach SOMA LAB routine generator.');
    } finally {
      setRoutineLoading(false);
    }
  };

  const runInciDecoder = async (e: FormEvent) => {
    e.preventDefault();
    setInciError(null);
    if (!inciText.trim() && !inciProductId && !inciPhotoUrl) {
      setInciError('Paste an INCI list, select a SOMA FACE vessel, or upload a label photo.');
      return;
    }
    if (inciPhotoUrl && !inciConsent) {
      setInciError('Please confirm consent before submitting a label photograph.');
      return;
    }

    setInciLoading(true);
    try {
      const res = await fetch('/api/ai/inci-decoder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inciText: inciText.trim() || undefined,
          productId: inciProductId || undefined,
          imageDataUrl: inciPhotoUrl || undefined,
          consentAccepted: inciConsent,
          language: prefs.language,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInciError(data?.error || 'INCI decoder returned an error.');
      } else {
        setInciResult(data);
      }
    } catch {
      setInciError('Could not reach SOMA LAB INCI decoder.');
    } finally {
      setInciLoading(false);
    }
  };

  const handleAddJournalEntry = (e: FormEvent) => {
    e.preventDefault();
    const entry: SkinJournalEntry = {
      id: `jr-${Date.now()}`,
      dayTag: journalDayTag,
      createdAtIso: new Date().toISOString(),
      hydrationScore: journalHydration,
      appearanceScore: journalAppearance,
      notes: journalNotes.trim() || 'Calm daily ritual observation.',
      productsUsed: journalProducts,
      photoDataUrl: journalPhoto,
    };
    setJournal((prev) => [entry, ...prev]);
    setJournalNotes('');
    setJournalPhoto(undefined);
  };

  const simProduct = useMemo(() => getProductById(simProductId), [simProductId]);

  // Subtle natural skin-tone-preserving CSS optical radiance filter for Illustrative Simulator
  const simAfterFilter = useMemo(() => {
    if (simTimeframe === 'instant') return 'brightness(1.04) contrast(1.02) saturate(1.03)';
    if (simTimeframe === 'day14') return 'brightness(1.07) contrast(1.03) saturate(1.05)';
    return 'brightness(1.1) contrast(1.04) saturate(1.06)';
  }, [simTimeframe]);

  const leftJournal = journal.find((j) => j.id === compareLeftId) ?? journal[journal.length - 1];
  const rightJournal = journal.find((j) => j.id === compareRightId) ?? journal[0];

  return (
    <main
      className="min-h-screen bg-[#F6F3EE] dark:bg-[#111110] text-[#1C1B19] dark:text-[#F2ECE1] pt-24 md:pt-28 pb-24 px-5 md:px-12"
      data-testid="soma-lab-view"
    >
      <div className="mx-auto max-w-[1280px]">
        {/* Header */}
        <div className="border-b border-[#1C1B19]/12 dark:border-[#F2ECE1]/12 pb-6">
          <p className="text-[10.5px] font-medium tracking-[0.26em] uppercase text-[#8E7760] dark:text-[#CFAF70]">
            SOMA LAB &middot; AI SKIN INTELLIGENCE
          </p>
          <h1 className="mt-2 font-display text-4xl md:text-5xl font-light leading-tight">
            Decode. Balance. Beauty.
          </h1>
          <p className="mt-2 max-w-2xl text-[13.5px] font-light opacity-78">
            Cosmetic-only skin intelligence powered by server-side Gemini analysis, illustrative
            radiance simulation, verified catalog ritual curation, INCI transparency, and your
            private local skin journal.
          </p>

          {/* Module Tabs */}
          <div
            className="mt-6 flex flex-wrap items-center gap-2"
            role="tablist"
            aria-label="SOMA LAB Modules"
          >
            {(
              [
                { id: 'analysis', label: 'AI Skin Analysis', icon: ScanFace },
                { id: 'simulator', label: 'Virtual Simulator', icon: SlidersHorizontal },
                { id: 'routine', label: 'AI Routine Generator', icon: Sparkles },
                { id: 'inci', label: t.inciDecoderTitle, icon: FlaskConical },
                { id: 'journal', label: t.skinJournalTitle, icon: BookOpen },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => switchTab(tab.id)}
                  className={`inline-flex items-center gap-2 border px-4 py-2.5 text-[11px] font-medium tracking-[0.14em] uppercase transition-colors cursor-pointer ${
                    active
                      ? 'border-[#1C1B19] bg-[#1C1B19] text-[#F6F3EE] dark:border-[#CFAF70] dark:bg-[#CFAF70] dark:text-[#111110]'
                      : 'border-[#1C1B19]/18 dark:border-[#F2ECE1]/18 hover:border-[#B6975C]'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* =================================================================
            TAB 1: AI SKIN ANALYSIS
           ================================================================= */}
        {activeTab === 'analysis' && (
          <section className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8" aria-label="AI Skin Analysis">
            <form onSubmit={runSkinAnalysis} className="lg:col-span-5 space-y-5">
              <div className="border border-[#1C1B19]/14 dark:border-[#F2ECE1]/14 bg-[#EAE3D7]/45 dark:bg-[#1B1A18] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10.5px] font-medium tracking-[0.18em] uppercase text-[#8E7760] dark:text-[#CFAF70]">
                    Portrait Capture or Upload
                  </p>
                  <label className="inline-flex items-center gap-1.5 text-[11px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showLandmarks}
                      onChange={(e) => setShowLandmarks(e.target.checked)}
                      className="accent-[#B6975C]"
                    />
                    Landmark Grid
                  </label>
                </div>

                {/* Portrait Stage */}
                <div className="relative aspect-square w-full overflow-hidden border border-[#1C1B19]/14 dark:border-[#F2ECE1]/14 bg-[#191817] flex items-center justify-center">
                  {cameraActive ? (
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className="h-full w-full object-cover"
                    />
                  ) : portraitDataUrl ? (
                    <img
                      src={portraitDataUrl}
                      alt="Uploaded portrait for cosmetic analysis"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="text-center px-6 text-[#F2ECE1]/65 space-y-2">
                      <ScanFace className="h-10 w-10 mx-auto stroke-[1.2] text-[#CFAF70]" />
                      <p className="text-[12.5px] font-light">
                        Upload a natural daylight portrait or activate live webcam capture.
                      </p>
                    </div>
                  )}

                  {/* Optional Subtle Facial Landmark Alignment Guide */}
                  {showLandmarks && (portraitDataUrl || cameraActive) && (
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 200 200"
                      className="pointer-events-none absolute inset-0 h-full w-full opacity-55"
                    >
                      <ellipse
                        cx="100"
                        cy="98"
                        rx="54"
                        ry="70"
                        fill="none"
                        stroke="#CFAF70"
                        strokeWidth="0.7"
                        strokeDasharray="3 3"
                      />
                      <line x1="100" y1="24" x2="100" y2="174" stroke="#CFAF70" strokeWidth="0.5" />
                      <line x1="42" y1="88" x2="158" y2="88" stroke="#CFAF70" strokeWidth="0.5" />
                      <circle cx="78" cy="88" r="2.2" fill="#CFAF70" />
                      <circle cx="122" cy="88" r="2.2" fill="#CFAF70" />
                      <circle cx="100" cy="112" r="2" fill="#CFAF70" />
                      <circle cx="100" cy="136" r="2" fill="#CFAF70" />
                    </svg>
                  )}
                </div>

                {/* Upload & Camera Controls */}
                <div className="flex flex-wrap gap-2">
                  <label className="flex-1 inline-flex items-center justify-center gap-2 border border-[#1C1B19]/25 dark:border-[#F2ECE1]/25 py-2.5 px-3 text-[11px] font-medium tracking-[0.14em] uppercase hover:border-[#B6975C] cursor-pointer">
                    <Upload className="h-3.5 w-3.5" />
                    Upload Photo
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handlePortraitUpload}
                      className="sr-only"
                    />
                  </label>

                  {!cameraActive ? (
                    <button
                      type="button"
                      onClick={startCamera}
                      className="flex-1 inline-flex items-center justify-center gap-2 border border-[#1C1B19]/25 dark:border-[#F2ECE1]/25 py-2.5 px-3 text-[11px] font-medium tracking-[0.14em] uppercase hover:border-[#B6975C] cursor-pointer"
                    >
                      <Video className="h-3.5 w-3.5" />
                      Live Camera
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={captureFromWebcam}
                        className="flex-1 inline-flex items-center justify-center gap-2 border border-[#B6975C] bg-[#B6975C] text-[#111110] py-2.5 px-3 text-[11px] font-medium tracking-[0.14em] uppercase cursor-pointer"
                      >
                        <Camera className="h-3.5 w-3.5" />
                        Capture
                      </button>
                      <button
                        type="button"
                        onClick={stopCamera}
                        aria-label="Stop camera"
                        className="border border-[#1C1B19]/25 dark:border-[#F2ECE1]/25 px-3 py-2.5 cursor-pointer"
                      >
                        <VideoOff className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>

                {cameraError && (
                  <p className="text-[12px] text-[#9E3C2B] dark:text-[#F09A8A]">{cameraError}</p>
                )}

                <div>
                  <label
                    htmlFor="skin-notes-input"
                    className="block text-[10.5px] tracking-[0.16em] uppercase opacity-70"
                  >
                    Optional Skin-Feel Notes
                  </label>
                  <input
                    id="skin-notes-input"
                    type="text"
                    maxLength={240}
                    value={analysisNotes}
                    onChange={(e) => setAnalysisNotes(e.target.value)}
                    placeholder="e.g., feels tight in dry air, prefer light daytime finish…"
                    className="mt-1.5 w-full border border-[#1C1B19]/20 dark:border-[#F2ECE1]/20 bg-transparent px-3 py-2 text-[13px] outline-none focus:border-[#B6975C]"
                  />
                </div>

                {/* Explicit Photo Consent & Retention Disclosure */}
                <label className="flex items-start gap-2.5 border border-[#B6975C]/40 bg-[#F6F3EE]/70 dark:bg-[#111110]/70 p-3 text-[12px] font-light leading-relaxed cursor-pointer">
                  <input
                    type="checkbox"
                    checked={portraitConsent}
                    onChange={(e) => setPortraitConsent(e.target.checked)}
                    className="mt-0.5 accent-[#B6975C]"
                  />
                  <span>
                    I consent to temporary server-side AI cosmetic visual analysis of this photo.
                    Images are processed transiently for this request and are not permanently
                    stored on our servers. Cosmetic observations are not medical or dermatological
                    diagnosis.
                  </span>
                </label>

                {analysisError && (
                  <p className="text-[12.5px] text-[#9E3C2B] dark:text-[#F09A8A]" role="alert">
                    {analysisError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={analysisLoading}
                  className="w-full border border-[#1C1B19] bg-[#1C1B19] dark:border-[#CFAF70] dark:bg-[#CFAF70] dark:text-[#111110] py-3.5 text-[11.5px] font-medium tracking-[0.2em] uppercase text-[#F6F3EE] disabled:opacity-50 cursor-pointer"
                >
                  {analysisLoading ? 'Analyzing Portrait…' : 'Run AI Cosmetic Skin Analysis'}
                </button>
              </div>
            </form>

            {/* Right: Analysis Output */}
            <div className="lg:col-span-7 space-y-5">
              <div className="flex items-start gap-2.5 border border-[#B6975C]/40 bg-[#EAE3D7]/45 dark:bg-[#1B1A18] p-4 text-[12px] font-light">
                <ShieldAlert className="h-4 w-4 text-[#B6975C] shrink-0 mt-0.5" />
                <p>
                  <strong>Cosmetic Guidance Disclosure:</strong> SOMA LAB provides visual cosmetic
                  observations and product-layering suggestions grounded strictly in the SOMA FACE
                  catalog. It does not diagnose, treat, or evaluate medical skin conditions.
                </p>
              </div>

              {analysisResult ? (
                <div className="border border-[#1C1B19]/14 dark:border-[#F2ECE1]/14 bg-[#EAE3D7]/35 dark:bg-[#1B1A18] p-6 space-y-5">
                  <div>
                    <p className="text-[10.5px] tracking-[0.2em] uppercase text-[#8E7760] dark:text-[#CFAF70]">
                      Undertone &amp; Lighting Calibration
                    </p>
                    <p className="mt-1 font-display text-2xl font-light">
                      {analysisResult.undertoneCalibration}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10.5px] tracking-[0.2em] uppercase text-[#8E7760] dark:text-[#CFAF70]">
                      Visual Cosmetic Observations
                    </p>
                    <ul className="mt-2 space-y-1.5 text-[13.5px] font-light list-disc pl-5 opacity-88">
                      {analysisResult.observations.map((obs, idx) => (
                        <li key={idx}>{obs}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="text-[10.5px] tracking-[0.2em] uppercase text-[#8E7760] dark:text-[#CFAF70]">
                      Suggested Ritual Direction
                    </p>
                    <p className="mt-1 text-[13.5px] font-light leading-relaxed opacity-85">
                      {analysisResult.routineSummary}
                    </p>
                  </div>

                  <p className="text-[12px] italic opacity-70">{analysisResult.limitations}</p>

                  {analysisResult.recommendedIds.length > 0 && (
                    <div className="pt-4 border-t border-[#1C1B19]/12 dark:border-[#F2ECE1]/12">
                      <p className="text-[10.5px] tracking-[0.2em] uppercase text-[#8E7760] dark:text-[#CFAF70]">
                        Matched SOMA FACE Vessels
                      </p>
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {analysisResult.recommendedIds.map((id) => {
                          const p = getProductById(id);
                          return (
                            <div
                              key={id}
                              className="border border-[#1C1B19]/14 dark:border-[#F2ECE1]/14 bg-[#F6F3EE]/80 dark:bg-[#111110] p-3.5 flex flex-col justify-between gap-3"
                            >
                              <button
                                type="button"
                                onClick={() => onSelectProduct(id)}
                                className="h-28 flex items-end justify-center cursor-pointer"
                              >
                                <img src={p.cutoutImage} alt={p.name} className="max-h-full object-contain" />
                              </button>
                              <div>
                                <p className="font-display text-lg leading-tight">{p.name}</p>
                                <p className="text-[12px] opacity-70 tabular-nums">
                                  {formatCurrencyAmount(p.price, prefs.currency)}
                                </p>
                              </div>
                              <div className="flex gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => onAddToBag(id)}
                                  className="flex-1 border border-[#1C1B19] dark:border-[#CFAF70] py-1.5 text-[10px] tracking-[0.14em] uppercase cursor-pointer"
                                >
                                  Add
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onInspect3D(id)}
                                  title="Inspect in 3D Studio"
                                  className="border border-[#1C1B19]/25 dark:border-[#F2ECE1]/25 px-2 py-1.5 cursor-pointer"
                                >
                                  <Box className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="border border-[#1C1B19]/12 dark:border-[#F2ECE1]/12 p-10 text-center space-y-2 opacity-80">
                  <p className="font-display text-3xl font-light">Awaiting Portrait Study</p>
                  <p className="text-[13.5px] font-light max-w-md mx-auto">
                    Upload a daylight portrait or capture via webcam, check the photo consent box,
                    and submit to receive undertone calibration and tailored SOMA FACE ritual
                    recommendations.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* =================================================================
            TAB 2: VIRTUAL SKINCARE SIMULATOR (ILLUSTRATIVE BEFORE / AFTER)
           ================================================================= */}
        {activeTab === 'simulator' && (
          <section
            className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8"
            aria-label="Virtual Skincare Simulator"
          >
            <div className="lg:col-span-5 space-y-5">
              <div className="border border-[#1C1B19]/14 dark:border-[#F2ECE1]/14 bg-[#EAE3D7]/45 dark:bg-[#1B1A18] p-5 space-y-4">
                <p className="text-[10.5px] font-medium tracking-[0.2em] uppercase text-[#8E7760] dark:text-[#CFAF70]">
                  Illustrative Cosmetic Finish Preview
                </p>

                <div>
                  <label
                    htmlFor="sim-product-select"
                    className="block text-[10.5px] tracking-[0.15em] uppercase opacity-70"
                  >
                    Select SOMA FACE Vessel
                  </label>
                  <select
                    id="sim-product-select"
                    value={simProductId}
                    onChange={(e) => setSimProductId(e.target.value as ProductId)}
                    className="mt-1.5 w-full border border-[#1C1B19]/20 dark:border-[#F2ECE1]/20 bg-[#F6F3EE] dark:bg-[#111110] px-3 py-2.5 text-[13px] outline-none"
                  >
                    {SOMA_PRODUCTS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.volume})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <p className="text-[10.5px] tracking-[0.15em] uppercase opacity-70">
                    Illustrative Timeline
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: 'instant', label: 'Instant' },
                        { id: 'day14', label: 'Day 14' },
                        { id: 'day30', label: 'Day 30' },
                      ] as const
                    ).map((tf) => (
                      <button
                        key={tf.id}
                        type="button"
                        onClick={() => setSimTimeframe(tf.id)}
                        className={`border py-2 text-[11px] tracking-[0.14em] uppercase cursor-pointer ${
                          simTimeframe === tf.id
                            ? 'border-[#1C1B19] bg-[#1C1B19] text-[#F6F3EE] dark:border-[#CFAF70] dark:bg-[#CFAF70] dark:text-[#111110]'
                            : 'border-[#1C1B19]/20 dark:border-[#F2ECE1]/20'
                        }`}
                      >
                        {tf.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 border border-[#1C1B19]/12 dark:border-[#F2ECE1]/12 bg-[#F6F3EE]/70 dark:bg-[#111110] p-3">
                  <img
                    src={simProduct.cutoutImage}
                    alt={simProduct.name}
                    className="h-16 w-12 object-contain shrink-0"
                  />
                  <div className="text-[12.5px]">
                    <p className="font-display text-xl">{simProduct.name}</p>
                    <p className="font-light opacity-75">{simProduct.textureNote}</p>
                  </div>
                </div>

                <label className="w-full inline-flex items-center justify-center gap-2 border border-[#1C1B19]/25 dark:border-[#F2ECE1]/25 py-2.5 text-[11px] tracking-[0.15em] uppercase cursor-pointer hover:border-[#B6975C]">
                  <Upload className="h-3.5 w-3.5" />
                  {portraitDataUrl ? 'Replace Portrait Photo' : 'Upload Your Portrait'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePortraitUpload}
                    className="sr-only"
                  />
                </label>

                <div className="flex items-start gap-2 border border-[#B6975C]/45 p-3 text-[11.5px] font-light">
                  <ShieldAlert className="h-4 w-4 text-[#B6975C] shrink-0 mt-0.5" />
                  <span>
                    <strong>Illustrative Cosmetic Preview Only:</strong> Simulates subtle surface
                    radiance and hydration finish while preserving natural facial identity. Not a
                    guaranteed clinical or dermatological outcome.
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive Before / After Comparison Slider */}
            <div className="lg:col-span-7 space-y-3">
              <div className="relative aspect-[4/3] w-full overflow-hidden border border-[#1C1B19]/15 dark:border-[#CFAF70]/25 bg-[#1B1A18] select-none">
                {/* Base Layer (Before) */}
                {portraitDataUrl ? (
                  <img
                    src={portraitDataUrl}
                    alt="Before portrait"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <img
                    src={simProduct.macroImage}
                    alt="Studio skin texture study before"
                    className="h-full w-full object-cover"
                  />
                )}

                {/* Clipped Layer (Illustrative After) */}
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ clipPath: `inset(0 ${100 - simSlider}% 0 0)` }}
                >
                  {portraitDataUrl ? (
                    <img
                      src={portraitDataUrl}
                      alt="Illustrative cosmetic finish preview"
                      style={{ filter: simAfterFilter }}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <img
                      src={simProduct.macroImage}
                      alt="Studio skin texture study after"
                      style={{ filter: simAfterFilter }}
                      className="h-full w-full object-cover"
                    />
                  )}
                  {/* Delicate warm champagne sheen */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        'radial-gradient(circle at 46% 38%, rgba(246, 232, 206, 0.16) 0%, transparent 65%)',
                    }}
                  />
                </div>

                {/* Divider Hairline */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 w-px bg-[#CFAF70]"
                  style={{ left: `${simSlider}%` }}
                />

                <span className="absolute top-3 left-3 bg-[#111110]/85 px-2.5 py-1 text-[10px] tracking-[0.18em] uppercase text-[#CFAF70]">
                  Illustrative Preview ({simTimeframe})
                </span>
                <span className="absolute top-3 right-3 bg-[#111110]/85 px-2.5 py-1 text-[10px] tracking-[0.18em] uppercase text-[#F2ECE1]">
                  Original
                </span>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-[11px] tracking-[0.14em] uppercase opacity-70">Compare</span>
                <input
                  type="range"
                  min={5}
                  max={95}
                  value={simSlider}
                  onChange={(e) => setSimSlider(Number(e.target.value))}
                  aria-label="Before and after illustrative comparison slider"
                  className="flex-1 accent-[#B6975C]"
                />
                <button
                  type="button"
                  onClick={() => onAddToBag(simProduct.id)}
                  className="border border-[#1C1B19] bg-[#1C1B19] dark:border-[#CFAF70] dark:bg-[#CFAF70] dark:text-[#111110] px-4 py-2 text-[10.5px] font-medium tracking-[0.16em] uppercase text-[#F6F3EE] cursor-pointer"
                >
                  {t.addToBag}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* =================================================================
            TAB 3: AI ROUTINE GENERATOR
           ================================================================= */}
        {activeTab === 'routine' && (
          <section
            className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8"
            aria-label="AI Routine Generator"
          >
            <form onSubmit={runRoutineGenerator} className="lg:col-span-4 space-y-4">
              <div className="border border-[#1C1B19]/14 dark:border-[#F2ECE1]/14 bg-[#EAE3D7]/45 dark:bg-[#1B1A18] p-5 space-y-4">
                <p className="text-[10.5px] font-medium tracking-[0.2em] uppercase text-[#8E7760] dark:text-[#CFAF70]">
                  Tailor Your Morning &amp; Evening Ritual
                </p>

                <div>
                  <label
                    htmlFor="routine-feel"
                    className="block text-[10.5px] tracking-[0.15em] uppercase opacity-70"
                  >
                    How Does Your Skin Feel Today?
                  </label>
                  <select
                    id="routine-feel"
                    value={skinFeel}
                    onChange={(e) => setSkinFeel(e.target.value)}
                    className="mt-1.5 w-full border border-[#1C1B19]/20 dark:border-[#F2ECE1]/20 bg-[#F6F3EE] dark:bg-[#111110] px-3 py-2.5 text-[13px]"
                  >
                    <option value="Balanced to Dry">Balanced to Dry</option>
                    <option value="Dehydrated & Tight">Dehydrated &amp; Tight</option>
                    <option value="Combination & Seeking Matte Balance">
                      Combination &amp; Seeking Matte Balance
                    </option>
                    <option value="Delicate & Comfort-Seeking">Delicate &amp; Comfort-Seeking</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="routine-focus"
                    className="block text-[10.5px] tracking-[0.15em] uppercase opacity-70"
                  >
                    Cosmetic Ritual Priority
                  </label>
                  <input
                    id="routine-focus"
                    type="text"
                    value={cosmeticFocus}
                    onChange={(e) => setCosmeticFocus(e.target.value)}
                    className="mt-1.5 w-full border border-[#1C1B19]/20 dark:border-[#F2ECE1]/20 bg-transparent px-3 py-2.5 text-[13px] outline-none focus:border-[#B6975C]"
                  />
                </div>

                {weather && (
                  <p className="text-[12px] font-light opacity-75 border-t border-[#1C1B19]/10 dark:border-[#F2ECE1]/10 pt-3">
                    Live weather context included: <strong>{weather.city}</strong> (
                    {Math.round(weather.temperatureC)}&deg;C, {Math.round(weather.humidityPct)}% RH,
                    UV {weather.uvIndex.toFixed(1)}).
                  </p>
                )}

                {routineError && (
                  <p className="text-[12.5px] text-[#9E3C2B] dark:text-[#F09A8A]" role="alert">
                    {routineError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={routineLoading}
                  className="w-full border border-[#1C1B19] bg-[#1C1B19] dark:border-[#CFAF70] dark:bg-[#CFAF70] dark:text-[#111110] py-3 text-[11px] font-medium tracking-[0.18em] uppercase text-[#F6F3EE] disabled:opacity-50 cursor-pointer"
                >
                  {routineLoading ? 'Curating Ritual…' : 'Generate AI Routine'}
                </button>
              </div>
            </form>

            <div className="lg:col-span-8">
              {routineResult ? (
                <div className="border border-[#1C1B19]/14 dark:border-[#F2ECE1]/14 bg-[#EAE3D7]/35 dark:bg-[#1B1A18] p-6 space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1C1B19]/12 dark:border-[#F2ECE1]/12 pb-4">
                    <div>
                      <p className="text-[10px] tracking-[0.2em] uppercase text-[#8E7760] dark:text-[#CFAF70]">
                        Verified Catalog Prescription
                      </p>
                      <h2 className="mt-1 font-display text-3xl font-light">
                        {routineResult.headline}
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const uniqueIds = Array.from(
                          new Set([
                            ...routineResult.morning.map((m) => m.productId),
                            ...routineResult.evening.map((ev) => ev.productId),
                          ])
                        );
                        onAddRoutineToBag(uniqueIds);
                        setRoutineAddedNotice(true);
                        window.setTimeout(() => setRoutineAddedNotice(false), 1800);
                      }}
                      className="inline-flex items-center gap-2 border border-[#1C1B19] bg-[#1C1B19] dark:border-[#CFAF70] dark:bg-[#CFAF70] dark:text-[#111110] px-5 py-2.5 text-[11px] font-medium tracking-[0.16em] uppercase text-[#F6F3EE] cursor-pointer"
                    >
                      {routineAddedNotice ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          Routine Added (15% Applied)
                        </>
                      ) : (
                        'Add Complete Routine (15% Off)'
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(
                      [
                        { label: 'Morning Ritual (AM)', steps: routineResult.morning },
                        { label: 'Evening Ritual (PM)', steps: routineResult.evening },
                      ] as const
                    ).map((block) => (
                      <div key={block.label} className="space-y-3">
                        <h3 className="text-[11px] font-medium tracking-[0.2em] uppercase text-[#8E7760] dark:text-[#CFAF70]">
                          {block.label}
                        </h3>
                        {block.steps.map((s, idx) => {
                          const prod = getProductById(s.productId);
                          return (
                            <div
                              key={`${block.label}-${idx}`}
                              className="flex items-center gap-3.5 border border-[#1C1B19]/12 dark:border-[#F2ECE1]/12 bg-[#F6F3EE]/80 dark:bg-[#111110] p-3.5"
                            >
                              <img
                                src={prod.cutoutImage}
                                alt={prod.name}
                                className="h-16 w-12 object-contain shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <span className="text-[10px] tracking-[0.16em] uppercase text-[#8E7760] dark:text-[#CFAF70]">
                                  {s.step}
                                </span>
                                <p className="font-display text-lg leading-tight">{prod.name}</p>
                                <p className="mt-0.5 text-[12px] font-light opacity-75">
                                  {s.reason}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => onInspect3D(prod.id)}
                                title="Inspect in 3D Studio"
                                className="border border-[#1C1B19]/20 dark:border-[#F2ECE1]/20 p-2 hover:border-[#B6975C] cursor-pointer"
                              >
                                <Box className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>

                  <p className="text-[12.5px] font-light opacity-75 pt-2 border-t border-[#1C1B19]/10 dark:border-[#F2ECE1]/10">
                    {routineResult.notes}
                  </p>
                </div>
              ) : (
                <div className="border border-[#1C1B19]/12 dark:border-[#F2ECE1]/12 p-10 text-center space-y-2 opacity-80">
                  <p className="font-display text-3xl font-light">Curate Your AM &amp; PM Sequence</p>
                  <p className="text-[13.5px] font-light max-w-md mx-auto">
                    Select how your skin feels and your cosmetic priority to receive a verified
                    Cleanse, Treat, and Seal schedule built exclusively from the 12 SOMA FACE
                    vessels.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* =================================================================
            TAB 4: AI INCI DECODER (/ingredients-decoder)
           ================================================================= */}
        {activeTab === 'inci' && (
          <section className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8" aria-label="AI INCI Decoder">
            <form onSubmit={runInciDecoder} className="lg:col-span-5 space-y-4">
              <div className="border border-[#1C1B19]/14 dark:border-[#F2ECE1]/14 bg-[#EAE3D7]/45 dark:bg-[#1B1A18] p-5 space-y-4">
                <p className="text-[10.5px] font-medium tracking-[0.2em] uppercase text-[#8E7760] dark:text-[#CFAF70]">
                  Decode Ingredient Lists &amp; Layering
                </p>

                <div>
                  <label
                    htmlFor="inci-product-lookup"
                    className="block text-[10.5px] tracking-[0.15em] uppercase opacity-70"
                  >
                    1. Or Select a SOMA FACE Vessel
                  </label>
                  <select
                    id="inci-product-lookup"
                    value={inciProductId}
                    onChange={(e) => setInciProductId(e.target.value)}
                    className="mt-1.5 w-full border border-[#1C1B19]/20 dark:border-[#F2ECE1]/20 bg-[#F6F3EE] dark:bg-[#111110] px-3 py-2 text-[13px]"
                  >
                    <option value="">— Paste custom INCI below —</option>
                    {SOMA_PRODUCTS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.volume})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="inci-textarea"
                    className="block text-[10.5px] tracking-[0.15em] uppercase opacity-70"
                  >
                    2. Paste Ingredient List (INCI)
                  </label>
                  <textarea
                    id="inci-textarea"
                    rows={4}
                    value={inciText}
                    onChange={(e) => setInciText(e.target.value)}
                    placeholder="e.g., Aqua, Glycerin, Squalane, Niacinamide, Panthenol, Tocopherol…"
                    className="mt-1.5 w-full border border-[#1C1B19]/20 dark:border-[#F2ECE1]/20 bg-transparent p-3 text-[13px] outline-none focus:border-[#B6975C] resize-none"
                  />
                </div>

                <div>
                  <label className="w-full inline-flex items-center justify-center gap-2 border border-[#1C1B19]/25 dark:border-[#F2ECE1]/25 py-2.5 text-[11px] tracking-[0.15em] uppercase cursor-pointer hover:border-[#B6975C]">
                    <Upload className="h-3.5 w-3.5" />
                    {inciPhotoUrl ? 'Label Photo Attached' : '3. Optional: Upload Label Photo'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleInciPhotoUpload}
                      className="sr-only"
                    />
                  </label>
                  {inciPhotoUrl && (
                    <label className="mt-2 flex items-start gap-2 text-[11.5px] font-light cursor-pointer">
                      <input
                        type="checkbox"
                        checked={inciConsent}
                        onChange={(e) => setInciConsent(e.target.checked)}
                        className="mt-0.5 accent-[#B6975C]"
                      />
                      <span>I consent to transient AI text extraction from this label photo.</span>
                    </label>
                  )}
                </div>

                {inciError && (
                  <p className="text-[12.5px] text-[#9E3C2B] dark:text-[#F09A8A]" role="alert">
                    {inciError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={inciLoading}
                  className="w-full border border-[#1C1B19] bg-[#1C1B19] dark:border-[#CFAF70] dark:bg-[#CFAF70] dark:text-[#111110] py-3 text-[11px] font-medium tracking-[0.18em] uppercase text-[#F6F3EE] disabled:opacity-50 cursor-pointer"
                >
                  {inciLoading ? 'Decoding Formulation…' : 'Decode INCI & Layering'}
                </button>
              </div>
            </form>

            <div className="lg:col-span-7">
              {inciResult ? (
                <div className="border border-[#1C1B19]/14 dark:border-[#F2ECE1]/14 bg-[#EAE3D7]/35 dark:bg-[#1B1A18] p-6 space-y-5">
                  <div>
                    <p className="text-[10.5px] tracking-[0.2em] uppercase text-[#8E7760] dark:text-[#CFAF70]">
                      Formulation Overview
                    </p>
                    <p className="mt-1.5 text-[14px] font-light leading-relaxed">
                      {inciResult.summary}
                    </p>
                  </div>

                  {inciResult.ingredients.length > 0 && (
                    <div>
                      <p className="text-[10.5px] tracking-[0.2em] uppercase text-[#8E7760] dark:text-[#CFAF70]">
                        Ingredient Breakdown
                      </p>
                      <div className="mt-2.5 divide-y divide-[#1C1B19]/10 dark:divide-[#F2ECE1]/10 border-t border-b border-[#1C1B19]/10 dark:border-[#F2ECE1]/10">
                        {inciResult.ingredients.map((ing, i) => (
                          <div key={i} className="py-2.5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                            <div>
                              <span className="font-medium text-[13.5px]">{ing.name}</span>
                              <span className="ml-2 text-[10.5px] tracking-[0.14em] uppercase text-[#8E7760] dark:text-[#CFAF70]">
                                {ing.role}
                              </span>
                            </div>
                            <p className="text-[12.5px] font-light opacity-80 sm:text-right max-w-md">
                              {ing.note}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {inciResult.compatibilityCautions.length > 0 && (
                    <div>
                      <p className="text-[10.5px] tracking-[0.2em] uppercase text-[#8E7760] dark:text-[#CFAF70]">
                        Layering &amp; Compatibility Cautions
                      </p>
                      <ul className="mt-2 list-disc pl-5 text-[13px] font-light space-y-1 opacity-85">
                        {inciResult.compatibilityCautions.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#1C1B19]/12 dark:border-[#F2ECE1]/12 text-[13px]">
                    <div>
                      <p className="text-[10px] tracking-[0.18em] uppercase text-[#8E7760] dark:text-[#CFAF70]">
                        AM Layering
                      </p>
                      <p className="mt-1 font-light opacity-85">{inciResult.layeringSuggestions.am}</p>
                    </div>
                    <div>
                      <p className="text-[10px] tracking-[0.18em] uppercase text-[#8E7760] dark:text-[#CFAF70]">
                        PM Layering
                      </p>
                      <p className="mt-1 font-light opacity-85">{inciResult.layeringSuggestions.pm}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border border-[#1C1B19]/12 dark:border-[#F2ECE1]/12 p-10 text-center space-y-2 opacity-80">
                  <p className="font-display text-3xl font-light">Transparent Formulation Reading</p>
                  <p className="text-[13.5px] font-light max-w-md mx-auto">
                    Paste any cosmetic INCI list, inspect a SOMA FACE vessel’s verified status, or
                    upload a carton label photo to review cosmetic roles, compatibility cautions,
                    and AM/PM layering notes.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* =================================================================
            TAB 5: PRIVATE SKIN JOURNAL (/skin-journal)
           ================================================================= */}
        {activeTab === 'journal' && (
          <section className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8" aria-label="Private Skin Journal">
            <form onSubmit={handleAddJournalEntry} className="lg:col-span-5 space-y-4">
              <div className="border border-[#1C1B19]/14 dark:border-[#F2ECE1]/14 bg-[#EAE3D7]/45 dark:bg-[#1B1A18] p-5 space-y-4">
                <p className="text-[10.5px] font-medium tracking-[0.2em] uppercase text-[#8E7760] dark:text-[#CFAF70]">
                  Record Private Ritual Milestone
                </p>

                <div className="grid grid-cols-2 gap-2">
                  {(['Day 1', 'Day 14', 'Day 30', 'Daily Note'] as const).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setJournalDayTag(tag)}
                      className={`border py-2 text-[11px] tracking-[0.14em] uppercase cursor-pointer ${
                        journalDayTag === tag
                          ? 'border-[#1C1B19] bg-[#1C1B19] text-[#F6F3EE] dark:border-[#CFAF70] dark:bg-[#CFAF70] dark:text-[#111110]'
                          : 'border-[#1C1B19]/20 dark:border-[#F2ECE1]/20'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                <div className="space-y-3 text-[12px]">
                  <label className="block">
                    <span className="flex justify-between">
                      <span>Hydration Comfort Score</span>
                      <span className="tabular-nums font-medium">{journalHydration}/10</span>
                    </span>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={journalHydration}
                      onChange={(e) => setJournalHydration(Number(e.target.value))}
                      className="w-full accent-[#B6975C]"
                    />
                  </label>
                  <label className="block">
                    <span className="flex justify-between">
                      <span>Radiance &amp; Appearance Score</span>
                      <span className="tabular-nums font-medium">{journalAppearance}/10</span>
                    </span>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={journalAppearance}
                      onChange={(e) => setJournalAppearance(Number(e.target.value))}
                      className="w-full accent-[#B6975C]"
                    />
                  </label>
                </div>

                <div>
                  <p className="text-[10.5px] tracking-[0.14em] uppercase opacity-70 mb-2">
                    Vessels Used
                  </p>
                  <div className="max-h-32 overflow-y-auto grid grid-cols-2 gap-1.5 text-[11.5px]">
                    {SOMA_PRODUCTS.map((p) => {
                      const checked = journalProducts.includes(p.id);
                      return (
                        <label key={p.id} className="inline-flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setJournalProducts((prev) =>
                                checked ? prev.filter((id) => id !== p.id) : [...prev, p.id]
                              )
                            }
                            className="accent-[#B6975C]"
                          />
                          <span className="truncate">{p.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <textarea
                  rows={3}
                  value={journalNotes}
                  onChange={(e) => setJournalNotes(e.target.value)}
                  placeholder="Personal sensory notes, sleep quality, climate feel…"
                  className="w-full border border-[#1C1B19]/20 dark:border-[#F2ECE1]/20 bg-transparent p-3 text-[13px] outline-none focus:border-[#B6975C] resize-none"
                />

                <label className="w-full inline-flex items-center justify-center gap-2 border border-[#1C1B19]/25 dark:border-[#F2ECE1]/25 py-2 text-[11px] tracking-[0.14em] uppercase cursor-pointer">
                  <Upload className="h-3.5 w-3.5" />
                  {journalPhoto ? 'Photo Attached (Local Only)' : 'Attach Optional Portrait'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleJournalPhotoUpload}
                    className="sr-only"
                  />
                </label>

                <button
                  type="submit"
                  className="w-full border border-[#1C1B19] bg-[#1C1B19] dark:border-[#CFAF70] dark:bg-[#CFAF70] dark:text-[#111110] py-3 text-[11px] font-medium tracking-[0.18em] uppercase text-[#F6F3EE] cursor-pointer"
                >
                  Save to Private Journal
                </button>
              </div>
            </form>

            {/* Right: Visual Comparison + Chronological Timeline */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl font-light">
                  Your Local Timeline ({journal.length})
                </h2>
                {journal.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setJournal([])}
                    className="text-[10.5px] tracking-[0.16em] uppercase opacity-65 hover:opacity-100 cursor-pointer"
                  >
                    Clear All Records
                  </button>
                )}
              </div>

              {/* Side-by-Side Milestone Comparison when >= 2 records exist */}
              {journal.length >= 2 && leftJournal && rightJournal && (
                <div className="border border-[#B6975C]/35 bg-[#EAE3D7]/35 dark:bg-[#1B1A18] p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[10.5px] tracking-[0.2em] uppercase text-[#8E7760] dark:text-[#CFAF70]">
                      Milestone Comparison (Day 1 / Day 14 / Day 30)
                    </p>
                    <div className="flex gap-2 text-[11.5px]">
                      <select
                        value={leftJournal.id}
                        onChange={(e) => setCompareLeftId(e.target.value)}
                        className="border border-[#1C1B19]/20 dark:border-[#F2ECE1]/20 bg-transparent px-2 py-1"
                      >
                        {journal.map((j) => (
                          <option key={j.id} value={j.id}>
                            {j.dayTag} · {new Date(j.createdAtIso).toLocaleDateString()}
                          </option>
                        ))}
                      </select>
                      <select
                        value={rightJournal.id}
                        onChange={(e) => setCompareRightId(e.target.value)}
                        className="border border-[#1C1B19]/20 dark:border-[#F2ECE1]/20 bg-transparent px-2 py-1"
                      >
                        {journal.map((j) => (
                          <option key={j.id} value={j.id}>
                            {j.dayTag} · {new Date(j.createdAtIso).toLocaleDateString()}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {[leftJournal, rightJournal].map((entry) => (
                      <div key={entry.id} className="border border-[#1C1B19]/12 dark:border-[#F2ECE1]/12 p-3 space-y-2">
                        <span className="text-[10px] tracking-[0.16em] uppercase text-[#B6975C]">
                          {entry.dayTag}
                        </span>
                        {entry.photoDataUrl && (
                          <img
                            src={entry.photoDataUrl}
                            alt={entry.dayTag}
                            className="h-36 w-full object-cover"
                          />
                        )}
                        <p className="text-[12px] tabular-nums">
                          Hydration {entry.hydrationScore}/10 &middot; Radiance{' '}
                          {entry.appearanceScore}/10
                        </p>
                        <p className="text-[12px] font-light opacity-80">{entry.notes}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {journal.length === 0 ? (
                <div className="border border-[#1C1B19]/12 dark:border-[#F2ECE1]/12 p-10 text-center opacity-75">
                  <p className="font-display text-2xl font-light">Begin Your Ritual Journal</p>
                  <p className="mt-1.5 text-[13px] font-light">
                    Entries stay strictly inside your browser’s local storage and can be deleted at
                    any time.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {journal.map((entry) => (
                    <article
                      key={entry.id}
                      className="border border-[#1C1B19]/12 dark:border-[#F2ECE1]/12 bg-[#EAE3D7]/30 dark:bg-[#1B1A18] p-4 flex gap-4 justify-between"
                    >
                      <div className="flex gap-4 min-w-0">
                        {entry.photoDataUrl && (
                          <img
                            src={entry.photoDataUrl}
                            alt={entry.dayTag}
                            className="h-20 w-20 object-cover shrink-0 border border-[#1C1B19]/12"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="text-[10.5px] tracking-[0.18em] uppercase text-[#8E7760] dark:text-[#CFAF70]">
                            {entry.dayTag} &middot; {new Date(entry.createdAtIso).toLocaleDateString()}
                          </p>
                          <p className="mt-1 text-[12.5px] tabular-nums font-medium">
                            Hydration {entry.hydrationScore}/10 &middot; Appearance{' '}
                            {entry.appearanceScore}/10
                          </p>
                          <p className="mt-1 text-[13px] font-light opacity-85">{entry.notes}</p>
                          {entry.productsUsed.length > 0 && (
                            <p className="mt-1.5 text-[11px] opacity-65">
                              Used: {entry.productsUsed.map((id) => getProductById(id).name).join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setJournal((prev) => prev.filter((item) => item.id !== entry.id))}
                        aria-label="Delete journal entry"
                        className="h-8 w-8 shrink-0 inline-flex items-center justify-center opacity-55 hover:opacity-100 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
