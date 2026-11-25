import { useMemo, useState } from 'react';
import {
  Box,
  Check,
  Gift,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { ProductId, SOMA_PRODUCTS, getProductById } from '../data/products';
import {
  RITUAL_BUNDLE_DISCOUNT_RATE,
  calculateRefillSchedule,
} from '../store/cartLogic';
import {
  LocalePreferences,
  UiDictionary,
  formatCurrencyAmount,
  formatProductVolume,
} from '../i18n/translations';

interface RitualBuilderViewProps {
  prefs: LocalePreferences;
  t: UiDictionary;
  onInspect3D: (id: ProductId) => void;
  onAddRitualToBag: (ids: [ProductId, ProductId, ProductId]) => void;
  onAddRefillToBag: (
    id: ProductId,
    isSubscription: boolean,
    intervalDays: 30 | 45 | 60
  ) => void;
}

const PRESETS: ReadonlyArray<{
  id: string;
  label: string;
  subtitle: string;
  picks: [ProductId, ProductId, ProductId];
}> = [
  {
    id: 'evening',
    label: 'Evening Repair',
    subtitle: 'Cleanse · Luminous Serum · Overnight Cream',
    picks: ['deep-cleanse-oil', 'serum', 'cream'],
  },
  {
    id: 'morning',
    label: 'Morning Balance',
    subtitle: 'Cleanse · Radiant Serum · Matte Moisturizer',
    picks: ['deep-cleanse-oil', 'radiant-serum', 'botanical-matte-moisturizer'],
  },
  {
    id: 'botanical',
    label: 'Botanical Sanctuary',
    subtitle: 'Botanical Elixir · Regenerative · Hydrating Balm',
    picks: ['botanical-elixir', 'regenerative-serum', 'hydrating-balm'],
  },
  {
    id: 'signature',
    label: 'Signature Hero Trio',
    subtitle: 'Luminous Serum · Overnight Cream · Active Eye Balm',
    picks: ['serum', 'cream', 'eye-balm'],
  },
];

export function RitualBuilderView({
  prefs,
  t,
  onInspect3D,
  onAddRitualToBag,
  onAddRefillToBag,
}: RitualBuilderViewProps) {
  const [step1, setStep1] = useState<ProductId>('deep-cleanse-oil');
  const [step2, setStep2] = useState<ProductId>('serum');
  const [step3, setStep3] = useState<ProductId>('cream');
  const [giftBoxPreview, setGiftBoxPreview] = useState(false);
  const [addedRitual, setAddedRitual] = useState(false);

  // Refill & Replenishment Studio state
  const refillableProducts = useMemo(
    () => SOMA_PRODUCTS.filter((p) => p.refillEligible && p.refillPriceUsd !== null),
    []
  );
  const [refillProductId, setRefillProductId] = useState<ProductId>('cream');
  const [refillUsesPerDay, setRefillUsesPerDay] = useState<number>(2);
  const [refillSubEnabled, setRefillSubEnabled] = useState<boolean>(false);
  const [refillInterval, setRefillInterval] = useState<30 | 45 | 60>(45);
  const [refillAdded, setRefillAdded] = useState(false);

  const trio = [getProductById(step1), getProductById(step2), getProductById(step3)];
  const distinctCount = new Set([step1, step2, step3]).size;
  const rawTotalUsd = trio.reduce((sum, p) => sum + p.price, 0);
  const discountUsd =
    distinctCount === 3 ? Math.round(rawTotalUsd * RITUAL_BUNDLE_DISCOUNT_RATE) : 0;
  const finalTotalUsd = rawTotalUsd - discountUsd;

  const refillProduct = getProductById(refillProductId);
  const refillEstimate = useMemo(
    () =>
      calculateRefillSchedule(
        refillProduct.volumeValue,
        refillProduct.dosagePerUse,
        refillUsesPerDay
      ),
    [refillProduct.volumeValue, refillProduct.dosagePerUse, refillUsesPerDay]
  );

  const handleAddTrio = () => {
    onAddRitualToBag([step1, step2, step3]);
    setAddedRitual(true);
    window.setTimeout(() => setAddedRitual(false), 1600);
  };

  return (
    <main
      className="min-h-screen bg-[#F6F3EE] dark:bg-[#111110] text-[#1C1B19] dark:text-[#F2ECE1] pt-24 md:pt-28 pb-24 px-5 md:px-12"
      data-testid="ritual-builder-view"
    >
      <div className="mx-auto max-w-[1320px] space-y-16">
        {/* Header & Presets */}
        <div className="border-b border-[#1C1B19]/12 dark:border-[#F2ECE1]/12 pb-6 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <p className="text-[10.5px] font-medium tracking-[0.24em] uppercase text-[#8E7760] dark:text-[#CFAF70]">
              THE RITUAL &middot; 15% THREE-VESSEL PRIVILEGE
            </p>
            <h1 className="mt-2 font-display text-4xl md:text-5xl font-light">
              {t.ritualBuilderTitle}
            </h1>
            <p className="mt-2 max-w-2xl text-[13.5px] font-light opacity-78">
              Compose your bespoke three-step ritual on our honed architectural travertine plinth.
              Three distinct vessels automatically unlock 15% Atelier Ritual pricing, validated at
              checkout.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setStep1(preset.picks[0]);
                  setStep2(preset.picks[1]);
                  setStep3(preset.picks[2]);
                }}
                className="border border-[#1C1B19]/20 dark:border-[#F2ECE1]/20 px-3.5 py-2 text-left hover:border-[#B6975C] transition-colors cursor-pointer"
              >
                <span className="block text-[10.5px] font-medium tracking-[0.14em] uppercase">
                  {preset.label}
                </span>
                <span className="block text-[10px] opacity-65">{preset.subtitle}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Travertine Stand + 3-Step Selector */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left 7 Cols: Honed Travertine Architectural Stand */}
          <div className="lg:col-span-7">
            <div className="relative overflow-hidden border border-[#1C1B19]/14 dark:border-[#CFAF70]/25 bg-gradient-to-b from-[#ECE6DC] via-[#F6F3EE] to-[#D8CEBE] dark:from-[#1B1A18] dark:via-[#151412] dark:to-[#111110] p-6 md:p-10 min-h-[450px] flex flex-col justify-between">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] tracking-[0.22em] uppercase text-[#8E7760] dark:text-[#CFAF70]">
                  Honed Travertine Plinth &middot; Scale Accurate
                </span>
                <button
                  type="button"
                  onClick={() => setGiftBoxPreview((v) => !v)}
                  className={`inline-flex items-center gap-1.5 border px-3 py-1.5 text-[10.5px] tracking-[0.14em] uppercase cursor-pointer ${
                    giftBoxPreview
                      ? 'border-[#B6975C] bg-[#B6975C] text-[#111110] font-medium'
                      : 'border-[#1C1B19]/22 dark:border-[#F2ECE1]/22'
                  }`}
                >
                  <Gift className="h-3.5 w-3.5" />
                  {giftBoxPreview ? 'Linen Gift Box Active' : 'Preview Gift Box'}
                </button>
              </div>

              {/* Three Cutouts Standing on Travertine Slab */}
              <div className="relative mt-8 mb-3 flex items-end justify-center gap-6 md:gap-12 h-[290px]">
                {giftBoxPreview && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-4 bottom-2 top-3 border-2 border-[#B6975C]/65 bg-[#EAE3D7]/45 dark:bg-[#1B1A18]/55 flex items-start justify-center pt-3"
                  >
                    <span className="text-[9.5px] tracking-[0.28em] uppercase text-[#8E7760] dark:text-[#CFAF70]">
                      SOMA FACE &middot; Bespoke Linen Presentation Coffer
                    </span>
                  </div>
                )}

                {trio.map((prod, idx) => {
                  const hPct = Math.round(prod.shelfHeightRatio * 90);
                  return (
                    <div
                      key={`${prod.id}-${idx}`}
                      className="relative z-10 flex flex-col items-center justify-end h-full flex-1 max-w-[165px]"
                    >
                      <button
                        type="button"
                        onClick={() => onInspect3D(prod.id)}
                        title={`Inspect ${prod.name} in 3D Studio`}
                        className="group relative flex items-end justify-center h-full w-full cursor-pointer"
                      >
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute -bottom-1 left-1/2 -translate-x-1/2 h-3.5 w-24 rounded-full bg-[#1C1B19]/35 dark:bg-black/75 blur-[8px]"
                        />
                        <img
                          src={prod.cutoutImage}
                          alt={prod.name}
                          style={{ maxHeight: `${hPct}%` }}
                          className="relative z-10 w-auto object-contain transition-transform duration-300 group-hover:-translate-y-1.5 drop-shadow-[0_14px_22px_rgba(28,27,25,0.2)]"
                        />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Architectural Travertine Stone Slab Visual */}
              <div
                aria-hidden="true"
                className="relative h-9 w-full border-t border-[#F6F3EE]/60 dark:border-[#CFAF70]/25 shadow-[0_14px_24px_rgba(28,27,25,0.16)]"
                style={{
                  background:
                    'linear-gradient(180deg, #E2D8C8 0%, #CFC2AE 58%, #B9AA94 100%)',
                }}
              />

              {/* Caption Strip */}
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                {trio.map((prod, idx) => (
                  <div key={`cap-${prod.id}-${idx}`}>
                    <p className="text-[9.5px] tracking-[0.2em] uppercase text-[#8E7760] dark:text-[#CFAF70]">
                      Step 0{idx + 1}
                    </p>
                    <p className="font-display text-[17px] leading-tight truncate">{prod.name}</p>
                    <p className="text-[11px] opacity-65 tabular-nums">
                      {formatProductVolume(prod.volume, prod.volumeImperial, prefs.volumeSystem)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right 5 Cols: Step Selectors & One-Click Bundle Summary */}
          <div className="lg:col-span-5 space-y-5">
            {(
              [
                {
                  stepLabel: 'Step 01 · Cleanse / Prep',
                  value: step1,
                  setter: setStep1,
                },
                {
                  stepLabel: 'Step 02 · Treat / Serum',
                  value: step2,
                  setter: setStep2,
                },
                {
                  stepLabel: 'Step 03 · Seal / Balm',
                  value: step3,
                  setter: setStep3,
                },
              ] as const
            ).map((slot) => {
              const selected = getProductById(slot.value);
              return (
                <div
                  key={slot.stepLabel}
                  className="border border-[#1C1B19]/14 dark:border-[#F2ECE1]/14 bg-[#EAE3D7]/35 dark:bg-[#1B1A18] p-4 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-medium tracking-[0.18em] uppercase text-[#8E7760] dark:text-[#CFAF70]">
                      {slot.stepLabel}
                    </span>
                    <button
                      type="button"
                      onClick={() => onInspect3D(selected.id)}
                      className="inline-flex items-center gap-1 text-[10px] tracking-[0.14em] uppercase opacity-75 hover:opacity-100 cursor-pointer"
                    >
                      <Box className="h-3 w-3" />
                      3D
                    </button>
                  </div>
                  <select
                    aria-label={slot.stepLabel}
                    value={slot.value}
                    onChange={(e) => slot.setter(e.target.value as ProductId)}
                    className="w-full border border-[#1C1B19]/20 dark:border-[#F2ECE1]/20 bg-[#F6F3EE] dark:bg-[#111110] px-3 py-2.5 text-[13px] outline-none"
                  >
                    {SOMA_PRODUCTS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.volume}) — {formatCurrencyAmount(p.price, prefs.currency)}
                      </option>
                    ))}
                  </select>
                  <p className="text-[12px] font-light opacity-75">{selected.ritualLine}</p>
                </div>
              );
            })}

            {/* Bundle Pricing Summary */}
            <div className="border border-[#B6975C]/45 bg-[#EAE3D7]/60 dark:bg-[#1B1A18] p-5 space-y-2.5">
              <div className="flex justify-between text-[13px]">
                <span className="opacity-75">Three-Vessel Subtotal</span>
                <span className="tabular-nums">
                  {formatCurrencyAmount(rawTotalUsd, prefs.currency)}
                </span>
              </div>
              <div className="flex justify-between text-[13px] text-[#8E7760] dark:text-[#CFAF70]">
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  {t.bundleDiscountLabel}
                </span>
                <span className="tabular-nums">
                  {distinctCount === 3
                    ? `-${formatCurrencyAmount(discountUsd, prefs.currency)}`
                    : 'Choose 3 distinct vessels'}
                </span>
              </div>
              <div className="pt-2 border-t border-[#1C1B19]/12 dark:border-[#F2ECE1]/12 flex justify-between text-[16px] font-medium">
                <span>Ritual Total</span>
                <span className="tabular-nums">
                  {formatCurrencyAmount(finalTotalUsd, prefs.currency)}
                </span>
              </div>

              <button
                type="button"
                onClick={handleAddTrio}
                data-testid="add-ritual-bundle-btn"
                className="mt-2 w-full inline-flex items-center justify-center gap-2 border border-[#1C1B19] bg-[#1C1B19] dark:border-[#CFAF70] dark:bg-[#CFAF70] dark:text-[#111110] py-3.5 text-[11.5px] font-medium tracking-[0.2em] uppercase text-[#F6F3EE] cursor-pointer"
              >
                {addedRitual ? (
                  <>
                    <Check className="h-4 w-4" />
                    3-Step Ritual Added to Bag
                  </>
                ) : (
                  'Add Complete Ritual to Bag'
                )}
              </button>
            </div>
          </div>
        </section>

        {/* =================================================================
            REFILL & REPLENISHMENT STUDIO (Honest Dosage Math — Zero Fabricated Claims)
           ================================================================= */}
        <section
          aria-label={t.refillTitle}
          className="border-t border-[#1C1B19]/12 dark:border-[#F2ECE1]/12 pt-12"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5 space-y-4">
              <p className="inline-flex items-center gap-2 text-[10.5px] font-medium tracking-[0.22em] uppercase text-[#8E7760] dark:text-[#CFAF70]">
                <RefreshCw className="h-3.5 w-3.5" />
                {t.refillTitle}
              </p>
              <h2 className="font-display text-3xl md:text-4xl font-light leading-tight">
                Preserve the Vessel. Replenish the Formula.
              </h2>
              <p className="text-[13.5px] font-light leading-relaxed opacity-80">
                Keep your weighted frosted glass vessel and brushed champagne-gold collar while
                exchanging the inner refill cartridge. Use our dosage-based cadence calculator below
                to estimate your replenishment schedule cleanly.
              </p>

              <button
                type="button"
                onClick={() => onInspect3D(refillProduct.id)}
                className="inline-flex items-center gap-2 border border-[#1C1B19]/25 dark:border-[#CFAF70]/45 px-4 py-2 text-[10.5px] tracking-[0.16em] uppercase hover:border-[#B6975C] cursor-pointer"
              >
                <Box className="h-3.5 w-3.5" />
                Visualize Refill Capsule in 3D Studio
              </button>
            </div>

            <div className="lg:col-span-7 border border-[#1C1B19]/14 dark:border-[#F2ECE1]/14 bg-[#EAE3D7]/40 dark:bg-[#1B1A18] p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-4 h-48 flex items-end justify-center bg-[#F6F3EE]/80 dark:bg-[#111110] p-4">
                <img
                  src={refillProduct.cutoutImage}
                  alt={refillProduct.name}
                  className="max-h-full object-contain"
                />
              </div>

              <div className="md:col-span-8 space-y-4">
                <div>
                  <label
                    htmlFor="refill-studio-select"
                    className="block text-[10px] tracking-[0.18em] uppercase text-[#8E7760] dark:text-[#CFAF70]"
                  >
                    Refillable SOMA FACE Vessel
                  </label>
                  <select
                    id="refill-studio-select"
                    value={refillProductId}
                    onChange={(e) => setRefillProductId(e.target.value as ProductId)}
                    className="mt-1.5 w-full border border-[#1C1B19]/20 dark:border-[#F2ECE1]/20 bg-[#F6F3EE] dark:bg-[#111110] px-3 py-2 text-[13px]"
                  >
                    {refillableProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.volume}) — Refill{' '}
                        {formatCurrencyAmount(p.refillPriceUsd!, prefs.currency)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 text-[12.5px]">
                  <span className="opacity-75">Daily Usage Cadence</span>
                  <div className="flex gap-2">
                    {[1, 2].map((freq) => (
                      <button
                        key={freq}
                        type="button"
                        onClick={() => setRefillUsesPerDay(freq)}
                        className={`border px-3 py-1 text-[11px] uppercase tracking-[0.12em] cursor-pointer ${
                          refillUsesPerDay === freq
                            ? 'border-[#1C1B19] bg-[#1C1B19] text-[#F6F3EE] dark:border-[#CFAF70] dark:bg-[#CFAF70] dark:text-[#111110]'
                            : 'border-[#1C1B19]/20 dark:border-[#F2ECE1]/20'
                        }`}
                      >
                        {freq}x / Day
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 border-t border-b border-[#1C1B19]/10 dark:border-[#F2ECE1]/10 py-3 text-center">
                  <div>
                    <span className="block text-[9.5px] tracking-[0.15em] uppercase opacity-60">
                      Est. Doses
                    </span>
                    <span className="font-display text-2xl tabular-nums">
                      {refillEstimate.totalDoses}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[9.5px] tracking-[0.15em] uppercase opacity-60">
                      Est. Lifespan
                    </span>
                    <span className="font-display text-2xl tabular-nums">
                      {refillEstimate.estimatedDays}d
                    </span>
                  </div>
                  <div>
                    <span className="block text-[9.5px] tracking-[0.15em] uppercase opacity-60">
                      Replenish By
                    </span>
                    <span className="font-display text-lg tabular-nums leading-8">
                      {refillEstimate.replenishmentDateIso}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <label className="inline-flex items-center gap-2 text-[12px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={refillSubEnabled}
                      onChange={(e) => setRefillSubEnabled(e.target.checked)}
                      className="accent-[#B6975C]"
                    />
                    <span>Auto-Replenish (-10%)</span>
                  </label>
                  {refillSubEnabled && (
                    <select
                      value={refillInterval}
                      onChange={(e) => setRefillInterval(Number(e.target.value) as 30 | 45 | 60)}
                      className="border border-[#1C1B19]/20 dark:border-[#F2ECE1]/20 bg-transparent px-2.5 py-1 text-[11.5px]"
                    >
                      <option value={30}>Every 30 days</option>
                      <option value={45}>Every 45 days</option>
                      <option value={60}>Every 60 days</option>
                    </select>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onAddRefillToBag(refillProduct.id, refillSubEnabled, refillInterval);
                    setRefillAdded(true);
                    window.setTimeout(() => setRefillAdded(false), 1400);
                  }}
                  className="w-full border border-[#1C1B19] bg-[#1C1B19] dark:border-[#CFAF70] dark:bg-[#CFAF70] dark:text-[#111110] py-3 text-[11px] font-medium tracking-[0.18em] uppercase text-[#F6F3EE] cursor-pointer"
                >
                  {refillAdded
                    ? 'Refill Capsule Added to Bag'
                    : `Add Refill Capsule · ${formatCurrencyAmount(refillProduct.refillPriceUsd!, prefs.currency)}`}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
