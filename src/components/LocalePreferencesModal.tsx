import { useEffect } from 'react';
import { Globe, Moon, Sun, X } from 'lucide-react';
import {
  CURRENCY_CONFIG,
  CurrencyCode,
  LANGUAGE_OPTIONS,
  LanguageCode,
  LocalePreferences,
  VolumeSystem,
} from '../i18n/translations';

interface LocalePreferencesModalProps {
  isOpen: boolean;
  prefs: LocalePreferences;
  onUpdate: (next: LocalePreferences) => void;
  onClose: () => void;
}

const CURRENCY_LIST: CurrencyCode[] = ['USD', 'EUR', 'TRY', 'RUB', 'BRL', 'CNY'];

export function LocalePreferencesModal({
  isOpen,
  prefs,
  onUpdate,
  onClose,
}: LocalePreferencesModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#111110]/75 p-4 md:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Global Language, Currency & Display Preferences"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-[680px] bg-[#F6F3EE] dark:bg-[#1B1A18] text-[#1C1B19] dark:text-[#F2ECE1] border border-[#1C1B19]/15 dark:border-[#CFAF70]/25 shadow-2xl p-6 md:p-9 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 border-b border-[#1C1B19]/12 dark:border-[#F2ECE1]/12 pb-4">
          <div>
            <p className="inline-flex items-center gap-2 text-[10.5px] tracking-[0.22em] uppercase text-[#8E7760] dark:text-[#CFAF70]">
              <Globe className="h-3.5 w-3.5" />
              Global Atelier Preferences
            </p>
            <h2 className="mt-1.5 font-display text-3xl font-light">
              Language, Currency & Atmosphere
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preferences"
            className="inline-flex h-9 w-9 items-center justify-center text-[#1C1B19]/70 dark:text-[#F2ECE1]/70 hover:text-[#1C1B19] dark:hover:text-[#F2ECE1] cursor-pointer"
          >
            <X className="h-5 w-5 stroke-[1.5]" />
          </button>
        </div>

        <div className="mt-6 space-y-7">
          {/* 7 Languages */}
          <div>
            <p className="text-[11px] font-medium tracking-[0.18em] uppercase text-[#8E7760] dark:text-[#CFAF70]">
              Language (7 Regions)
            </p>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {LANGUAGE_OPTIONS.map((opt) => {
                const active = prefs.language === opt.code;
                return (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => onUpdate({ ...prefs, language: opt.code as LanguageCode })}
                    className={`border px-3 py-2.5 text-left transition-colors cursor-pointer ${
                      active
                        ? 'border-[#1C1B19] bg-[#1C1B19] text-[#F6F3EE] dark:border-[#CFAF70] dark:bg-[#CFAF70] dark:text-[#111110]'
                        : 'border-[#1C1B19]/15 dark:border-[#F2ECE1]/15 hover:border-[#B6975C]'
                    }`}
                  >
                    <span className="block text-[12.5px] font-medium">{opt.native}</span>
                    <span className="block text-[10px] tracking-[0.1em] uppercase opacity-70">
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 6 Currencies */}
          <div>
            <p className="text-[11px] font-medium tracking-[0.18em] uppercase text-[#8E7760] dark:text-[#CFAF70]">
              Currency & Regional Shipping Estimate
            </p>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CURRENCY_LIST.map((code) => {
                const active = prefs.currency === code;
                const cfg = CURRENCY_CONFIG[code];
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => onUpdate({ ...prefs, currency: code })}
                    className={`border px-3.5 py-2.5 text-left transition-colors cursor-pointer ${
                      active
                        ? 'border-[#1C1B19] bg-[#1C1B19] text-[#F6F3EE] dark:border-[#CFAF70] dark:bg-[#CFAF70] dark:text-[#111110]'
                        : 'border-[#1C1B19]/15 dark:border-[#F2ECE1]/15 hover:border-[#B6975C]'
                    }`}
                  >
                    <span className="block text-[12.5px] font-medium">
                      {cfg.symbol} {code}
                    </span>
                    <span className="block text-[10.5px] opacity-70">{cfg.shippingDays}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Volume Units + Atmosphere */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 border-t border-[#1C1B19]/10 dark:border-[#F2ECE1]/10">
            <div>
              <p className="text-[11px] font-medium tracking-[0.18em] uppercase text-[#8E7760] dark:text-[#CFAF70]">
                Volume Units
              </p>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                {(['metric', 'imperial'] as VolumeSystem[]).map((sys) => (
                  <button
                    key={sys}
                    type="button"
                    onClick={() => onUpdate({ ...prefs, volumeSystem: sys })}
                    className={`border py-2.5 text-[11px] tracking-[0.14em] uppercase transition-colors cursor-pointer ${
                      prefs.volumeSystem === sys
                        ? 'border-[#1C1B19] bg-[#1C1B19] text-[#F6F3EE] dark:border-[#CFAF70] dark:bg-[#CFAF70] dark:text-[#111110]'
                        : 'border-[#1C1B19]/15 dark:border-[#F2ECE1]/15 hover:border-[#B6975C]'
                    }`}
                  >
                    {sys === 'metric' ? 'ml / g' : 'fl oz / oz'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-medium tracking-[0.18em] uppercase text-[#8E7760] dark:text-[#CFAF70]">
                Lighting Atmosphere
              </p>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onUpdate({ ...prefs, theme: 'daylight' })}
                  className={`inline-flex items-center justify-center gap-2 border py-2.5 text-[11px] tracking-[0.14em] uppercase transition-colors cursor-pointer ${
                    prefs.theme === 'daylight'
                      ? 'border-[#1C1B19] bg-[#1C1B19] text-[#F6F3EE]'
                      : 'border-[#1C1B19]/15 dark:border-[#F2ECE1]/15 hover:border-[#B6975C]'
                  }`}
                >
                  <Sun className="h-3.5 w-3.5" />
                  Daylight
                </button>
                <button
                  type="button"
                  onClick={() => onUpdate({ ...prefs, theme: 'nocturne' })}
                  className={`inline-flex items-center justify-center gap-2 border py-2.5 text-[11px] tracking-[0.14em] uppercase transition-colors cursor-pointer ${
                    prefs.theme === 'nocturne'
                      ? 'border-[#CFAF70] bg-[#CFAF70] text-[#111110]'
                      : 'border-[#1C1B19]/15 dark:border-[#F2ECE1]/15 hover:border-[#B6975C]'
                  }`}
                >
                  <Moon className="h-3.5 w-3.5" />
                  Nocturne
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
