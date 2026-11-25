import { ProductId, getProductById } from '../data/products';
import { CURRENCY_CONFIG, CurrencyCode, formatCurrencyAmount } from '../i18n/translations';

export const RITUAL_BUNDLE_DISCOUNT_RATE = 0.15;
export const GIFT_WRAP_FEE_USD = 12;
export const ENGRAVING_FEE_USD = 15;
export const SUBSCRIPTION_DISCOUNT_RATE = 0.1;

export interface CartItem {
  id: string; // unique key combining productId + refill + engraving
  productId: ProductId;
  quantity: number;
  isRefill?: boolean;
  isSubscription?: boolean;
  subscriptionIntervalDays?: 30 | 45 | 60;
  engravingText?: string;
}

export interface PricingSummary {
  subtotalUsd: number;
  distinctProductCount: number;
  bundleDiscountEligible: boolean;
  bundleDiscountUsd: number;
  subscriptionSavingsUsd: number;
  engravingFeesUsd: number;
  giftWrapFeeUsd: number;
  shippingFeeUsd: number;
  totalUsd: number;
}

export interface OrderRecord {
  orderNumber: string;
  paymentMode: 'test' | 'live';
  status: 'Confirmed (Test Mode)' | 'Preparing Atelier Parcel' | 'Dispatched';
  customerName: string;
  customerEmail: string;
  shippingAddress: string;
  currency: CurrencyCode;
  giftWrap: boolean;
  giftNote: string;
  items: Array<{
    productId: ProductId;
    name: string;
    volume: string;
    quantity: number;
    isRefill: boolean;
    engravingText?: string;
    unitPriceUsd: number;
    lineTotalUsd: number;
  }>;
  pricing: PricingSummary;
  estimatedDelivery: string;
  placedAtIso: string;
}

export interface SkinJournalEntry {
  id: string;
  dayTag: 'Day 1' | 'Day 14' | 'Day 30' | 'Daily Note';
  createdAtIso: string;
  hydrationScore: number; // 1-10
  appearanceScore: number; // 1-10
  notes: string;
  productsUsed: ProductId[];
  photoDataUrl?: string;
}

export interface RefillScheduleEstimate {
  totalDoses: number;
  estimatedDays: number;
  replenishmentDateIso: string;
}

export function makeCartLineKey(
  productId: ProductId,
  isRefill = false,
  engravingText = '',
  isSubscription = false
): string {
  const cleanEngraving = engravingText.trim().slice(0, 12).toUpperCase();
  return `${productId}|${isRefill ? 'refill' : 'full'}|${cleanEngraving}|${isSubscription ? 'sub' : 'once'}`;
}

export function getUnitPriceUsd(item: Pick<CartItem, 'productId' | 'isRefill'>): number {
  const product = getProductById(item.productId);
  if (item.isRefill && product.refillEligible && product.refillPriceUsd !== null) {
    return product.refillPriceUsd;
  }
  return product.price;
}

export function addToCart(
  items: readonly CartItem[],
  productId: ProductId,
  quantity = 1,
  options?: {
    isRefill?: boolean;
    isSubscription?: boolean;
    subscriptionIntervalDays?: 30 | 45 | 60;
    engravingText?: string;
  }
): CartItem[] {
  const safeQty = Math.max(1, Math.floor(quantity));
  const cleanEngraving = (options?.engravingText ?? '').trim().slice(0, 12);
  const isRefill = Boolean(options?.isRefill);
  const isSubscription = Boolean(options?.isSubscription);
  const key = makeCartLineKey(productId, isRefill, cleanEngraving, isSubscription);

  const existing = items.find((item) => item.id === key);
  if (existing) {
    return items.map((item) =>
      item.id === key ? { ...item, quantity: item.quantity + safeQty } : item
    );
  }
  return [
    ...items,
    {
      id: key,
      productId,
      quantity: safeQty,
      isRefill,
      isSubscription,
      subscriptionIntervalDays: options?.subscriptionIntervalDays ?? (isSubscription ? 45 : undefined),
      engravingText: cleanEngraving || undefined,
    },
  ];
}

export function updateCartQuantity(
  items: readonly CartItem[],
  lineIdOrProductId: string,
  nextQuantity: number
): CartItem[] {
  if (nextQuantity <= 0) {
    return items.filter(
      (item) => item.id !== lineIdOrProductId && item.productId !== lineIdOrProductId
    );
  }
  return items.map((item) =>
    item.id === lineIdOrProductId || item.productId === lineIdOrProductId
      ? { ...item, quantity: Math.floor(nextQuantity) }
      : item
  );
}

export function removeFromCart(items: readonly CartItem[], lineIdOrProductId: string): CartItem[] {
  return items.filter(
    (item) => item.id !== lineIdOrProductId && item.productId !== lineIdOrProductId
  );
}

