import { useState } from 'react';
import {
  Globe,
  Menu,
  Moon,
  Search,
  ShoppingBag,
  Sparkles,
  Sun,
  User,
  X,
} from 'lucide-react';
import { SceneIndex } from '../motion/stageMath';
import { LocalePreferences, UiDictionary } from '../i18n/translations';

export type AppRoute =
  | 'campaign'
  | 'collection'
  | 'product'
  | 'soma-lab'
  | 'ritual-builder'
  | 'skin-journal'
  | 'ingredients-decoder'
  | 'studio'
  | 'checkout'
  | 'account'
  | 'about';

interface NavigationBarProps {
  activeRoute: AppRoute;
  activeScene: SceneIndex;
  cartCount: number;
  prefs: LocalePreferences;
  t: UiDictionary;
  onNavigate: (route: AppRoute) => void;
  onGoRitualScene: () => void;
  onOpenSearch: () => void;
  onOpenConcierge: () => void;
  onOpenLocaleModal: () => void;
  onToggleTheme: () => void;
  onOpenBag: () => void;
}

export function NavigationBar({
  activeRoute,
  activeScene,
  cartCount,
  prefs,
  t,
  onNavigate,
  onGoRitualScene,
  onOpenSearch,
  onOpenConcierge,
  onOpenLocaleModal,
  onToggleTheme,
  onOpenBag,
}: NavigationBarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isNocturne = prefs.theme === 'nocturne';
  const isStudioRoute = activeRoute === 'studio';
  const isCampaignDarkScene =
    activeRoute === 'campaign' && (activeScene === 2 || activeScene === 3);

  const isLightText = isCampaignDarkScene || isStudioRoute || (activeRoute !== 'campaign' && isNocturne);

  const headerSurface =
    activeRoute === 'campaign'
      ? 'bg-transparent'
      : isStudioRoute
      ? 'bg-[#111110]/94 border-b border-[#CFAF70]/16'
      : isNocturne
      ? 'bg-[#111110]/96 border-b border-[#CFAF70]/16'
      : 'bg-[#F6F3EE]/97 border-b border-[#1C1B19]/10';

  const textColor = isLightText ? 'text-[#F2ECE1]' : 'text-[#1C1B19]';
  const mutedColor = isLightText
    ? 'text-[#F2ECE1]/78 hover:text-[#F2ECE1]'
    : 'text-[#1C1B19]/75 hover:text-[#1C1B19]';
  const underlineColor = isLightText ? 'bg-[#CFAF70]' : 'bg-[#1C1B19]';
  const utilityBtnBorder = isLightText
    ? 'border-[#F2ECE1]/20 text-[#F2ECE1]/85 hover:border-[#CFAF70] hover:text-[#F2ECE1]'
    : 'border-[#1C1B19]/18 text-[#1C1B19]/82 hover:border-[#1C1B19] hover:text-[#1C1B19]';

  const handleMobileAction = (fn: () => void) => {
    setMobileMenuOpen(false);
    fn();
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-colors duration-500 ease-out ${headerSurface}`}
      >
        <div className="mx-auto flex h-14 md:h-[74px] max-w-[1480px] items-center justify-between gap-4 px-4 md:px-10">
          {/* Left: Brand Wordmark */}
          <button
            type="button"
            onClick={() => onNavigate('campaign')}
            className={`font-display text-[19px] md:text-[23px] font-medium tracking-[0.26em] uppercase whitespace-nowrap shrink-0 transition-colors duration-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#B6975C] cursor-pointer ${textColor}`}
            aria-label="SOMA FACE Home"
          >
            SOMA FACE
          </button>

          {/* Center: Clean 5-Link Editorial Navigation */}
          <nav
            aria-label="Primary navigation"
            className="hidden lg:flex items-center gap-7 xl:gap-9 text-[11.5px] font-normal tracking-[0.15em] uppercase"
          >
            <button
              type="button"
              onClick={() => onNavigate('campaign')}
              className={`group relative py-1 whitespace-nowrap shrink-0 transition-colors duration-300 cursor-pointer ${mutedColor}`}
            >
              {t.navHome}
              <span
                className={`absolute bottom-0 left-0 h-px transition-all duration-300 ${underlineColor} ${
                  activeRoute === 'campaign' && activeScene === 0
                    ? 'w-full opacity-95'
                    : 'w-0 group-hover:w-full opacity-60'
                }`}
              />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('collection')}
              className={`group relative py-1 whitespace-nowrap shrink-0 transition-colors duration-300 cursor-pointer ${mutedColor}`}
            >
              {t.navCollection}
              <span
                className={`absolute bottom-0 left-0 h-px transition-all duration-300 ${underlineColor} ${
                  activeRoute === 'collection' || activeRoute === 'product'
                    ? 'w-full opacity-95'
                    : 'w-0 group-hover:w-full opacity-60'
                }`}
              />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('soma-lab')}
              className={`group relative py-1 whitespace-nowrap shrink-0 transition-colors duration-300 cursor-pointer ${mutedColor}`}
            >
              {t.navSomaLab}
              <span
                className={`absolute bottom-0 left-0 h-px transition-all duration-300 ${underlineColor} ${
                  activeRoute === 'soma-lab' ||
                  activeRoute === 'skin-journal' ||
                  activeRoute === 'ingredients-decoder'
                    ? 'w-full opacity-95'
                    : 'w-0 group-hover:w-full opacity-60'
                }`}
              />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('ritual-builder')}
              className={`group relative py-1 whitespace-nowrap shrink-0 transition-colors duration-300 cursor-pointer ${mutedColor}`}
            >
              {t.navRitual}
              <span
                className={`absolute bottom-0 left-0 h-px transition-all duration-300 ${underlineColor} ${
                  activeRoute === 'ritual-builder' ||
                  (activeRoute === 'campaign' && activeScene === 2)
                    ? 'w-full opacity-95'
                    : 'w-0 group-hover:w-full opacity-60'
                }`}
              />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('about')}
              className={`group relative py-1 whitespace-nowrap shrink-0 transition-colors duration-300 cursor-pointer ${mutedColor}`}
            >
              {t.navAbout}
              <span
                className={`absolute bottom-0 left-0 h-px transition-all duration-300 ${underlineColor} ${
                  activeRoute === 'about' ? 'w-full opacity-95' : 'w-0 group-hover:w-full opacity-60'
                }`}
              />
            </button>
          </nav>

          {/* Right: Compact Luxury Utility Controls */}
          <div className="flex items-center gap-1.5 md:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onOpenSearch}
              aria-label={t.navSearch}
              title={t.navSearch}
              className={`inline-flex h-9 w-9 items-center justify-center transition-colors duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#B6975C] ${mutedColor}`}
            >
              <Search className="h-[16px] w-[16px] stroke-[1.5]" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={onOpenConcierge}
              aria-label={t.navConcierge}
              data-testid="nav-concierge-btn"
              className={`hidden sm:inline-flex items-center gap-1.5 border px-3 py-1.5 text-[10.5px] font-medium tracking-[0.14em] uppercase whitespace-nowrap transition-colors duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#B6975C] ${utilityBtnBorder}`}
            >
              <Sparkles className="h-3.5 w-3.5 stroke-[1.5]" aria-hidden="true" />
              <span>{t.navConcierge}</span>
            </button>

            <button
              type="button"
              onClick={onOpenLocaleModal}
              aria-label="Language and currency preferences"
              data-testid="nav-locale-btn"
              className={`hidden md:inline-flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-medium tracking-[0.12em] uppercase whitespace-nowrap transition-colors duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#B6975C] ${mutedColor}`}
            >
              <Globe className="h-3.5 w-3.5 stroke-[1.5]" aria-hidden="true" />
              <span>
                {prefs.language.toUpperCase()} · {prefs.currency}
              </span>
            </button>

            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={isNocturne ? 'Switch to Daylight mode' : 'Switch to Nocturne mode'}
              title={isNocturne ? 'Daylight Mode' : 'Nocturne Mode'}
              data-testid="nav-theme-btn"
              className={`hidden sm:inline-flex h-9 w-9 items-center justify-center transition-colors duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#B6975C] ${mutedColor}`}
            >
              {isNocturne ? (
                <Sun className="h-[16px] w-[16px] stroke-[1.5]" aria-hidden="true" />
              ) : (
                <Moon className="h-[16px] w-[16px] stroke-[1.5]" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              onClick={() => onNavigate('account')}
              aria-label={t.accountTitle}
              title={t.accountTitle}
              className={`hidden xl:inline-flex h-9 w-9 items-center justify-center transition-colors duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#B6975C] ${mutedColor}`}
            >
              <User className="h-[16px] w-[16px] stroke-[1.5]" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={onOpenBag}
              aria-label={`${t.navBag} (${cartCount})`}
              data-testid="nav-bag-btn"
              className={`inline-flex items-center gap-1.5 py-2 px-1.5 text-[11.5px] font-medium tracking-[0.12em] uppercase whitespace-nowrap shrink-0 transition-colors duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#B6975C] ${textColor}`}
            >
              <ShoppingBag className="h-[16px] w-[16px] stroke-[1.5]" aria-hidden="true" />
              <span className="hidden md:inline">{t.navBag}</span>
              <span className="tabular-nums text-[11px] opacity-85" data-testid="bag-count">
                ({cartCount})
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              className={`lg:hidden inline-flex h-9 w-9 items-center justify-center transition-colors duration-300 cursor-pointer ${textColor}`}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5 stroke-[1.5]" />
              ) : (
                <Menu className="h-5 w-5 stroke-[1.5]" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Sheet (solid surface, zero backdrop-blur) */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden bg-[#111110] text-[#F2ECE1] flex flex-col justify-between px-6 py-5 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation"
        >
          <div className="flex items-center justify-between border-b border-[#F2ECE1]/12 pb-4">
            <span className="font-display text-lg tracking-[0.26em] uppercase">SOMA FACE</span>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close navigation menu"
              className="inline-flex h-10 w-10 items-center justify-center text-[#F2ECE1]"
            >
              <X className="h-5 w-5 stroke-[1.5]" />
            </button>
          </div>

          <nav className="flex flex-col gap-3.5 py-6">
            <button
              type="button"
              onClick={() => handleMobileAction(() => onNavigate('campaign'))}
              className="text-left font-display text-3xl font-light tracking-wide text-[#F2ECE1] hover:text-[#CFAF70]"
            >
              {t.navHome}
            </button>
            <button
              type="button"
              onClick={() => handleMobileAction(() => onNavigate('collection'))}
              className="text-left font-display text-3xl font-light tracking-wide text-[#F2ECE1] hover:text-[#CFAF70]"
            >
              {t.navCollection}
            </button>
            <button
              type="button"
              onClick={() => handleMobileAction(() => onNavigate('soma-lab'))}
              className="text-left font-display text-3xl font-light tracking-wide text-[#F2ECE1] hover:text-[#CFAF70]"
            >
              {t.navSomaLab}
            </button>
            <button
              type="button"
              onClick={() => handleMobileAction(() => onNavigate('ritual-builder'))}
              className="text-left font-display text-3xl font-light tracking-wide text-[#F2ECE1] hover:text-[#CFAF70]"
            >
              {t.navRitual}
            </button>
            <button
              type="button"
              onClick={() => handleMobileAction(() => onNavigate('studio'))}
              className="text-left font-display text-3xl font-light tracking-wide text-[#F2ECE1] hover:text-[#CFAF70]"
            >
              {t.navStudio}
            </button>

            <div className="mt-2 pt-4 border-t border-[#F2ECE1]/12 grid grid-cols-2 gap-2.5 text-[11px] tracking-[0.14em] uppercase text-[#F2ECE1]/78">
              <button
                type="button"
                onClick={() => handleMobileAction(() => onNavigate('skin-journal'))}
                className="text-left py-2 hover:text-[#CFAF70]"
              >
                {t.skinJournalTitle}
              </button>
              <button
                type="button"
                onClick={() => handleMobileAction(() => onNavigate('ingredients-decoder'))}
                className="text-left py-2 hover:text-[#CFAF70]"
              >
                {t.inciDecoderTitle}
              </button>
              <button
                type="button"
                onClick={() => handleMobileAction(onGoRitualScene)}
                className="text-left py-2 hover:text-[#CFAF70]"
              >
                Scene 3 · Ritual
              </button>
              <button
                type="button"
                onClick={() => handleMobileAction(() => onNavigate('account'))}
                className="text-left py-2 hover:text-[#CFAF70]"
              >
                {t.accountTitle}
              </button>
              <button
                type="button"
                onClick={() => handleMobileAction(() => onNavigate('about'))}
                className="text-left py-2 hover:text-[#CFAF70]"
              >
                {t.navAbout}
              </button>
            </div>
          </nav>

          <div className="border-t border-[#F2ECE1]/12 pt-4 space-y-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleMobileAction(onOpenConcierge)}
                className="flex-1 inline-flex items-center justify-center gap-2 border border-[#CFAF70] py-2.5 text-[11px] tracking-[0.16em] uppercase text-[#F2ECE1]"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {t.navConcierge}
              </button>
              <button
                type="button"
                onClick={() => handleMobileAction(onOpenLocaleModal)}
                className="border border-[#F2ECE1]/25 px-3.5 py-2.5 text-[11px] tracking-[0.14em] uppercase text-[#F2ECE1]"
              >
                {prefs.language.toUpperCase()} · {prefs.currency}
              </button>
              <button
                type="button"
                onClick={onToggleTheme}
                aria-label="Toggle theme"
                className="border border-[#F2ECE1]/25 px-3 py-2.5 text-[#F2ECE1]"
              >
                {isNocturne ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
