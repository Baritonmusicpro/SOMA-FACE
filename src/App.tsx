import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ProductId,
  getProductById,
  getProductBySlug,
} from './data/products';
import { SceneIndex } from './motion/stageMath';
import {
  LocalePreferences,
  TRANSLATIONS,
} from './i18n/translations';
import {
  CartItem,
  OrderRecord,
  addToCart,
  getCartCount,
  removeFromCart,
  updateCartQuantity,
} from './store/cartLogic';
import { AppRoute, NavigationBar } from './components/NavigationBar';
import { SceneIndicator } from './components/SceneIndicator';
import { CampaignStage } from './components/CampaignStage';
import { CollectionStore, WeatherSnapshot } from './components/CollectionStore';
import { ProductDetailPage } from './components/ProductDetailPage';
import { ShoppingBagDrawer } from './components/ShoppingBagDrawer';
import { LocalePreferencesModal } from './components/LocalePreferencesModal';
import { QuickSearchModal } from './components/QuickSearchModal';
import { AiConciergeDrawer } from './components/AiConciergeDrawer';
import { RitualBuilderView } from './components/RitualBuilderView';
import { AccountOrdersView } from './components/AccountOrdersView';
import { AboutOverlay } from './components/AboutOverlay';
import type { SomaLabTab } from './components/SomaLabView';

const ThreeProductStudio = lazy(() =>
  import('./components/ThreeProductStudio').then((m) => ({ default: m.ThreeProductStudio }))
);
const SomaLabView = lazy(() =>
  import('./components/SomaLabView').then((m) => ({ default: m.SomaLabView }))
);

const CART_STORAGE_KEY = 'soma_face_bag_v2';
const PREFS_STORAGE_KEY = 'soma_face_prefs_v2';
const FAVS_STORAGE_KEY = 'soma_face_favs_v2';
const ORDERS_STORAGE_KEY = 'soma_face_orders_v2';

const DEFAULT_PREFS: LocalePreferences = {
  language: 'en',
  currency: 'USD',
  volumeSystem: 'metric',
  theme: 'daylight',
};

function parseRouteFromLocation(): {
  route: AppRoute;
  productSlug: string | null;
  scene: SceneIndex;
  skipIntro: boolean;
} {
  if (typeof window === 'undefined') {
    return { route: 'campaign', productSlug: null, scene: 0, skipIntro: false };
  }

  const params = new URLSearchParams(window.location.search);
  const rawScene = Number(params.get('scene'));
  const scene: SceneIndex =
    Number.isInteger(rawScene) && rawScene >= 1 && rawScene <= 4
      ? ((rawScene - 1) as SceneIndex)
      : 0;
  const skipIntro = params.has('scene') || params.get('skipIntro') === '1';

  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  const queryRoute = params.get('route');

  if (path.startsWith('/product/')) {
    const slug = decodeURIComponent(path.slice('/product/'.length));
    return { route: 'product', productSlug: slug, scene, skipIntro };
  }

  const routeMap: Record<string, AppRoute> = {
    '/': 'campaign',
    '/collection': 'collection',
    '/soma-lab': 'soma-lab',
    '/ritual-builder': 'ritual-builder',
    '/skin-journal': 'skin-journal',
    '/ingredients-decoder': 'ingredients-decoder',
    '/studio': 'studio',
    '/checkout': 'checkout',
    '/account': 'account',
    '/about': 'about',
  };

  if (queryRoute && Object.values(routeMap).includes(queryRoute as AppRoute)) {
    return { route: queryRoute as AppRoute, productSlug: null, scene, skipIntro };
  }

  return {
    route: routeMap[path] ?? 'campaign',
    productSlug: null,
    scene,
    skipIntro,
  };
}

