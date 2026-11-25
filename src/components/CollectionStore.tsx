import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Box,
  Check,
  CloudSun,
  Columns2,
  Droplets,
  Heart,
  Layers,
  MapPin,
  Search,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import { ProductId, ProductSeries, SOMA_PRODUCTS, getProductById } from '../data/products';
import {
  LocalePreferences,
  UiDictionary,
  formatCurrencyAmount,
  formatProductVolume,
} from '../i18n/translations';

export interface WeatherSnapshot {
  city: string;
  temperatureC: number;
  humidityPct: number;
  uvIndex: number;
  conditionSummary: string;
  guidance: string;
  recommendedIds: ProductId[];
}

interface CollectionStoreProps {
  prefs: LocalePreferences;
  t: UiDictionary;
  favorites: ProductId[];
  weather: WeatherSnapshot | null;
  weatherLoading: boolean;
  onSelectWeatherCity: (city: string, lat: number, lon: number) => void;
  onRequestGeolocationWeather: () => void;
  onToggleFavorite: (productId: ProductId) => void;
  onBackToCampaign: () => void;
  onSelectProduct: (productId: ProductId) => void;
  onInspect3D: (productId: ProductId) => void;
  onOpenRitualBuilder: () => void;
  onOpenSomaLab: () => void;
  onAddToBag: (productId: ProductId) => void;
}

const WEATHER_CITIES = [
  { name: 'Istanbul', lat: 41.0082, lon: 28.9784 },
  { name: 'Paris', lat: 48.8566, lon: 2.3522 },
  { name: 'New York', lat: 40.7128, lon: -74.006 },
  { name: 'Tokyo', lat: 35.6762, lon: 139.6503 },
  { name: 'Dubai', lat: 25.2048, lon: 55.2708 },
  { name: 'Berlin', lat: 52.52, lon: 13.405 },
];

