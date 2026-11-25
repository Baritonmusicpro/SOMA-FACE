import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Box,
  Check,
  Heart,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { ProductId, SomaProduct, getProductById } from '../data/products';
import {
  ENGRAVING_FEE_USD,
  SUBSCRIPTION_DISCOUNT_RATE,
  calculateRefillSchedule,
} from '../store/cartLogic';
import {
  LocalePreferences,
  UiDictionary,
  formatCurrencyAmount,
  formatProductVolume,
} from '../i18n/translations';

interface ProductDetailPageProps {
  product: SomaProduct | null;
  mode: 'page' | 'modal';
  prefs: LocalePreferences;
  t: UiDictionary;
  isFavorite: boolean;
  onToggleFavorite: (productId: ProductId) => void;
  onCloseOrBack: () => void;
  onSelectRelated: (productId: ProductId) => void;
  onInspect3D: (productId: ProductId, initialEngraving?: string) => void;
  onAddToBag: (
    productId: ProductId,
    options?: {
      isRefill?: boolean;
      isSubscription?: boolean;
      subscriptionIntervalDays?: 30 | 45 | 60;
      engravingText?: string;
    }
  ) => void;
}

export function ProductDetailPage({
  product,
  mode,
  prefs,
  t,
  isFavorite,
  onToggleFavorite,
  onCloseOrBack,
  onSelectRelated,
  onInspect3D,
  onAddToBag,
}: ProductDetailPageProps) {
  const [purchaseType, setPurchaseType] = useState<'full' | 'refill'>('full');
  const [isSubscription, setIsSubscription] = useState(false);
  const [subInterval, setSubInterval] = useState<30 | 45 | 60>(45);
  const [engravingText, setEngravingText] = useState('');
  const [usesPerDay, setUsesPerDay] = useState<number>(2);
  const [addedFeedback, setAddedFeedback] = useState(false);

  useEffect(() => {
    setPurchaseType('full');
    setIsSubscription(false);
    setEngravingText('');
    setAddedFeedback(false);
  }, [product?.id]);

  useEffect(() => {
    if (mode !== 'modal' || !product) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseOrBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, product, onCloseOrBack]);

  const lifespan = useMemo(() => {
    if (!product) return null;
    return calculateRefillSchedule(product.volumeValue, product.dosagePerUse, usesPerDay);
  }, [product, usesPerDay]);

  if (!product) return null;

  const isRefillSelected =
    purchaseType === 'refill' && product.refillEligible && product.refillPriceUsd !== null;
  const baseUnitUsd = isRefillSelected ? product.refillPriceUsd! : product.price;
  const effectiveUnitUsd = isSubscription
    ? Math.round(baseUnitUsd * (1 - SUBSCRIPTION_DISCOUNT_RATE))
    : baseUnitUsd;
  const engravingUsd =
    product.personalizationEligible && !isRefillSelected && engravingText.trim().length > 0
      ? ENGRAVING_FEE_USD
      : 0;

  const handleAdd = () => {
    onAddToBag(product.id, {
      isRefill: isRefillSelected,
      isSubscription,
      subscriptionIntervalDays: isSubscription ? subInterval : undefined,
      engravingText:
        product.personalizationEligible && !isRefillSelected ? engravingText.trim() : undefined,
    });
    setAddedFeedback(true);
    window.setTimeout(() => setAddedFeedback(false), 1200);
  };

  const content = (
    <div
      className={
        mode === 'page'
          ? 'mx-auto max-w-[1280px] pt-24 md:pt-28 pb-24 px-5 md:px-12'
          : 'relative w-full max-w-[1040px] max-h-[90vh] overflow-y-auto bg-[#F6F3EE] dark:bg-[#1B1A18] text-[#1C1B19] dark:text-[#F2ECE1] border border-[#B6975C]/30 shadow-2xl'
      }
    >
      {/* Top Action Strip */}
      <div
        className={`flex items-center justify-between ${
          mode === 'page' ? 'mb-8 pb-4 border-b border-[#1C1B19]/12 dark:border-[#F2ECE1]/12' : 'p-5 pb-0'
        }`}
      >
        <button
          type="button"
          onClick={onCloseOrBack}
          className="inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.18em] uppercase text-[#8E7760] dark:text-[#CFAF70] hover:text-[#1C1B19] dark:hover:text-[#F2ECE1] cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {mode === 'page' ? 'Back to Collection' : 'Close'}
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleFavorite(product.id)}
            className={`inline-flex items-center gap-1.5 border px-3 py-1.5 text-[10.5px] tracking-[0.14em] uppercase cursor-pointer ${
              isFavorite
                ? 'border-[#B6975C] text-[#B6975C]'
                : 'border-[#1C1B19]/20 dark:border-[#F2ECE1]/20'
            }`}
          >
            <Heart className={`h-3.5 w-3.5 ${isFavorite ? 'fill-current' : ''}`} />
            {isFavorite ? 'Saved' : 'Save'}
          </button>
          {mode === 'modal' && (
            <button
              type="button"
              onClick={onCloseOrBack}
              aria-label="Close product detail"
              className="inline-flex h-8 w-8 items-center justify-center cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className={`grid grid-cols-1 lg:grid-cols-12 gap-8 ${mode === 'modal' ? 'p-6 md:p-8' : ''}`}>
        {/* Left: Photorealistic Vessel Stage + Live Engraving Plate Preview + Macro Texture */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="relative h-[380px] md:h-[440px] flex flex-col items-center justify-end p-8 bg-gradient-to-b from-[#EAE3D7] via-[#F6F3EE] to-[#D8CEBE] dark:from-[#1B1A18] dark:via-[#161513] dark:to-[#111110] border border-[#1C1B19]/10 dark:border-[#F2ECE1]/10">
            <span className="absolute top-4 left-4 text-[10px] tracking-[0.2em] uppercase opacity-60">
              {product.seriesLabel}
            </span>

            <div
              aria-hidden="true"
              className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 h-4 w-40 rounded-full bg-[#1C1B19]/28 dark:bg-black/70 blur-[9px]"
            />

            <img
              src={product.cutoutImage}
              alt={`${product.brand} ${product.name}`}
              referrerPolicy="no-referrer"
              className="relative z-10 max-h-[300px] md:max-h-[340px] w-auto object-contain drop-shadow-[0_18px_28px_rgba(28,27,25,0.2)]"
            />

            {/* Live Metallic Gold Engraving Plate Preview */}
            {product.personalizationEligible && !isRefillSelected && engravingText.trim() && (
              <div className="relative z-20 mt-3 border border-[#CFAF70]/70 bg-[#191817]/90 px-4 py-1.5 text-center">
                <span className="block text-[8.5px] tracking-[0.24em] uppercase text-[#CFAF70]/75">
                  Bespoke Gold Engraving Preview
                </span>
                <span className="font-display text-[15px] tracking-[0.26em] uppercase text-[#E7D09B]">
                  {engravingText.trim()}
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={() => onInspect3D(product.id, engravingText.trim())}
              className="mt-4 relative z-20 inline-flex items-center gap-2 border border-[#1C1B19]/30 dark:border-[#CFAF70]/50 bg-[#F6F3EE]/92 dark:bg-[#111110]/90 px-4 py-2 text-[10.5px] font-medium tracking-[0.16em] uppercase hover:border-[#B6975C] cursor-pointer"
            >
              <Box className="h-3.5 w-3.5" />
              Inspect in 3D Studio
            </button>
          </div>

          {/* Macro Texture Study */}
          <div className="flex items-center gap-4 border border-[#1C1B19]/12 dark:border-[#F2ECE1]/12 p-4 bg-[#EAE3D7]/35 dark:bg-[#1B1A18]">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-[#B6975C]/45 p-0.5">
              <img
                src={product.macroImage}
                alt={`${product.name} texture study`}
                className="h-full w-full rounded-full object-cover"
              />
            </div>
            <div>
              <p className="text-[10px] tracking-[0.18em] uppercase text-[#8E7760] dark:text-[#CFAF70]">
                Sensory Texture Study
              </p>
              <p className="mt-1 text-[13px] font-light leading-relaxed opacity-85">
                {product.textureNote}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Editorial Copy, Refill/Subscription/Engraving Configurator, INCI Transparency */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          <div>
            <p className="text-[10.5px] tracking-[0.22em] uppercase text-[#8E7760] dark:text-[#CFAF70]">
              {product.orderLabel} &middot; {product.ritualStep}
            </p>
            <h1 className="mt-1.5 font-display text-3xl md:text-5xl font-light leading-[1.06]">
              {product.name}
            </h1>
            <div className="mt-3 flex flex-wrap items-baseline gap-4">
              <span className="text-2xl font-normal tabular-nums">
                {formatCurrencyAmount(effectiveUnitUsd + engravingUsd, prefs.currency)}
              </span>
              <span className="text-[12px] tracking-[0.14em] uppercase opacity-65">
                {formatProductVolume(product.volume, product.volumeImperial, prefs.volumeSystem)}
              </span>
              <span className="text-[11px] tracking-[0.14em] uppercase text-[#8E7760] dark:text-[#CFAF70]">
                {product.availability === 'in-stock' ? 'In Atelier Stock' : 'Limited Allocation'}
              </span>
            </div>
            <p className="mt-4 text-[14px] font-light leading-relaxed opacity-85">
              {product.description}
            </p>
          </div>

          {/* Vessel Format: Full Vessel vs Refill Capsule */}
          {product.refillEligible && product.refillPriceUsd !== null && (
            <div className="border-t border-[#1C1B19]/12 dark:border-[#F2ECE1]/12 pt-4">
              <p className="text-[10.5px] font-medium tracking-[0.18em] uppercase text-[#8E7760] dark:text-[#CFAF70]">
                Vessel Edition
              </p>
              <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPurchaseType('full')}
                  className={`border p-3 text-left transition-colors cursor-pointer ${
                    purchaseType === 'full'
                      ? 'border-[#1C1B19] bg-[#1C1B19] text-[#F6F3EE] dark:border-[#CFAF70] dark:bg-[#CFAF70] dark:text-[#111110]'
                      : 'border-[#1C1B19]/20 dark:border-[#F2ECE1]/20 hover:border-[#B6975C]'
                  }`}
                >
                  <span className="block text-[11px] font-medium tracking-[0.14em] uppercase">
                    Full Architectural Vessel
                  </span>
                  <span className="mt-0.5 block text-[13px] tabular-nums opacity-85">
                    {formatCurrencyAmount(product.price, prefs.currency)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setPurchaseType('refill')}
                  className={`border p-3 text-left transition-colors cursor-pointer ${
                    purchaseType === 'refill'
                      ? 'border-[#1C1B19] bg-[#1C1B19] text-[#F6F3EE] dark:border-[#CFAF70] dark:bg-[#CFAF70] dark:text-[#111110]'
                      : 'border-[#1C1B19]/20 dark:border-[#F2ECE1]/20 hover:border-[#B6975C]'
                  }`}
                >
                  <span className="block text-[11px] font-medium tracking-[0.14em] uppercase">
                    Inner Refill Capsule
                  </span>
                  <span className="mt-0.5 block text-[13px] tabular-nums opacity-85">
                    {formatCurrencyAmount(product.refillPriceUsd, prefs.currency)}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Optional Replenishment Subscription + Dosage Lifespan Calculator */}
          <div className="border border-[#1C1B19]/12 dark:border-[#F2ECE1]/12 bg-[#EAE3D7]/35 dark:bg-[#111110]/60 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2.5 text-[12px] font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSubscription}
                  onChange={(e) => setIsSubscription(e.target.checked)}
                  className="accent-[#B6975C]"
                />
                <RefreshCw className="h-3.5 w-3.5 text-[#B6975C]" />
                <span>Auto-Replenishment Cadence (Save 10%)</span>
              </label>
              {isSubscription && (
                <select
                  aria-label="Subscription delivery interval"
                  value={subInterval}
                  onChange={(e) => setSubInterval(Number(e.target.value) as 30 | 45 | 60)}
                  className="border border-[#1C1B19]/20 dark:border-[#F2ECE1]/20 bg-[#F6F3EE] dark:bg-[#1B1A18] px-2.5 py-1 text-[11.5px]"
                >
                  <option value={30}>Every 30 days</option>
                  <option value={45}>Every 45 days</option>
                  <option value={60}>Every 60 days</option>
                </select>
              )}
            </div>

            {lifespan && (
              <div className="pt-2.5 border-t border-[#1C1B19]/10 dark:border-[#F2ECE1]/10 flex flex-wrap items-center justify-between gap-3 text-[12px]">
                <div className="flex items-center gap-2">
                  <span className="opacity-70">Usage cadence:</span>
                  {[1, 2].map((freq) => (
                    <button
                      key={freq}
                      type="button"
                      onClick={() => setUsesPerDay(freq)}
                      className={`border px-2 py-0.5 text-[10.5px] uppercase tracking-[0.1em] cursor-pointer ${
                        usesPerDay === freq
                          ? 'border-[#B6975C] text-[#B6975C]'
                          : 'border-[#1C1B19]/20 dark:border-[#F2ECE1]/20 opacity-65'
                      }`}
                    >
                      {freq}x / day
                    </button>
                  ))}
                </div>
                <span className="font-light opacity-80">
                  ~{lifespan.totalDoses} applications &middot; ~{lifespan.estimatedDays} days (est.
                  replenish {lifespan.replenishmentDateIso})
                </span>
              </div>
            )}
          </div>

          {/* 12-Character Personalization Engraving */}
          {product.personalizationEligible && !isRefillSelected && (
            <div className="border-t border-[#1C1B19]/12 dark:border-[#F2ECE1]/12 pt-4">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="vessel-engraving-input"
                  className="text-[10.5px] font-medium tracking-[0.18em] uppercase text-[#8E7760] dark:text-[#CFAF70]"
                >
                  Optional Metallic Gold Engraving (+{formatCurrencyAmount(ENGRAVING_FEE_USD, prefs.currency)})
                </label>
                <span className="text-[10.5px] opacity-60 tabular-nums">
                  {engravingText.length}/{product.engravingMaxChars}
                </span>
              </div>
              <input
                id="vessel-engraving-input"
                type="text"
                maxLength={product.engravingMaxChars}
                value={engravingText}
                onChange={(e) => setEngravingText(e.target.value)}
                placeholder="Initials or dedication (max 12 chars)"
                className="mt-2 w-full border border-[#1C1B19]/20 dark:border-[#F2ECE1]/20 bg-transparent px-3.5 py-2.5 text-[13px] tracking-[0.14em] uppercase outline-none focus:border-[#B6975C]"
              />
            </div>
          )}

          {/* Primary Purchase CTA */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleAdd}
              data-testid="pdp-add-to-bag"
              className="flex-1 min-w-[200px] inline-flex items-center justify-center gap-2 border border-[#1C1B19] bg-[#1C1B19] dark:border-[#CFAF70] dark:bg-[#CFAF70] dark:text-[#111110] py-3.5 px-6 text-[11.5px] font-medium tracking-[0.2em] uppercase text-[#F6F3EE] hover:opacity-90 transition-opacity cursor-pointer"
            >
              {addedFeedback ? (
                <>
                  <Check className="h-4 w-4" />
                  Added to Shopping Bag
                </>
              ) : (
                <>
                  {t.addToBag} &middot; {formatCurrencyAmount(effectiveUnitUsd + engravingUsd, prefs.currency)}
                </>
              )}
            </button>
          </div>

          {/* Application & Official INCI Transparency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[#1C1B19]/12 dark:border-[#F2ECE1]/12 text-[13px]">
            <div>
              <p className="text-[10.5px] font-medium tracking-[0.18em] uppercase text-[#8E7760] dark:text-[#CFAF70]">
                Ritual Application
              </p>
              <p className="mt-1.5 font-light leading-relaxed opacity-80">{product.application}</p>
            </div>
            <div>
              <p className="inline-flex items-center gap-1.5 text-[10.5px] font-medium tracking-[0.18em] uppercase text-[#8E7760] dark:text-[#CFAF70]">
                <ShieldCheck className="h-3.5 w-3.5" />
                Verified INCI Transparency
              </p>
              <p className="mt-1.5 font-light leading-relaxed opacity-80">
                {product.verifiedInci ? product.verifiedInci.join(', ') : product.formulationNote}
              </p>
            </div>
          </div>

          {/* Compatible Routine Pairings */}
          <div className="pt-4 border-t border-[#1C1B19]/12 dark:border-[#F2ECE1]/12">
            <p className="inline-flex items-center gap-1.5 text-[10.5px] font-medium tracking-[0.18em] uppercase text-[#8E7760] dark:text-[#CFAF70]">
              <Sparkles className="h-3.5 w-3.5" />
              Compatible Ritual Pairings
            </p>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {product.compatibleIds.slice(0, 3).map((cid) => {
                const related = getProductById(cid);
                return (
                  <button
                    key={cid}
                    type="button"
                    onClick={() => onSelectRelated(cid)}
                    className="flex items-center gap-3 border border-[#1C1B19]/14 dark:border-[#F2ECE1]/14 p-2.5 text-left hover:border-[#B6975C] transition-colors cursor-pointer"
                  >
                    <img
                      src={related.cutoutImage}
                      alt={related.name}
                      className="h-12 w-10 object-contain shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="block font-display text-[15px] leading-tight truncate">
                        {related.name}
                      </span>
                      <span className="block text-[11px] opacity-65 tabular-nums">
                        {formatCurrencyAmount(related.price, prefs.currency)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (mode === 'page') {
    return (
      <main className="min-h-screen bg-[#F6F3EE] dark:bg-[#111110] text-[#1C1B19] dark:text-[#F2ECE1]">
        {content}
      </main>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#111110]/76 p-4 md:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={`${product.brand} ${product.name}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCloseOrBack();
      }}
    >
      {content}
    </div>
  );
}
