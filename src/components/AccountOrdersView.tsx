import { Package, Heart, Sparkles, Truck, CheckCircle2 } from 'lucide-react';
import { ProductId, getProductById } from '../data/products';
import { OrderRecord } from '../store/cartLogic';
import {
  LocalePreferences,
  UiDictionary,
  formatCurrencyAmount,
} from '../i18n/translations';

interface AccountOrdersViewProps {
  orders: OrderRecord[];
  favorites: ProductId[];
  prefs: LocalePreferences;
  t: UiDictionary;
  onSelectProduct: (id: ProductId) => void;
  onAddToBag: (id: ProductId) => void;
  onOpenCollection: () => void;
  onOpenSkinJournal: () => void;
}

export function AccountOrdersView({
  orders,
  favorites,
  prefs,
  t,
  onSelectProduct,
  onAddToBag,
  onOpenCollection,
  onOpenSkinJournal,
}: AccountOrdersViewProps) {
  return (
    <main className="min-h-screen bg-[#F6F3EE] dark:bg-[#111110] text-[#1C1B19] dark:text-[#F2ECE1] pt-24 md:pt-28 pb-24 px-5 md:px-12">
      <div className="mx-auto max-w-[1160px] space-y-12">
        <div className="border-b border-[#1C1B19]/12 dark:border-[#F2ECE1]/12 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-[10.5px] tracking-[0.22em] uppercase text-[#8E7760] dark:text-[#CFAF70]">
              Private Atelier Client Space
            </p>
            <h1 className="mt-2 font-display text-4xl md:text-5xl font-light">{t.accountTitle}</h1>
            <p className="mt-2 text-[13.5px] font-light opacity-75">
              Orders, favorites, and skin journal records are stored locally in your browser session
              for guest privacy.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenSkinJournal}
            className="inline-flex items-center gap-2 border border-[#1C1B19]/25 dark:border-[#CFAF70]/50 px-5 py-2.5 text-[11px] font-medium tracking-[0.16em] uppercase hover:border-[#B6975C] cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Open {t.skinJournalTitle}
          </button>
        </div>

        {/* Order History & Tracking */}
        <section aria-label="Order History">
          <h2 className="font-display text-2xl md:text-3xl font-light flex items-center gap-2.5">
            <Package className="h-5 w-5 text-[#B6975C] stroke-[1.5]" />
            Order History &amp; Tracking ({orders.length})
          </h2>

          {orders.length === 0 ? (
            <div className="mt-5 border border-[#1C1B19]/12 dark:border-[#F2ECE1]/12 p-10 text-center">
              <p className="font-display text-2xl font-light">No atelier orders recorded yet.</p>
              <p className="mt-1.5 text-[13px] font-light opacity-70">
                Complete a test-mode order from the Shopping Bag to inspect server-validated order
                tracking here.
              </p>
              <button
                type="button"
                onClick={onOpenCollection}
                className="mt-5 border border-[#1C1B19] dark:border-[#CFAF70] px-6 py-2.5 text-[11px] tracking-[0.16em] uppercase cursor-pointer"
              >
                {t.heroCta}
              </button>
            </div>
          ) : (
            <div className="mt-5 space-y-5">
              {orders.map((order) => (
                <article
                  key={order.orderNumber}
                  className="border border-[#1C1B19]/14 dark:border-[#F2ECE1]/14 bg-[#EAE3D7]/35 dark:bg-[#1B1A18] p-6 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1C1B19]/10 dark:border-[#F2ECE1]/10 pb-3.5">
                    <div>
                      <p className="text-[11px] font-medium tracking-[0.18em] uppercase text-[#8E7760] dark:text-[#CFAF70]">
                        {order.orderNumber} &middot; {order.paymentMode.toUpperCase()} MODE
                      </p>
                      <p className="mt-0.5 text-[13px] opacity-80">
                        Placed {new Date(order.placedAtIso).toLocaleDateString()} for{' '}
                        {order.customerName}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-[#8E7760] dark:text-[#CFAF70]">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {order.status}
                      </span>
                      <p className="text-[15px] font-medium tabular-nums">
                        {formatCurrencyAmount(order.pricing.totalUsd, prefs.currency)}
                      </p>
                    </div>
                  </div>

                  {/* Tracking Steps */}
                  <div className="grid grid-cols-3 gap-2 text-[11px] tracking-[0.12em] uppercase">
                    <div className="border-t-2 border-[#B6975C] pt-2 font-medium">
                      01 · Validated
                    </div>
                    <div className="border-t-2 border-[#B6975C]/45 pt-2 opacity-75">
                      02 · Atelier Preparation
                    </div>
                    <div className="border-t-2 border-[#1C1B19]/15 dark:border-[#F2ECE1]/15 pt-2 opacity-55 flex items-center gap-1">
                      <Truck className="h-3.5 w-3.5" />
                      {order.estimatedDelivery}
                    </div>
                  </div>

                  <div className="divide-y divide-[#1C1B19]/8 dark:divide-[#F2ECE1]/8">
                    {order.items.map((item, idx) => (
                      <div
                        key={`${order.orderNumber}-${idx}`}
                        className="py-2 flex items-center justify-between text-[13px]"
                      >
                        <span className="font-light">
                          {item.name} {item.isRefill ? '(Refill)' : ''}{' '}
                          {item.engravingText ? `[Engraved: ${item.engravingText}]` : ''} &times;{' '}
                          {item.quantity}
                        </span>
                        <span className="tabular-nums">
                          {formatCurrencyAmount(item.lineTotalUsd, prefs.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Saved Favorites */}
        <section aria-label="Saved Favorites">
          <h2 className="font-display text-2xl md:text-3xl font-light flex items-center gap-2.5">
            <Heart className="h-5 w-5 text-[#B6975C] stroke-[1.5]" />
            Saved Vessels ({favorites.length})
          </h2>
          {favorites.length === 0 ? (
            <p className="mt-3 text-[13.5px] font-light opacity-70">
              Tap the heart icon on any vessel in the Collection to curate your personal shelf.
            </p>
          ) : (
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {favorites.map((id) => {
                const p = getProductById(id);
                return (
                  <div
                    key={id}
                    className="border border-[#1C1B19]/12 dark:border-[#F2ECE1]/12 bg-[#EAE3D7]/35 dark:bg-[#1B1A18] p-4 flex flex-col justify-between gap-3"
                  >
                    <button
                      type="button"
                      onClick={() => onSelectProduct(id)}
                      className="h-36 flex items-end justify-center cursor-pointer"
                    >
                      <img src={p.cutoutImage} alt={p.name} className="max-h-full object-contain" />
                    </button>
                    <div>
                      <h3 className="font-display text-xl">{p.name}</h3>
                      <p className="text-[12.5px] opacity-70 tabular-nums">
                        {formatCurrencyAmount(p.price, prefs.currency)}
                      </p>
                      <button
                        type="button"
                        onClick={() => onAddToBag(id)}
                        className="mt-3 w-full border border-[#1C1B19] dark:border-[#CFAF70] py-2 text-[10.5px] tracking-[0.16em] uppercase cursor-pointer"
                      >
                        {t.addToBag}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