export function CollectionStore({
  prefs,
  t,
  favorites,
  weather,
  weatherLoading,
  onSelectWeatherCity,
  onRequestGeolocationWeather,
  onToggleFavorite,
  onBackToCampaign,
  onSelectProduct,
  onInspect3D,
  onOpenRitualBuilder,
  onOpenSomaLab,
  onAddToBag,
}: CollectionStoreProps) {
  const [seriesFilter, setSeriesFilter] = useState<'all' | ProductSeries>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [compareIds, setCompareIds] = useState<ProductId[]>([]);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [justAddedId, setJustAddedId] = useState<ProductId | null>(null);

  useEffect(() => {
    if (!justAddedId) return;
    const timer = window.setTimeout(() => setJustAddedId(null), 1200);
    return () => window.clearTimeout(timer);
  }, [justAddedId]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return SOMA_PRODUCTS.filter((p) => {
      if (seriesFilter !== 'all' && p.series !== seriesFilter) return false;
      if (favoritesOnly && !favorites.includes(p.id)) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.seriesLabel.toLowerCase().includes(q) ||
        p.ritualStep.toLowerCase().includes(q) ||
        p.textureNote.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    });
  }, [seriesFilter, favoritesOnly, favorites, searchQuery]);

  const toggleCompare = (id: ProductId) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      if (prev.length >= 3) return [...prev.slice(1), id];
      return [...prev, id];
    });
  };

  const handleQuickAdd = (id: ProductId) => {
    onAddToBag(id);
    setJustAddedId(id);
  };

  return (
    <main
      className="min-h-screen bg-[#F6F3EE] dark:bg-[#111110] text-[#1C1B19] dark:text-[#F2ECE1] pt-24 md:pt-28 pb-28 px-5 md:px-12 transition-colors duration-300"
      data-testid="collection-store"
    >
      <div className="mx-auto max-w-[1380px]">
        {/* Editorial Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-[#1C1B19]/12 dark:border-[#F2ECE1]/12">
          <div>
            <button
              type="button"
              onClick={onBackToCampaign}
              className="inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.18em] uppercase text-[#8E7760] dark:text-[#CFAF70] hover:text-[#1C1B19] dark:hover:text-[#F2ECE1] transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5 stroke-[1.5]" />
              {t.storeReturn}
            </button>
            <h1 className="mt-3 font-display text-[clamp(2.4rem,4.6vw,4rem)] font-light leading-[1.04] tracking-[0.02em]">
              {t.storeTitle}
            </h1>
            <p className="mt-2.5 max-w-2xl text-[14px] font-light leading-relaxed opacity-75">
              Twelve architectural skincare vessels across Botanical &amp; Natural, Minimalist
              Daily, and Signature &amp; Night Repair series. Select any three distinct vessels for
              an automatic 15% Ritual privilege.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onOpenRitualBuilder}
              className="inline-flex items-center gap-2 border border-[#1C1B19] dark:border-[#CFAF70] bg-[#1C1B19] dark:bg-[#CFAF70] text-[#F6F3EE] dark:text-[#111110] px-4 py-2.5 text-[11px] font-medium tracking-[0.16em] uppercase hover:opacity-90 transition-opacity cursor-pointer"
            >
              <Layers className="h-3.5 w-3.5" />
              {t.ritualBuilderTitle}
            </button>
            <button
              type="button"
              onClick={() => onInspect3D('cream')}
              className="inline-flex items-center gap-2 border border-[#1C1B19]/25 dark:border-[#F2ECE1]/25 px-4 py-2.5 text-[11px] font-medium tracking-[0.16em] uppercase hover:border-[#B6975C] transition-colors cursor-pointer"
            >
              <Box className="h-3.5 w-3.5" />
              {t.studioTitle}
            </button>
            <button
              type="button"
              onClick={onOpenSomaLab}
              className="inline-flex items-center gap-2 border border-[#1C1B19]/25 dark:border-[#F2ECE1]/25 px-4 py-2.5 text-[11px] font-medium tracking-[0.16em] uppercase hover:border-[#B6975C] transition-colors cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {t.navSomaLab}
            </button>
          </div>
        </div>

        {/* Weather-Adaptive Skincare Strip (Open-Meteo Live Telemetry) */}
        <section
          aria-label="Weather-Adaptive Skincare Recommendations"
          className="mt-7 border border-[#1C1B19]/12 dark:border-[#CFAF70]/20 bg-[#EAE3D7]/55 dark:bg-[#1B1A18] p-5 md:p-6"
          data-testid="weather-adaptive-strip"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <CloudSun className="h-5 w-5 text-[#B6975C] shrink-0 mt-0.5 stroke-[1.5]" />
              <div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="text-[10.5px] font-medium tracking-[0.2em] uppercase text-[#8E7760] dark:text-[#CFAF70]">
                    {t.weatherTitle}
                  </span>
                  {weather && (
                    <span className="text-[12px] font-medium tabular-nums">
                      {weather.city} &middot; {Math.round(weather.temperatureC)}&deg;C &middot;{' '}
                      <Droplets className="inline h-3.5 w-3.5 -mt-0.5 mr-0.5 text-[#B6975C]" />
                      {Math.round(weather.humidityPct)}% RH &middot;{' '}
                      <Sun className="inline h-3.5 w-3.5 -mt-0.5 mr-0.5 text-[#B6975C]" />
                      UV {weather.uvIndex.toFixed(1)}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[13px] font-light opacity-80">
                  {weatherLoading
                    ? 'Calibrating atmospheric conditions via Open-Meteo…'
                    : weather
                    ? `${weather.conditionSummary} — ${weather.guidance}`
                    : 'Select a city or share location to view live weather-adapted SOMA FACE layering suggestions.'}
                </p>
                {weather && weather.recommendedIds.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <span className="text-[10.5px] tracking-[0.14em] uppercase opacity-60">
                      Suggested Pairings:
                    </span>
                    {weather.recommendedIds.map((pid) => {
                      const prod = getProductById(pid);
                      return (
                        <button
                          key={pid}
                          type="button"
                          onClick={() => onSelectProduct(pid)}
                          className="border border-[#B6975C]/45 bg-[#F6F3EE]/80 dark:bg-[#111110]/80 px-2.5 py-1 text-[11px] hover:border-[#B6975C] transition-colors cursor-pointer"
                        >
                          {prod.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <select
                aria-label="Select city for weather-adaptive routine"
                value={weather?.city ?? 'Istanbul'}
                onChange={(e) => {
                  const chosen = WEATHER_CITIES.find((c) => c.name === e.target.value);
                  if (chosen) onSelectWeatherCity(chosen.name, chosen.lat, chosen.lon);
                }}
                className="border border-[#1C1B19]/20 dark:border-[#F2ECE1]/20 bg-[#F6F3EE] dark:bg-[#111110] px-3 py-2 text-[11.5px] tracking-[0.06em] outline-none cursor-pointer"
              >
                {WEATHER_CITIES.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={onRequestGeolocationWeather}
                className="inline-flex items-center gap-1.5 border border-[#1C1B19]/20 dark:border-[#F2ECE1]/20 px-3 py-2 text-[11px] tracking-[0.12em] uppercase hover:border-[#B6975C] transition-colors cursor-pointer"
              >
                <MapPin className="h-3.5 w-3.5" />
                My Location
              </button>
            </div>
          </div>
        </section>

        {/* Search & Series Filter Bar */}
        <div className="mt-7 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Series Filter">
            {(
              [
                { id: 'all', label: t.allSeries },
                { id: 'botanical-natural', label: t.botanicalSeries },
                { id: 'minimalist-daily', label: t.minimalistSeries },
                { id: 'signature-night-repair', label: t.signatureSeries },
              ] as const
            ).map((tab) => {
              const active = seriesFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSeriesFilter(tab.id)}
                  className={`border px-3.5 py-2 text-[11px] font-medium tracking-[0.14em] uppercase transition-colors cursor-pointer ${
                    active
                      ? 'border-[#1C1B19] bg-[#1C1B19] text-[#F6F3EE] dark:border-[#CFAF70] dark:bg-[#CFAF70] dark:text-[#111110]'
                      : 'border-[#1C1B19]/18 dark:border-[#F2ECE1]/18 hover:border-[#B6975C]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 opacity-55" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                aria-label="Filter collection products"
                className="w-full border border-[#1C1B19]/20 dark:border-[#F2ECE1]/20 bg-transparent pl-9 pr-3 py-2 text-[12.5px] font-light outline-none focus:border-[#B6975C]"
              />
            </div>

            <button
              type="button"
              onClick={() => setFavoritesOnly((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 border px-3.5 py-2 text-[11px] font-medium tracking-[0.14em] uppercase transition-colors cursor-pointer ${
                favoritesOnly
                  ? 'border-[#B6975C] bg-[#B6975C] text-[#111110]'
                  : 'border-[#1C1B19]/20 dark:border-[#F2ECE1]/20 hover:border-[#B6975C]'
              }`}
            >
              <Heart className={`h-3.5 w-3.5 ${favoritesOnly ? 'fill-current' : ''}`} />
              {t.favoritesOnly} ({favorites.length})
            </button>
          </div>
        </div>

        {/* 12-Vessel Architectural Product Grid */}
        {filteredProducts.length === 0 ? (
          <div className="mt-14 border border-[#1C1B19]/12 dark:border-[#F2ECE1]/12 py-16 text-center">
            <p className="font-display text-2xl font-light">No matching vessels found.</p>
            <button
              type="button"
              onClick={() => {
                setSeriesFilter('all');
                setSearchQuery('');
                setFavoritesOnly(false);
              }}
              className="mt-4 border border-[#1C1B19]/30 dark:border-[#F2ECE1]/30 px-5 py-2 text-[11px] tracking-[0.16em] uppercase cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-7">
            {filteredProducts.map((product) => {
              const isFav = favorites.includes(product.id);
              const isCompared = compareIds.includes(product.id);
              const visualHeightPct = Math.round(product.shelfHeightRatio * 84);

              return (
                <article
                  key={product.id}
                  data-testid={`product-card-${product.id}`}
                  className="group flex flex-col justify-between border border-[#1C1B19]/12 dark:border-[#F2ECE1]/12 bg-[#EAE3D7]/42 dark:bg-[#1B1A18] transition-colors duration-300 hover:border-[#B6975C]/65"
                >
                  {/* Plinth Image Showcase with Faithful Relative Proportions */}
                  <div className="relative h-[270px] flex items-end justify-center px-6 pt-8 pb-6 bg-gradient-to-b from-[#EAE3D7]/70 via-[#F6F3EE]/55 to-[#D8CEBE]/60 dark:from-[#1B1A18] dark:via-[#161513] dark:to-[#111110]">
                    <span className="absolute top-3.5 left-4 text-[10px] tracking-[0.2em] uppercase opacity-60">
                      {product.orderLabel} &middot; {product.stepCategory}
                    </span>

                    <div className="absolute top-3 right-3 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onToggleFavorite(product.id)}
                        aria-label={isFav ? `Remove ${product.name} from favorites` : `Save ${product.name} to favorites`}
                        className={`inline-flex h-8 w-8 items-center justify-center border transition-colors cursor-pointer ${
                          isFav
                            ? 'border-[#B6975C] bg-[#B6975C]/15 text-[#B6975C]'
                            : 'border-[#1C1B19]/12 dark:border-[#F2ECE1]/15 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <Heart className={`h-3.5 w-3.5 ${isFav ? 'fill-current' : ''}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onInspect3D(product.id)}
                        aria-label={`Inspect ${product.name} in 3D Studio`}
                        title={t.inspect3d}
                        className="inline-flex h-8 w-8 items-center justify-center border border-[#1C1B19]/12 dark:border-[#F2ECE1]/15 opacity-75 hover:opacity-100 hover:border-[#B6975C] transition-colors cursor-pointer"
                      >
                        <Box className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Soft contact shadow on plinth */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 h-3.5 w-28 rounded-full bg-[#1C1B19]/28 dark:bg-black/65 blur-[8px]"
                    />

                    <button
                      type="button"
                      onClick={() => onSelectProduct(product.id)}
                      className="relative z-10 flex h-full w-full items-end justify-center cursor-pointer focus-visible:outline-none"
                    >
                      <img
                        src={product.cutoutImage}
                        alt={`${product.brand} ${product.name}`}
                        referrerPolicy="no-referrer"
                        style={{ maxHeight: `${visualHeightPct}%` }}
                        className="w-auto object-contain transition-transform duration-500 group-hover:-translate-y-1.5 drop-shadow-[0_14px_20px_rgba(28,27,25,0.16)]"
                      />
                    </button>
                  </div>

                  {/* Metadata & Actions */}
                  <div className="p-5 flex flex-col flex-1 justify-between gap-4">
                    <div>
                      <div className="flex items-center justify-between gap-2 text-[10px] tracking-[0.16em] uppercase text-[#8E7760] dark:text-[#CFAF70]">
                        <span className="truncate">{product.seriesLabel}</span>
                        <span className="shrink-0">
                          {formatProductVolume(product.volume, product.volumeImperial, prefs.volumeSystem)}
                        </span>
                      </div>

                      <div className="mt-1.5 flex items-baseline justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => onSelectProduct(product.id)}
                          className="font-display text-[22px] font-normal leading-snug text-left hover:underline cursor-pointer"
                        >
                          {product.name}
                        </button>
                        <span className="text-[14px] font-medium tabular-nums shrink-0">
                          {formatCurrencyAmount(product.price, prefs.currency)}
                        </span>
                      </div>

                      <p className="mt-1.5 text-[12.5px] font-light leading-relaxed opacity-75 line-clamp-2">
                        {product.ritualLine}
                      </p>

                      {product.refillEligible && product.refillPriceUsd && (
                        <p className="mt-2 text-[10.5px] tracking-[0.12em] uppercase text-[#8E7760] dark:text-[#CFAF70]">
                          Refillable &middot; Refill {formatCurrencyAmount(product.refillPriceUsd, prefs.currency)}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-[#1C1B19]/10 dark:border-[#F2ECE1]/10 flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleQuickAdd(product.id)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 border border-[#1C1B19] bg-[#1C1B19] dark:border-[#CFAF70] dark:bg-[#CFAF70] dark:text-[#111110] py-2.5 text-[10.5px] font-medium tracking-[0.16em] uppercase text-[#F6F3EE] hover:opacity-90 transition-opacity cursor-pointer"
                        >
                          {justAddedId === product.id ? (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              Added
                            </>
                          ) : (
                            t.addToBag
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => onSelectProduct(product.id)}
                          className="border border-[#1C1B19]/25 dark:border-[#F2ECE1]/25 px-3 py-2.5 text-[10.5px] font-medium tracking-[0.14em] uppercase hover:border-[#B6975C] transition-colors cursor-pointer"
                        >
                          {t.viewDetails}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleCompare(product.id)}
                        className={`w-full inline-flex items-center justify-center gap-1.5 py-1.5 text-[10px] tracking-[0.16em] uppercase transition-colors cursor-pointer ${
                          isCompared
                            ? 'text-[#B6975C] font-medium'
                            : 'opacity-55 hover:opacity-100'
                        }`}
                      >
                        <Columns2 className="h-3 w-3" />
                        {isCompared ? 'Selected for Comparison' : t.compare}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Comparison Bar (appears only when user selects products to compare) */}
      {compareIds.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-[calc(100%-2rem)] max-w-[780px] border border-[#B6975C]/60 bg-[#1C1B19] text-[#F6F3EE] px-5 py-3.5 shadow-2xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Columns2 className="h-4 w-4 text-[#CFAF70] shrink-0" />
            <span className="text-[11px] tracking-[0.15em] uppercase">
              Compare ({compareIds.length}/3):{' '}
              <span className="opacity-80 normal-case tracking-normal">
                {compareIds.map((id) => getProductById(id).name).join(' · ')}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCompareModalOpen(true)}
              disabled={compareIds.length < 2}
              className="border border-[#CFAF70] bg-[#CFAF70] px-4 py-1.5 text-[10.5px] font-medium tracking-[0.16em] uppercase text-[#111110] disabled:opacity-40 cursor-pointer"
            >
              Compare Side-by-Side
            </button>
            <button
              type="button"
              onClick={() => setCompareIds([])}
              aria-label="Clear comparison"
              className="p-1.5 opacity-70 hover:opacity-100 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Side-by-Side Comparison Modal */}
      {compareModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#111110]/78 p-4 md:p-8"
          role="dialog"
          aria-modal="true"
          aria-label="Compare SOMA FACE Vessels"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCompareModalOpen(false);
          }}
        >
          <div className="w-full max-w-[1040px] max-h-[88vh] overflow-y-auto bg-[#F6F3EE] dark:bg-[#1B1A18] text-[#1C1B19] dark:text-[#F2ECE1] border border-[#B6975C]/35 p-6 md:p-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1C1B19]/12 dark:border-[#F2ECE1]/12 pb-4">
              <h2 className="font-display text-3xl font-light">Vessel Comparison</h2>
              <button
                type="button"
                onClick={() => setCompareModalOpen(false)}
                aria-label="Close comparison"
                className="h-9 w-9 inline-flex items-center justify-center cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              {compareIds.map((id) => {
                const p = getProductById(id);
                return (
                  <div
                    key={p.id}
                    className="border border-[#1C1B19]/12 dark:border-[#F2ECE1]/12 p-5 flex flex-col justify-between gap-4"
                  >
                    <div>
                      <div className="h-44 flex items-end justify-center bg-[#EAE3D7]/55 dark:bg-[#111110] p-4">
                        <img
                          src={p.cutoutImage}
                          alt={p.name}
                          className="max-h-full object-contain"
                        />
                      </div>
                      <p className="mt-3 text-[10px] tracking-[0.16em] uppercase text-[#8E7760] dark:text-[#CFAF70]">
                        {p.seriesLabel}
                      </p>
                      <h3 className="mt-1 font-display text-2xl font-normal">{p.name}</h3>
                      <p className="mt-1 text-[14px] font-medium tabular-nums">
                        {formatCurrencyAmount(p.price, prefs.currency)} &middot;{' '}
                        {formatProductVolume(p.volume, p.volumeImperial, prefs.volumeSystem)}
                      </p>

                      <dl className="mt-4 space-y-2.5 text-[12.5px] border-t border-[#1C1B19]/10 dark:border-[#F2ECE1]/10 pt-3">
                        <div>
                          <dt className="text-[10px] tracking-[0.15em] uppercase opacity-60">
                            Ritual Step
                          </dt>
                          <dd className="font-light">{p.ritualStep}</dd>
                        </div>
                        <div>
                          <dt className="text-[10px] tracking-[0.15em] uppercase opacity-60">
                            Texture
                          </dt>
                          <dd className="font-light">{p.textureNote}</dd>
                        </div>
                        <div>
                          <dt className="text-[10px] tracking-[0.15em] uppercase opacity-60">
                            Refill &amp; Personalization
                          </dt>
                          <dd className="font-light">
                            {p.refillEligible ? 'Refillable vessel' : 'Single vessel'} &middot;{' '}
                            {p.personalizationEligible ? 'Engraving eligible' : 'Non-engraved'}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onAddToBag(p.id);
                        setCompareModalOpen(false);
                      }}
                      className="w-full border border-[#1C1B19] bg-[#1C1B19] dark:border-[#CFAF70] dark:bg-[#CFAF70] dark:text-[#111110] py-2.5 text-[11px] font-medium tracking-[0.16em] uppercase text-[#F6F3EE] cursor-pointer"
                    >
                      {t.addToBag}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