function routeToPath(route: AppRoute, productSlug?: string | null): string {
  switch (route) {
    case 'campaign':
      return '/';
    case 'collection':
      return '/collection';
    case 'product':
      return `/product/${productSlug ?? 'restorative-overnight-cream'}`;
    case 'soma-lab':
      return '/soma-lab';
    case 'ritual-builder':
      return '/ritual-builder';
    case 'skin-journal':
      return '/skin-journal';
    case 'ingredients-decoder':
      return '/ingredients-decoder';
    case 'studio':
      return '/studio';
    case 'checkout':
      return '/checkout';
    case 'account':
      return '/account';
    case 'about':
      return '/about';
  }
}

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function App() {
  const initialLoc = useMemo(() => parseRouteFromLocation(), []);

  const [activeRoute, setActiveRoute] = useState<AppRoute>(initialLoc.route);
  const [activeScene, setActiveScene] = useState<SceneIndex>(initialLoc.scene);
  const [selectedProductSlug, setSelectedProductSlug] = useState<string>(
    initialLoc.productSlug ?? 'restorative-overnight-cream'
  );
  const [studioProductId, setStudioProductId] = useState<ProductId>('cream');
  const [studioEngraving, setStudioEngraving] = useState<string>('');

  // Campaign modal inspection (keeps user immersed on the 4-scene stage)
  const [campaignModalProductId, setCampaignModalProductId] = useState<ProductId | null>(null);

  // Global overlays & drawers
  const [bagOpen, setBagOpen] = useState(false);
  const [conciergeOpen, setConciergeOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [localeModalOpen, setLocaleModalOpen] = useState(false);

  // Persisted client state
  const [cart, setCart] = useState<CartItem[]>(() => loadJson(CART_STORAGE_KEY, []));
  const [prefs, setPrefs] = useState<LocalePreferences>(() =>
    loadJson(PREFS_STORAGE_KEY, DEFAULT_PREFS)
  );
  const [favorites, setFavorites] = useState<ProductId[]>(() => loadJson(FAVS_STORAGE_KEY, []));
  const [orders, setOrders] = useState<OrderRecord[]>(() => loadJson(ORDERS_STORAGE_KEY, []));

  // Live Open-Meteo Weather state
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherFetchedOnce, setWeatherFetchedOnce] = useState(false);

  const t = TRANSLATIONS[prefs.language] ?? TRANSLATIONS.en;

  // Persist local preferences, cart, favorites, orders
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // ignore
    }
    document.documentElement.classList.toggle('dark', prefs.theme === 'nocturne');
    document.documentElement.lang = prefs.language;
  }, [prefs]);

  useEffect(() => {
    try {
      localStorage.setItem(FAVS_STORAGE_KEY, JSON.stringify(favorites));
    } catch {
      // ignore
    }
  }, [favorites]);

  useEffect(() => {
    try {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    } catch {
      // ignore
    }
  }, [orders]);

  // Browser back/forward navigation sync
  useEffect(() => {
    const onPopState = () => {
      const next = parseRouteFromLocation();
      setActiveRoute(next.route);
      if (next.productSlug) setSelectedProductSlug(next.productSlug);
      if (next.route === 'campaign') setActiveScene(next.scene);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Lock body scroll only on full-screen campaign & 3D studio views
  useEffect(() => {
    const lockScroll = activeRoute === 'campaign' || activeRoute === 'studio';
    document.body.style.overflow = lockScroll ? 'hidden' : 'auto';
    if (!lockScroll) window.scrollTo({ top: 0, behavior: 'instant' });
    return () => {
      document.body.style.overflow = '';
    };
  }, [activeRoute]);

  const navigate = useCallback((route: AppRoute, productSlug?: string) => {
    setActiveRoute(route);
    if (productSlug) setSelectedProductSlug(productSlug);
    const nextPath = routeToPath(route, productSlug);
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
  }, []);

  // Weather fetcher (Open-Meteo via Express /api/weather)
  const fetchWeather = useCallback(async (city: string, lat: number, lon: number) => {
    setWeatherLoading(true);
    try {
      const qs = new URLSearchParams({
        lat: String(lat),
        lon: String(lon),
        city,
      });
      const res = await fetch(`/api/weather?${qs.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setWeather({
          ...data,
          city: data.city || city,
          humidityPct: Number.isFinite(data.humidityPct)
            ? data.humidityPct
            : Number.isFinite(data.humidity)
            ? data.humidity
            : 50,
        });
      }
    } catch {
      // keep existing weather snapshot silently
    } finally {
      setWeatherLoading(false);
      setWeatherFetchedOnce(true);
    }
  }, []);

  useEffect(() => {
    if (
      !weatherFetchedOnce &&
      (activeRoute === 'collection' ||
        activeRoute === 'soma-lab' ||
        conciergeOpen)
    ) {
      fetchWeather('Istanbul', 41.0082, 28.9784);
    }
  }, [activeRoute, conciergeOpen, weatherFetchedOnce, fetchWeather]);

  const handleRequestGeolocationWeather = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        fetchWeather('Current Location', pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        // User declined geolocation — keep current city cleanly
      }
    );
  }, [fetchWeather]);

  // Cart & Favorites handlers
  const handleAddToBag = useCallback(
    (
      productId: ProductId,
      options?: {
        isRefill?: boolean;
        isSubscription?: boolean;
        subscriptionIntervalDays?: 30 | 45 | 60;
        engravingText?: string;
      }
    ) => {
      setCart((prev) => addToCart(prev, productId, 1, options));
    },
    []
  );

  const handleAddMultipleToBag = useCallback((ids: readonly ProductId[]) => {
    setCart((prev) => {
      let next = prev;
      ids.forEach((id) => {
        next = addToCart(next, id, 1);
      });
      return next;
    });
    setBagOpen(true);
  }, []);

  const handleToggleFavorite = useCallback((id: ProductId) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const handleOpenProductPage = useCallback(
    (id: ProductId) => {
      const p = getProductById(id);
      navigate('product', p.slug);
    },
    [navigate]
  );

  const handleInspect3D = useCallback(
    (id: ProductId, engraving = '') => {
      setStudioProductId(id);
      setStudioEngraving(engraving);
      setCampaignModalProductId(null);
      navigate('studio');
    },
    [navigate]
  );

  const handleGoHome = useCallback(() => {
    setActiveScene(0);
    navigate('campaign');
  }, [navigate]);

  const handleGoRitualScene = useCallback(() => {
    setActiveScene(2);
    navigate('campaign');
  }, [navigate]);

  const handleExploreFromHero = useCallback(() => {
    setActiveScene(1);
  }, []);

  const handleToggleTheme = useCallback(() => {
    setPrefs((prev) => ({
      ...prev,
      theme: prev.theme === 'nocturne' ? 'daylight' : 'nocturne',
    }));
  }, []);

  const anyOverlayOpen =
    bagOpen ||
    conciergeOpen ||
    searchOpen ||
    localeModalOpen ||
    campaignModalProductId !== null;
  const campaignInputActive = activeRoute === 'campaign' && !anyOverlayOpen;
  const cartCount = getCartCount(cart);

  const currentPageProduct = useMemo(
    () => getProductBySlug(selectedProductSlug) ?? getProductById('cream'),
    [selectedProductSlug]
  );

  const somaLabInitialTab: SomaLabTab =
    activeRoute === 'skin-journal'
      ? 'journal'
      : activeRoute === 'ingredients-decoder'
      ? 'inci'
      : 'analysis';

  return (
    <div className="min-h-screen w-full bg-[#F6F3EE] dark:bg-[#111110] text-[#1C1B19] dark:text-[#F2ECE1]">
      {/* Fixed Global Luxury Navigation */}
      <NavigationBar
        activeRoute={activeRoute}
        activeScene={activeScene}
        cartCount={cartCount}
        prefs={prefs}
        t={t}
        onNavigate={(route) => {
          if (route === 'campaign') handleGoHome();
          else navigate(route);
        }}
        onGoRitualScene={handleGoRitualScene}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenConcierge={() => setConciergeOpen(true)}
        onOpenLocaleModal={() => setLocaleModalOpen(true)}
        onToggleTheme={handleToggleTheme}
        onOpenBag={() => setBagOpen(true)}
      />

      {/* ROUTE 1: 4-Scene Cinematic Campaign Stage (/) */}
      {activeRoute === 'campaign' && (
        <>
          <CampaignStage
            activeScene={activeScene}
            onSceneChange={setActiveScene}
            onExploreCollection={handleExploreFromHero}
            onShopCollection={() => navigate('collection')}
            onInspectProduct={(id) => setCampaignModalProductId(id)}
            onOpenRitualBuilder={() => navigate('ritual-builder')}
            isActiveView={campaignInputActive}
            skipIntro={initialLoc.skipIntro}
            t={t}
          />
          <SceneIndicator activeScene={activeScene} onSelectScene={setActiveScene} />
        </>
      )}

      {/* ROUTE 2: Complete 12-Product Luxury Storefront (/collection) */}
      {activeRoute === 'collection' && (
        <CollectionStore
          prefs={prefs}
          t={t}
          favorites={favorites}
          weather={weather}
          weatherLoading={weatherLoading}
          onSelectWeatherCity={fetchWeather}
          onRequestGeolocationWeather={handleRequestGeolocationWeather}
          onToggleFavorite={handleToggleFavorite}
          onBackToCampaign={handleGoHome}
          onSelectProduct={handleOpenProductPage}
          onInspect3D={(id) => handleInspect3D(id)}
          onOpenRitualBuilder={() => navigate('ritual-builder')}
          onOpenSomaLab={() => navigate('soma-lab')}
          onAddToBag={(id) => handleAddToBag(id)}
        />
      )}

      {/* ROUTE 3: Dedicated Product Detail Page (/product/:slug) */}
      {activeRoute === 'product' && (
        <ProductDetailPage
          product={currentPageProduct}
          mode="page"
          prefs={prefs}
          t={t}
          isFavorite={favorites.includes(currentPageProduct.id)}
          onToggleFavorite={handleToggleFavorite}
          onCloseOrBack={() => navigate('collection')}
          onSelectRelated={handleOpenProductPage}
          onInspect3D={handleInspect3D}
          onAddToBag={(id, opts) => {
            handleAddToBag(id, opts);
            setBagOpen(true);
          }}
        />
      )}

      {/* ROUTE 4, 5, 6: SOMA LAB / Skin Journal / INCI Decoder (Lazy-loaded) */}
      {(activeRoute === 'soma-lab' ||
        activeRoute === 'skin-journal' ||
        activeRoute === 'ingredients-decoder') && (
        <Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center bg-[#F6F3EE] dark:bg-[#111110] text-[12px] tracking-[0.2em] uppercase opacity-70">
              Loading SOMA LAB…
            </div>
          }
        >
          <SomaLabView
            initialTab={somaLabInitialTab}
            prefs={prefs}
            t={t}
            weather={weather}
            onSelectProduct={handleOpenProductPage}
            onInspect3D={(id) => handleInspect3D(id)}
            onAddToBag={(id) => {
              handleAddToBag(id);
              setBagOpen(true);
            }}
            onAddRoutineToBag={handleAddMultipleToBag}
            onTabRouteChange={(tab) => {
              if (tab === 'journal') navigate('skin-journal');
              else if (tab === 'inci') navigate('ingredients-decoder');
              else navigate('soma-lab');
            }}
          />
        </Suspense>
      )}

      {/* ROUTE 7: Travertine Ritual Builder & Refill Studio (/ritual-builder) */}
      {activeRoute === 'ritual-builder' && (
        <RitualBuilderView
          prefs={prefs}
          t={t}
          onInspect3D={(id) => handleInspect3D(id)}
          onAddRitualToBag={(ids) => handleAddMultipleToBag(ids)}
          onAddRefillToBag={(id, isSub, interval) => {
            handleAddToBag(id, {
              isRefill: true,
              isSubscription: isSub,
              subscriptionIntervalDays: isSub ? interval : undefined,
            });
            setBagOpen(true);
          }}
        />
      )}

      {/* ROUTE 8: Dedicated Full-Screen Three.js 3D Vessel Studio (/studio, Lazy-loaded) */}
      {activeRoute === 'studio' && (
        <Suspense
          fallback={
            <div className="h-screen w-screen flex items-center justify-center bg-[#131210] text-[#CFAF70] text-[12px] tracking-[0.22em] uppercase">
              Initializing 3D Atelier…
            </div>
          }
        >
          <ThreeProductStudio
            initialProductId={studioProductId}
            initialEngraving={studioEngraving}
            prefs={prefs}
            t={t}
            onBack={() => navigate('collection')}
            onAddToBag={(id, opts) => {
              handleAddToBag(id, opts);
              setBagOpen(true);
            }}
          />
        </Suspense>
      )}

      {/* ROUTE 9: Standalone Test-Mode Checkout (/checkout) */}
      {activeRoute === 'checkout' && (
        <ShoppingBagDrawer
          isOpen
          standalonePage
          items={cart}
          prefs={prefs}
          t={t}
          onClose={() => navigate('collection')}
          onUpdateQuantity={(lineId, qty) => setCart((prev) => updateCartQuantity(prev, lineId, qty))}
          onRemoveItem={(lineId) => setCart((prev) => removeFromCart(prev, lineId))}
          onClearCart={() => setCart([])}
          onOrderConfirmed={(order) => setOrders((prev) => [order, ...prev])}
          onBrowseCollection={() => navigate('collection')}
        />
      )}

      {/* ROUTE 10: Atelier Profile, Order History & Favorites (/account) */}
      {activeRoute === 'account' && (
        <AccountOrdersView
          orders={orders}
          favorites={favorites}
          prefs={prefs}
          t={t}
          onSelectProduct={handleOpenProductPage}
          onAddToBag={(id) => {
            handleAddToBag(id);
            setBagOpen(true);
          }}
          onOpenCollection={() => navigate('collection')}
          onOpenSkinJournal={() => navigate('skin-journal')}
        />
      )}

      {/* ROUTE 11: Maison Philosophy (/about) */}
      {activeRoute === 'about' && (
        <AboutOverlay
          onBack={handleGoHome}
          onShopCollection={() => navigate('collection')}
          onOpenStudio={() => handleInspect3D('cream')}
          onOpenSomaLab={() => navigate('soma-lab')}
        />
      )}

      {/* Campaign Quick-Inspection Product Modal (when clicking a hero product in Scenes 1-4) */}
      {campaignModalProductId && (
        <ProductDetailPage
          product={getProductById(campaignModalProductId)}
          mode="modal"
          prefs={prefs}
          t={t}
          isFavorite={favorites.includes(campaignModalProductId)}
          onToggleFavorite={handleToggleFavorite}
          onCloseOrBack={() => setCampaignModalProductId(null)}
          onSelectRelated={(id) => setCampaignModalProductId(id)}
          onInspect3D={handleInspect3D}
          onAddToBag={(id, opts) => {
            handleAddToBag(id, opts);
            setCampaignModalProductId(null);
            setBagOpen(true);
          }}
        />
      )}

      {/* Global Slide-Over Shopping Bag Drawer */}
      <ShoppingBagDrawer
        isOpen={bagOpen && activeRoute !== 'checkout'}
        items={cart}
        prefs={prefs}
        t={t}
        onClose={() => setBagOpen(false)}
        onUpdateQuantity={(lineId, qty) => setCart((prev) => updateCartQuantity(prev, lineId, qty))}
        onRemoveItem={(lineId) => setCart((prev) => removeFromCart(prev, lineId))}
        onClearCart={() => setCart([])}
        onOrderConfirmed={(order) => setOrders((prev) => [order, ...prev])}
        onBrowseCollection={() => navigate('collection')}
      />

      {/* Global Slide-Over Multilingual AI Skin Concierge Drawer */}
      <AiConciergeDrawer
        isOpen={conciergeOpen}
        prefs={prefs}
        t={t}
        weather={weather}
        onClose={() => setConciergeOpen(false)}
        onSelectProduct={handleOpenProductPage}
        onInspect3D={(id) => handleInspect3D(id)}
        onOpenRitualBuilder={() => navigate('ritual-builder')}
        onAddToBag={(id) => {
          handleAddToBag(id);
          setConciergeOpen(true);
        }}
      />

      {/* Global Instant Collection Search Modal */}
      <QuickSearchModal
        isOpen={searchOpen}
        prefs={prefs}
        t={t}
        onClose={() => setSearchOpen(false)}
        onSelectProduct={handleOpenProductPage}
        onInspect3D={(id) => handleInspect3D(id)}
        onAddToBag={(id) => {
          handleAddToBag(id);
          setBagOpen(true);
        }}
      />

      {/* Global Language, Currency, Volume Units & Atmosphere Preferences Modal */}
      <LocalePreferencesModal
        isOpen={localeModalOpen}
        prefs={prefs}
        onUpdate={setPrefs}
        onClose={() => setLocaleModalOpen(false)}
      />
    </div>
  );
}
