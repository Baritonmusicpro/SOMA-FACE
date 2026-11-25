import { ArrowLeft, Box, Sparkles } from 'lucide-react';
import { SOMA_ASSETS } from '../data/products';

interface AboutOverlayProps {
  onBack: () => void;
  onShopCollection: () => void;
  onOpenStudio: () => void;
  onOpenSomaLab: () => void;
}

export function AboutOverlay({
  onBack,
  onShopCollection,
  onOpenStudio,
  onOpenSomaLab,
}: AboutOverlayProps) {
  return (
    <main className="min-h-screen bg-[#F6F3EE] dark:bg-[#111110] text-[#1C1B19] dark:text-[#F2ECE1] pt-24 md:pt-28 pb-24 px-5 md:px-12">
      <div className="mx-auto max-w-[1140px] space-y-12">
        <div className="border-b border-[#1C1B19]/12 dark:border-[#F2ECE1]/12 pb-6">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.18em] uppercase text-[#8E7760] dark:text-[#CFAF70] hover:text-[#1C1B19] dark:hover:text-[#F2ECE1] cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Return to Campaign
          </button>
          <p className="mt-4 text-[10.5px] font-medium tracking-[0.28em] uppercase text-[#8E7760] dark:text-[#CFAF70]">
            MAISON SOMA FACE &middot; DECODE &bull; BALANCE &bull; BEAUTY
          </p>
          <h1 className="mt-2 font-display text-4xl md:text-6xl font-light leading-[1.04]">
            Quiet Architecture for Daily Skin Care.
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5">
            <div className="overflow-hidden border border-[#1C1B19]/12 dark:border-[#F2ECE1]/12">
              <img
                src={SOMA_ASSETS.macros.dailyRitual}
                alt="Natural travertine stone and linen ritual study"
                referrerPolicy="no-referrer"
                className="w-full aspect-[4/5] object-cover"
              />
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6 text-[15px] font-light leading-relaxed opacity-88">
            <p>
              SOMA FACE approaches skincare as an unhurried architectural ritual. Across our twelve
              vessels—spanning the <strong>Botanical &amp; Natural Series</strong>,{' '}
              <strong>Minimalist Daily Series</strong>, and{' '}
              <strong>Signature &amp; Night Repair Series</strong>—every bottle and jar is sculpted
              from weighted frosted glass finished with brushed champagne-gold collars and either
              hand-finished dark walnut or matte obsidian caps.
            </p>
            <p>
              We believe quiet luxury demands absolute transparency. Rather than publishing
              unverified clinical promises or fabricated sustainability metrics, official verified
              INCI formulations are provided directly on each physical carton, refill lifespans are
              computed honestly from dosage math, and our SOMA LAB AI tools explicitly distinguish
              cosmetic guidance from medical dermatology.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[#1C1B19]/12 dark:border-[#F2ECE1]/12">
              <div>
                <p className="text-[10px] tracking-[0.2em] uppercase text-[#8E7760] dark:text-[#CFAF70]">
                  01 · Decode
                </p>
                <p className="mt-1 text-[13px] opacity-80">
                  Honest INCI reading, climate-adaptive layering, and undertone-aware cosmetic
                  observation.
                </p>
              </div>
              <div>
                <p className="text-[10px] tracking-[0.2em] uppercase text-[#8E7760] dark:text-[#CFAF70]">
                  02 · Balance
                </p>
                <p className="mt-1 text-[13px] opacity-80">
                  Twelve tactile textures crafted to layer cleanly without excess weight or clutter.
                </p>
              </div>
              <div>
                <p className="text-[10px] tracking-[0.2em] uppercase text-[#8E7760] dark:text-[#CFAF70]">
                  03 · Beauty
                </p>
                <p className="mt-1 text-[13px] opacity-80">
                  Refillable frosted glass architecture designed to live permanently in natural
                  light.
                </p>
              </div>
            </div>

            <div className="pt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onShopCollection}
                className="border border-[#1C1B19] bg-[#1C1B19] dark:border-[#CFAF70] dark:bg-[#CFAF70] dark:text-[#111110] px-6 py-3 text-[11px] font-medium tracking-[0.18em] uppercase text-[#F6F3EE] cursor-pointer"
              >
                Explore All 12 Vessels
              </button>
              <button
                type="button"
                onClick={onOpenStudio}
                className="inline-flex items-center gap-2 border border-[#1C1B19]/25 dark:border-[#F2ECE1]/25 px-5 py-3 text-[11px] font-medium tracking-[0.16em] uppercase hover:border-[#B6975C] cursor-pointer"
              >
                <Box className="h-3.5 w-3.5" />
                Enter 3D Studio
              </button>
              <button
                type="button"
                onClick={onOpenSomaLab}
                className="inline-flex items-center gap-2 border border-[#1C1B19]/25 dark:border-[#F2ECE1]/25 px-5 py-3 text-[11px] font-medium tracking-[0.16em] uppercase hover:border-[#B6975C] cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Visit SOMA LAB
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