export function getCartCount(items: readonly CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function getCartSubtotal(items: readonly CartItem[]): number {
  return items.reduce((sum, item) => sum + getUnitPriceUsd(item) * item.quantity, 0);
}

/**
 * Authoritative cart pricing calculator shared between frontend and Express server validation.
 * Applies configurable 15% three-product ritual bundle discount when >= 3 distinct products are selected.
 */
export function calculatePricingSummary(
  items: readonly CartItem[],
  options?: { giftWrap?: boolean; currency?: CurrencyCode }
): PricingSummary {
  const currency = options?.currency ?? 'USD';
  const subtotalUsd = getCartSubtotal(items);
  const distinctIds = new Set(items.map((item) => item.productId));
  const distinctProductCount = distinctIds.size;

  const bundleDiscountEligible = distinctProductCount >= 3;
  const bundleDiscountUsd = bundleDiscountEligible
    ? Math.round(subtotalUsd * RITUAL_BUNDLE_DISCOUNT_RATE)
    : 0;

  const subscriptionSavingsUsd = items.reduce((sum, item) => {
    if (!item.isSubscription) return sum;
    return sum + Math.round(getUnitPriceUsd(item) * item.quantity * SUBSCRIPTION_DISCOUNT_RATE);
  }, 0);

  const engravingFeesUsd = items.reduce((sum, item) => {
    if (!item.engravingText || !item.engravingText.trim()) return sum;
    const product = getProductById(item.productId);
    return product.personalizationEligible ? sum + ENGRAVING_FEE_USD * item.quantity : sum;
  }, 0);

  const giftWrapFeeUsd = options?.giftWrap ? GIFT_WRAP_FEE_USD : 0;

  const netMerchandise = Math.max(0, subtotalUsd - bundleDiscountUsd - subscriptionSavingsUsd);
  const threshold = CURRENCY_CONFIG[currency].freeShippingThresholdUsd;
  const shippingFeeUsd = items.length === 0 || netMerchandise >= threshold ? 0 : 18;
  const totalUsd = netMerchandise + engravingFeesUsd + giftWrapFeeUsd + shippingFeeUsd;

  return {
    subtotalUsd,
    distinctProductCount,
    bundleDiscountEligible,
    bundleDiscountUsd,
    subscriptionSavingsUsd,
    engravingFeesUsd,
    giftWrapFeeUsd,
    shippingFeeUsd,
    totalUsd,
  };
}

/**
 * Pure dosage-based lifespan calculator (no fabricated plastic/carbon reduction stats).
 */
export function calculateRefillSchedule(
  volumeValue: number,
  dosagePerUse: number,
  usesPerDay: number,
  referenceDate = new Date()
): RefillScheduleEstimate {
  const safeVolume = Math.max(1, volumeValue);
  const safeDosage = Math.max(0.05, dosagePerUse);
  const safeUses = Math.max(0.25, usesPerDay);

  const totalDoses = Math.floor(safeVolume / safeDosage);
  const estimatedDays = Math.max(7, Math.round(totalDoses / safeUses));
  const replenish = new Date(referenceDate.getTime() + estimatedDays * 86400 * 1000);

  return {
    totalDoses,
    estimatedDays,
    replenishmentDateIso: replenish.toISOString().slice(0, 10),
  };
}

export function buildOrderConfirmation(
  items: readonly CartItem[],
  customerName: string,
  customerEmail: string,
  options?: {
    shippingAddress?: string;
    currency?: CurrencyCode;
    giftWrap?: boolean;
    giftNote?: string;
    paymentMode?: 'test' | 'live';
  }
): OrderRecord {
  const currency = options?.currency ?? 'USD';
  const pricing = calculatePricingSummary(items, {
    giftWrap: options?.giftWrap,
    currency,
  });

  const detailed = items.map((item) => {
    const product = getProductById(item.productId);
    const unitPriceUsd = getUnitPriceUsd(item);
    return {
      productId: item.productId,
      name: product.name,
      volume: product.volume,
      quantity: item.quantity,
      isRefill: Boolean(item.isRefill),
      engravingText: item.engravingText,
      unitPriceUsd,
      lineTotalUsd: unitPriceUsd * item.quantity,
    };
  });

  const suffix = String(2040 + detailed.length * 13 + (pricing.totalUsd % 89)).padStart(4, '0');

  return {
    orderNumber: `SF-TEST-${suffix}`,
    paymentMode: options?.paymentMode ?? 'test',
    status: 'Confirmed (Test Mode)',
    customerName: customerName.trim(),
    customerEmail: customerEmail.trim(),
    shippingAddress: (options?.shippingAddress ?? '').trim(),
    currency,
    giftWrap: Boolean(options?.giftWrap),
    giftNote: (options?.giftNote ?? '').trim(),
    items: detailed,
    pricing,
    estimatedDelivery: CURRENCY_CONFIG[currency].shippingDays,
    placedAtIso: new Date().toISOString(),
  };
}

export function formatPrice(amountUsd: number, currency: CurrencyCode = 'USD'): string {
  return formatCurrencyAmount(amountUsd, currency);
}
