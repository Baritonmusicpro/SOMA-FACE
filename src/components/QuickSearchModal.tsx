import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Search, X } from 'lucide-react';
import { ProductId, SOMA_PRODUCTS } from '../data/products';
import {
  LocalePreferences,
  UiDictionary,
  formatCurrencyAmount,
  formatProductVolume,
} from '../i18n/translations';

interface QuickSearchModalProps {
  isOpen: boolean;
  prefs: LocalePreferences;
  t: UiDictionary;
  onClose: () => void;
  onSelectProduct: (productId: ProductId) => void;
  onInspect3D: (productId: ProductId) => void;
  onAddToBag: (productId: ProductId) => void;
}

export function QuickSearchModal({
  isOpen,
  prefs,
  t,
  onClose,
  onSelectProduct,
  onInspect3D,
  onAddToBag,
}: QuickSearchModalProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 40);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SOMA_PRODUCTS.slice(0, 6);
    return SOMA_PRODUCTS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.seriesLabel.toLowerCase().includes(q) ||
        p.ritualStep.toLowerCase().includes(q) ||
        p.textureNote.toLowerCase().includes(q) ||
        p.stepCategory.toLowerCase().includes(q)
    );
  }, [query]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-[#111110]/75 pt-16 md:pt-24 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Search SOMA FACE collection"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[760px] bg-[#F6F3EE] dark:bg-[#1B1A18] text-[#1C1B19] dark:text-[#F2ECE1] border border-[#1C1B19]/15 dark:border-[#CFAF70]/25 shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#1C1B19]/12 dark:border-[#F2ECE1]/12">
          <Search className="h-4 w-4 text-[#8E7760] dark:text-[#CFAF70] shrink-0" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full bg-transparent text-[15px] font-light outline-none placeholder:text-[#8E7760]/70"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close search"
            className="inline-flex h-8 w-8 items-center justify-center opacity-70 hover:opacity-100 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto divide-y divide-[#1C1B19]/10 dark:divide-[#F2ECE1]/10">
          {matches.length === 0 ? (
            <p className="px-6 py-10 text-center text-[14px] font-light text-[#8E7760]">
              No vessels matched “{query}”. Try searching “serum”, “balm”, “cleanse”, or “overnight”.
            </p>
          ) : (
            matches.map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#EAE3D7]/55 dark:hover:bg-[#111110]/50 transition-colors"
              >
                <div className="h-14 w-12 shrink-0 flex items-end justify-center bg-[#EAE3D7]/60 dark:bg-[#111110]/60 p-1.5">
                  <img
                    src={product.cutoutImage}
                    alt={product.name}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] tracking-[0.16em] uppercase text-[#8E7760] dark:text-[#CFAF70]">
                    {product.seriesLabel}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onSelectProduct(product.id);
                    }}
                    className="font-display text-xl font-normal hover:underline text-left cursor-pointer"
                  >
                    {product.name}
                  </button>
                  <p className="text-[12px] font-light opacity-70 truncate">
                    {formatProductVolume(product.volume, product.volumeImperial, prefs.volumeSystem)} ·{' '}
                    {product.ritualStep}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[13px] font-medium tabular-nums mr-1">
                    {formatCurrencyAmount(product.price, prefs.currency)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onInspect3D(product.id);
                    }}
                    title={t.inspect3d}
                    className="inline-flex h-8 w-8 items-center justify-center border border-[#1C1B19]/20 dark:border-[#F2ECE1]/20 hover:border-[#B6975C] cursor-pointer"
                  >
                    <Box className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onAddToBag(product.id);
                      onClose();
                    }}
                    className="border border-[#1C1B19] bg-[#1C1B19] dark:border-[#CFAF70] dark:bg-[#CFAF70] dark:text-[#111110] px-3 py-1.5 text-[10.5px] tracking-[0.14em] uppercase text-[#F6F3EE] cursor-pointer"
                  >
                    {t.addToBag}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
