import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Gift,
  Minus,
  Plus,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { getProductById } from '../data/products';
import {
  CartItem,
  GIFT_WRAP_FEE_USD,
  OrderRecord,
  buildOrderConfirmation,
  calculatePricingSummary,
  getUnitPriceUsd,
} from '../store/cartLogic';
import {
  CURRENCY_CONFIG,
  LocalePreferences,
  UiDictionary,
  formatCurrencyAmount,
} from '../i18n/translations';

interface ShoppingBagDrawerProps {
  isOpen: boolean;
  standalonePage?: boolean;
  items: readonly CartItem[];
  prefs: LocalePreferences;
  t: UiDictionary;
  onClose: () => void;
  onUpdateQuantity: (lineId: string, nextQty: number) => void;
  onRemoveItem: (lineId: string) => void;
  onClearCart: () => void;
  onOrderConfirmed: (order: OrderRecord) => void;
  onBrowseCollection: () => void;
}

export function ShoppingBagDrawer({
  isOpen,
  standalonePage = false,
  items,
  prefs,
  t,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onOrderConfirmed,
  onBrowseCollection,
}: ShoppingBagDrawerProps) {
  const [step, setStep] = useState<'bag' | 'checkout' | 'confirmation'>(
    standalonePage ? 'checkout' : 'bag'
  );
  const [giftWrap, setGiftWrap] = useState(false);
  const [giftNote, setGiftNote] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<OrderRecord | null>(null);

  useEffect(() => {
    if (!isOpen && !standalonePage) {
      const timer = window.setTimeout(() => {
        setStep('bag');
        setValidationError(null);
      }, 220);
      return () => window.clearTimeout(timer);
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !standalonePage) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, standalonePage, onClose]);

  const pricing = useMemo(
    () => calculatePricingSummary(items, { giftWrap, currency: prefs.currency }),
    [items, giftWrap, prefs.currency]
  );

  if (!isOpen && !standalonePage) return null;

  const remainingForBundle = Math.max(0, 3 - pricing.distinctProductCount);
  const shippingDays = CURRENCY_CONFIG[prefs.currency].shippingDays;

  const handleCheckoutSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerEmail.trim() || !shippingAddress.trim()) {
      setValidationError(t.validationMissing);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
      setValidationError(t.validationEmail);
      return;
    }

    setValidationError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/checkout/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          shippingAddress: shippingAddress.trim(),
          currency: prefs.currency,
          giftWrap,
          giftNote: giftNote.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setValidationError(data?.error || 'Could not validate test checkout.');
        setSubmitting(false);
        return;
      }

      const order: OrderRecord =
        data.order ??
        buildOrderConfirmation(items, customerName, customerEmail, {
          shippingAddress,
          currency: prefs.currency,
          giftWrap,
          giftNote,
          paymentMode: 'test',
        });

      setConfirmedOrder(order);
      onOrderConfirmed(order);
      onClearCart();
      setStep('confirmation');
    } catch {
      setValidationError('Unable to reach server checkout validation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const panelBody = (
    <div
      className={
        standalonePage
          ? 'mx-auto max-w-[780px] border border-[#1C1B19]/15 dark:border-[#CFAF70]/25 bg-[#F6F3EE] dark:bg-[#1B1A18] text-[#1C1B19] dark:text-[#F2ECE1] flex flex-col'
          : 'relative flex h-full w-full max-w-[490px] flex-col bg-[#F6F3EE] dark:bg-[#1B1A18] text-[#1C1B19] dark:text-[#F2ECE1] border-l border-[#1C1B19]/15 dark:border-[#CFAF70]/20 shadow-2xl'
      }
      data-testid="shopping-bag-drawer"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-[#1C1B19]/12 dark:border-[#F2ECE1]/12">
        <div className="flex items-center gap-2.5">
          <ShoppingBag className="h-[18px] w-[18px] stroke-[1.5]" />
          <h2 className="font-display text-2xl font-normal tracking-wide">
            {step === 'bag' && t.navBag}
            {step === 'checkout' && t.checkoutTitle}
            {step === 'confirmation' && 'Order Confirmed (Test Mode)'}
          </h2>
        </div>
        {!standalonePage && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close shopping bag"
            className="inline-flex h-9 w-9 items-center justify-center opacity-75 hover:opacity-100 cursor-pointer"
          >
            <X className="h-5 w-5 stroke-[1.5]" />
          </button>
        )}
      </div>

      {/* 3-Product Ritual Privilege Banner */}
      {step !== 'confirmation' && items.length > 0 && (
        <div className="px-6 py-3 bg-[#EAE3D7]/70 dark:bg-[#111110] border-b border-[#1C1B19]/10 dark:border-[#F2ECE1]/10 flex items-center gap-2 text-[11.5px]">
          <Sparkles className="h-3.5 w-3.5 text-[#B6975C] shrink-0" />
          {pricing.bundleDiscountEligible ? (
            <span className="font-medium text-[#8E7760] dark:text-[#CFAF70]">
              {t.bundleDiscountLabel} unlocked — saving{' '}
              {formatCurrencyAmount(pricing.bundleDiscountUsd, prefs.currency)}.
            </span>
          ) : (
            <span className="font-light opacity-80">
              Add {remainingForBundle} more distinct vessel{remainingForBundle > 1 ? 's' : ''} to
              unlock the 15% three-product Ritual privilege.
            </span>
          )}
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {step === 'confirmation' && confirmedOrder ? (
          <div className="space-y-6 py-2">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-7 w-7 stroke-[1.4] text-[#B6975C]" />
              <div>
                <p className="text-[10.5px] tracking-[0.2em] uppercase text-[#8E7760] dark:text-[#CFAF70]">
                  Test Mode Reference {confirmedOrder.orderNumber}
                </p>
                <p className="font-display text-2xl font-normal">
                  Thank you, {confirmedOrder.customerName}
                </p>
              </div>
            </div>

            <p className="text-[13.5px] font-light leading-relaxed opacity-80">
              Your test-mode order has been validated by the server and archived in your Atelier
              Order History. Estimated regional dispatch: {confirmedOrder.estimatedDelivery}. No
              real card charge was processed.
            </p>

            <div className="border-t border-b border-[#1C1B19]/12 dark:border-[#F2ECE1]/12 py-4 space-y-2.5">
              {confirmedOrder.items.map((item, idx) => (
                <div key={`${item.productId}-${idx}`} className="flex justify-between text-[13px]">
                  <span className="font-light">
                    {item.name} {item.isRefill ? '(Refill)' : ''}{' '}
                    {item.engravingText ? `[${item.engravingText}]` : ''} &times; {item.quantity}
                  </span>
                  <span className="font-medium tabular-nums">
                    {formatCurrencyAmount(item.lineTotalUsd, prefs.currency)}
                  </span>
                </div>
              ))}
              {confirmedOrder.pricing.bundleDiscountUsd > 0 && (
                <div className="flex justify-between text-[12.5px] text-[#8E7760] dark:text-[#CFAF70]">
                  <span>{t.bundleDiscountLabel}</span>
                  <span>
                    -{formatCurrencyAmount(confirmedOrder.pricing.bundleDiscountUsd, prefs.currency)}
                  </span>
                </div>
              )}
              <div className="pt-2 border-t border-[#1C1B19]/10 dark:border-[#F2ECE1]/10 flex justify-between text-[14.5px] font-medium">
                <span>{t.totalLabel}</span>
                <span className="tabular-nums">
                  {formatCurrencyAmount(confirmedOrder.pricing.totalUsd, prefs.currency)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setConfirmedOrder(null);
                setStep('bag');
                if (standalonePage) onBrowseCollection();
                else onClose();
              }}
              className="w-full border border-[#1C1B19] bg-[#1C1B19] dark:border-[#CFAF70] dark:bg-[#CFAF70] dark:text-[#111110] py-3.5 text-[11.5px] font-medium tracking-[0.2em] uppercase text-[#F6F3EE] cursor-pointer"
            >
              Return to SOMA FACE
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <p className="font-display text-2xl font-light">{t.bagEmpty}</p>
            <p className="mt-2 max-w-xs text-[13px] font-light leading-relaxed opacity-70">
              Explore our 12 architectural vessels or curate a 3-piece Travertine Ritual to unlock
              15% privilege savings.
            </p>
            <button
              type="button"
              onClick={() => {
                if (!standalonePage) onClose();
                onBrowseCollection();
              }}
              className="mt-6 border border-[#1C1B19] dark:border-[#CFAF70] px-7 py-2.5 text-[11px] font-medium tracking-[0.18em] uppercase cursor-pointer"
            >
              {t.heroCta}
            </button>
          </div>
        ) : step === 'bag' ? (
          <div className="space-y-5">
            <div className="divide-y divide-[#1C1B19]/10 dark:divide-[#F2ECE1]/10">
              {items.map((item) => {
                const product = getProductById(item.productId);
                const unitUsd = getUnitPriceUsd(item);
                return (
                  <div key={item.id} className="flex gap-4 py-4 first:pt-0">
                    <div className="h-22 w-18 shrink-0 flex items-end justify-center bg-[#EAE3D7]/60 dark:bg-[#111110] p-2">
                      <img
                        src={product.cutoutImage}
                        alt={product.name}
                        className="max-h-full w-auto object-contain"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-display text-[19px] leading-tight">{product.name}</h3>
                          <p className="text-[11px] tracking-[0.1em] uppercase opacity-65">
                            {product.volume}
                            {item.isRefill ? ' · Refill Capsule' : ''}
                            {item.isSubscription
                              ? ` · Auto-${item.subscriptionIntervalDays ?? 45}d (-10%)`
                              : ''}
                          </p>
                          {item.engravingText && (
                            <p className="mt-0.5 text-[10.5px] tracking-[0.14em] uppercase text-[#B6975C]">
                              Engraving: “{item.engravingText}”
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.id)}
                          aria-label={`Remove ${product.name}`}
                          className="p-1 opacity-55 hover:opacity-100 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4 stroke-[1.5]" />
                        </button>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="inline-flex items-center border border-[#1C1B19]/22 dark:border-[#F2ECE1]/22">
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                            aria-label={`Decrease quantity of ${product.name}`}
                            className="h-7 w-7 inline-flex items-center justify-center cursor-pointer"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-7 text-center text-[12px] font-medium tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                            aria-label={`Increase quantity of ${product.name}`}
                            className="h-7 w-7 inline-flex items-center justify-center cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        <span className="text-[13.5px] font-medium tabular-nums">
                          {formatCurrencyAmount(unitUsd * item.quantity, prefs.currency)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Signature Linen Gift Packaging Toggle */}
            <div className="border border-[#1C1B19]/12 dark:border-[#F2ECE1]/12 bg-[#EAE3D7]/40 dark:bg-[#111110]/60 p-4 space-y-2.5">
              <label className="flex items-center justify-between gap-3 cursor-pointer text-[12.5px]">
                <span className="inline-flex items-center gap-2 font-medium">
                  <input
                    type="checkbox"
                    checked={giftWrap}
                    onChange={(e) => setGiftWrap(e.target.checked)}
                    className="accent-[#B6975C]"
                  />
                  <Gift className="h-3.5 w-3.5 text-[#B6975C]" />
                  Atelier Linen Gift Box &amp; Card
                </span>
                <span className="tabular-nums opacity-75">
                  +{formatCurrencyAmount(GIFT_WRAP_FEE_USD, prefs.currency)}
                </span>
              </label>
              {giftWrap && (
                <input
                  type="text"
                  maxLength={120}
                  value={giftNote}
                  onChange={(e) => setGiftNote(e.target.value)}
                  placeholder="Optional handwritten card message…"
                  className="w-full border border-[#1C1B19]/20 dark:border-[#F2ECE1]/20 bg-transparent px-3 py-2 text-[12.5px] outline-none focus:border-[#B6975C]"
                />
              )}
            </div>
          </div>
        ) : (
          <form id="soma-checkout-form" onSubmit={handleCheckoutSubmit} className="space-y-4">
            {/* Explicit Test Mode Notice */}
            <div className="flex items-start gap-2.5 border border-[#B6975C]/50 bg-[#EAE3D7]/55 dark:bg-[#111110] p-3.5 text-[12px] font-light leading-relaxed">
              <ShieldAlert className="h-4 w-4 text-[#B6975C] shrink-0 mt-0.5" />
              <p>{t.checkoutTestNotice}</p>
            </div>

            {/* Express Wallet Availability Preview (Test Mode) */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="border border-[#1C1B19]/18 dark:border-[#F2ECE1]/18 px-3 py-2.5 text-center opacity-70">
                <span className="block text-[11px] font-medium tracking-[0.14em] uppercase">
                  Apple Pay
                </span>
                <span className="block text-[10px] opacity-75">Available on live checkout</span>
              </div>
              <div className="border border-[#1C1B19]/18 dark:border-[#F2ECE1]/18 px-3 py-2.5 text-center opacity-70">
                <span className="block text-[11px] font-medium tracking-[0.14em] uppercase">
                  Google Pay
                </span>
                <span className="block text-[10px] opacity-75">Available on live checkout</span>
              </div>
            </div>

            <div>
              <label
                htmlFor="soma-checkout-name"
                className="block text-[10.5px] tracking-[0.16em] uppercase text-[#8E7760] dark:text-[#CFAF70]"
              >
                {t.fullName}
              </label>
              <input
                id="soma-checkout-name"
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Elena Vance"
                className="mt-1.5 w-full border border-[#1C1B19]/22 dark:border-[#F2ECE1]/22 bg-transparent px-3.5 py-2.5 text-[14px] outline-none focus:border-[#B6975C]"
              />
            </div>

            <div>
              <label
                htmlFor="soma-checkout-email"
                className="block text-[10.5px] tracking-[0.16em] uppercase text-[#8E7760] dark:text-[#CFAF70]"
              >
                {t.emailAddress}
              </label>
              <input
                id="soma-checkout-email"
                type="email"
                required
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="elena@example.com"
                className="mt-1.5 w-full border border-[#1C1B19]/22 dark:border-[#F2ECE1]/22 bg-transparent px-3.5 py-2.5 text-[14px] outline-none focus:border-[#B6975C]"
              />
            </div>

            <div>
              <label
                htmlFor="soma-checkout-address"
                className="block text-[10.5px] tracking-[0.16em] uppercase text-[#8E7760] dark:text-[#CFAF70]"
              >
                {t.deliveryAddress}
              </label>
              <textarea
                id="soma-checkout-address"
                rows={3}
                required
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="Street, Suite, City, Postal Code, Country"
                className="mt-1.5 w-full border border-[#1C1B19]/22 dark:border-[#F2ECE1]/22 bg-transparent px-3.5 py-2.5 text-[14px] outline-none focus:border-[#B6975C] resize-none"
              />
            </div>

            {validationError && (
              <p className="text-[12.5px] text-[#9E3C2B] dark:text-[#F09A8A]" role="alert">
                {validationError}
              </p>
            )}
          </form>
        )}
      </div>

      {/* Pricing Summary & Footer CTA */}
      {items.length > 0 && step !== 'confirmation' && (
        <div className="border-t border-[#1C1B19]/12 dark:border-[#F2ECE1]/12 bg-[#EAE3D7]/55 dark:bg-[#111110] px-6 py-5 space-y-2.5">
          <div className="flex justify-between text-[12.5px]">
            <span className="opacity-75">{t.subtotal}</span>
            <span className="tabular-nums">
              {formatCurrencyAmount(pricing.subtotalUsd, prefs.currency)}
            </span>
          </div>

          {pricing.bundleDiscountUsd > 0 && (
            <div className="flex justify-between text-[12.5px] text-[#8E7760] dark:text-[#CFAF70]">
              <span>{t.bundleDiscountLabel}</span>
              <span className="tabular-nums">
                -{formatCurrencyAmount(pricing.bundleDiscountUsd, prefs.currency)}
              </span>
            </div>
          )}

          {pricing.subscriptionSavingsUsd > 0 && (
            <div className="flex justify-between text-[12.5px] text-[#8E7760] dark:text-[#CFAF70]">
              <span>Auto-Replenishment Savings (10%)</span>
              <span className="tabular-nums">
                -{formatCurrencyAmount(pricing.subscriptionSavingsUsd, prefs.currency)}
              </span>
            </div>
          )}

          {pricing.engravingFeesUsd > 0 && (
            <div className="flex justify-between text-[12.5px]">
              <span className="opacity-75">Bespoke Gold Engraving</span>
              <span className="tabular-nums">
                +{formatCurrencyAmount(pricing.engravingFeesUsd, prefs.currency)}
              </span>
            </div>
          )}

          {pricing.giftWrapFeeUsd > 0 && (
            <div className="flex justify-between text-[12.5px]">
              <span className="opacity-75">Atelier Linen Gift Box</span>
              <span className="tabular-nums">
                +{formatCurrencyAmount(pricing.giftWrapFeeUsd, prefs.currency)}
              </span>
            </div>
          )}

          <div className="flex justify-between text-[12.5px]">
            <span className="opacity-75">Estimated Delivery ({shippingDays})</span>
            <span className="tabular-nums">
              {pricing.shippingFeeUsd === 0
                ? 'Complimentary'
                : formatCurrencyAmount(pricing.shippingFeeUsd, prefs.currency)}
            </span>
          </div>

          <div className="pt-2 border-t border-[#1C1B19]/12 dark:border-[#F2ECE1]/12 flex justify-between text-[15px] font-medium">
            <span>{t.totalLabel}</span>
            <span className="tabular-nums">
              {formatCurrencyAmount(pricing.totalUsd, prefs.currency)}
            </span>
          </div>

          {step === 'bag' ? (
            <button
              type="button"
              onClick={() => setStep('checkout')}
              className="mt-2 w-full border border-[#1C1B19] bg-[#1C1B19] dark:border-[#CFAF70] dark:bg-[#CFAF70] dark:text-[#111110] py-3.5 text-[11.5px] font-medium tracking-[0.2em] uppercase text-[#F6F3EE] cursor-pointer"
            >
              {t.checkoutProceed}
            </button>
          ) : (
            <div className="pt-2 flex gap-2.5">
              <button
                type="button"
                onClick={() => setStep('bag')}
                className="border border-[#1C1B19]/25 dark:border-[#F2ECE1]/25 px-4 py-3 text-[11px] tracking-[0.16em] uppercase cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                form="soma-checkout-form"
                disabled={submitting}
                className="flex-1 border border-[#1C1B19] bg-[#1C1B19] dark:border-[#CFAF70] dark:bg-[#CFAF70] dark:text-[#111110] py-3 text-[11.5px] font-medium tracking-[0.2em] uppercase text-[#F6F3EE] disabled:opacity-50 cursor-pointer"
              >
                {submitting ? 'Validating…' : t.checkoutComplete}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (standalonePage) {
    return (
      <main className="min-h-screen bg-[#F6F3EE] dark:bg-[#111110] pt-24 md:pt-28 pb-24 px-5">
        {panelBody}
      </main>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#111110]/70"
      role="dialog"
      aria-modal="true"
      aria-label="Shopping Bag"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {panelBody}
    </div>
  );
}
