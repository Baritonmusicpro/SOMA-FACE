import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ENGRAVING_FEE_USD,
  GIFT_WRAP_FEE_USD,
  RITUAL_BUNDLE_DISCOUNT_RATE,
  addToCart,
  buildOrderConfirmation,
  calculatePricingSummary,
  calculateRefillSchedule,
  getCartCount,
  getCartSubtotal,
  removeFromCart,
  updateCartQuantity,
} from './cartLogic.ts';
import { HERO_TRIO_IDS, SOMA_PRODUCTS } from '../data/products.ts';
import {
  CURRENCY_CONFIG,
  LANGUAGE_OPTIONS,
  TRANSLATIONS,
  formatCurrencyAmount,
} from '../i18n/translations.ts';

test('catalog maintains all 12 verified products across 3 series and never fabricates INCI', () => {
  assert.equal(SOMA_PRODUCTS.length, 12);
  assert.deepEqual(HERO_TRIO_IDS, ['serum', 'cream', 'eye-balm']);

  const seriesCounts = new Map<string, number>();
  for (const p of SOMA_PRODUCTS) {
    seriesCounts.set(p.series, (seriesCounts.get(p.series) ?? 0) + 1);
    assert.equal(p.verifiedInci, null, `Product ${p.id} must not fabricate unverified INCI`);
  }
  assert.equal(seriesCounts.get('botanical-natural'), 4);
  assert.equal(seriesCounts.get('minimalist-daily'), 3);
  assert.equal(seriesCounts.get('signature-night-repair'), 5);
});

test('cart manages full vessels, refill capsules, engraving, and subscriptions as separate lines', () => {
  let cart = addToCart([], 'cream', 1);
  cart = addToCart(cart, 'cream', 1, { isRefill: true });
  cart = addToCart(cart, 'cream', 1, { engravingText: 'SOMA' });

  assert.equal(cart.length, 3);
  assert.equal(getCartCount(cart), 3);

  const refillLine = cart.find((c) => c.isRefill);
  assert.ok(refillLine);
  cart = updateCartQuantity(cart, refillLine.id, 2);
  assert.equal(getCartCount(cart), 4);

  cart = removeFromCart(cart, refillLine.id);
  assert.equal(getCartCount(cart), 2);
});

test('three distinct vessels unlock 15% ritual bundle discount and add engraving/gift fees cleanly', () => {
  let cart = addToCart([], 'deep-cleanse-oil', 1);
  cart = addToCart(cart, 'serum', 1, { engravingText: 'ELENA' });
  cart = addToCart(cart, 'cream', 1);

  const summary = calculatePricingSummary(cart, { giftWrap: true, currency: 'USD' });
  const expectedSubtotal = getCartSubtotal(cart);
  const expectedDiscount = Math.round(expectedSubtotal * RITUAL_BUNDLE_DISCOUNT_RATE);

  assert.equal(summary.distinctProductCount, 3);
  assert.equal(summary.bundleDiscountEligible, true);
  assert.equal(summary.bundleDiscountUsd, expectedDiscount);
  assert.equal(summary.engravingFeesUsd, ENGRAVING_FEE_USD);
  assert.equal(summary.giftWrapFeeUsd, GIFT_WRAP_FEE_USD);
  assert.equal(summary.shippingFeeUsd, 0);
  assert.equal(
    summary.totalUsd,
    expectedSubtotal - expectedDiscount + ENGRAVING_FEE_USD + GIFT_WRAP_FEE_USD
  );
});

test('buildOrderConfirmation generates a deterministic test-mode order record', () => {
  let cart = addToCart([], 'serum', 1);
  cart = addToCart(cart, 'cream', 1);
  cart = addToCart(cart, 'eye-balm', 1);

  const order = buildOrderConfirmation(cart, 'Elena Vance', 'elena@example.com', {
    shippingAddress: '12 Rue Saint-Honoré, Paris',
    currency: 'EUR',
    giftWrap: false,
    paymentMode: 'test',
  });

  assert.match(order.orderNumber, /^SF-TEST-\d{4}$/);
  assert.equal(order.paymentMode, 'test');
  assert.equal(order.items.length, 3);
  assert.equal(order.pricing.bundleDiscountEligible, true);
  assert.equal(order.estimatedDelivery, CURRENCY_CONFIG.EUR.shippingDays);
});

test('dosage-based refill lifespan calculator returns realistic doses and replenishment date', () => {
  const ref = new Date('2026-01-01T00:00:00Z');
  const est = calculateRefillSchedule(50, 0.5, 2, ref);

  assert.equal(est.totalDoses, 100);
  assert.equal(est.estimatedDays, 50);
  assert.equal(est.replenishmentDateIso, '2026-02-20');
});

test('all 7 languages and 6 currencies are completely populated', () => {
  assert.equal(LANGUAGE_OPTIONS.length, 7);
  for (const lang of LANGUAGE_OPTIONS) {
    const dict = TRANSLATIONS[lang.code];
    assert.ok(dict.heroTitle.length > 0);
    assert.ok(dict.conciergeDisclaimer.length > 0);
    assert.ok(dict.checkoutTestNotice.length > 0);
  }
  assert.equal(formatCurrencyAmount(100, 'USD'), '$100');
  assert.equal(formatCurrencyAmount(100, 'EUR'), '€92');
});
