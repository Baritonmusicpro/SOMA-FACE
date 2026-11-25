export type ProductId =
  | 'botanical-elixir'
  | 'hydrating-balm'
  | 'regenerative-serum'
  | 'botanical-matte-moisturizer'
  | 'hydrating-cream'
  | 'radiant-serum'
  | 'deep-cleanse-oil'
  | 'the-essence-serum'
  | 'the-nourishing-cream'
  | 'serum'
  | 'cream'
  | 'eye-balm';

export type ProductSeries =
  | 'botanical-natural'
  | 'minimalist-daily'
  | 'signature-night-repair';

export type RoutineStepCategory = 'cleanse' | 'treat' | 'seal' | 'eye';

export type VesselStyle =
  | 'walnut-dropper'
  | 'walnut-jar'
  | 'walnut-tall'
  | 'walnut-pump'
  | 'matte-jar'
  | 'matte-tall'
  | 'matte-pump';

export interface SomaProduct {
  id: ProductId;
  slug: string;
  orderLabel: string;
  series: ProductSeries;
  seriesLabel: string;
  stepCategory: RoutineStepCategory;
  brand: string;
  name: string;
  volume: string;
  volumeValue: number;
  volumeUnit: 'ml' | 'g';
  volumeImperial: string;
  price: number; // Base USD reference price (configurable)
  availability: 'in-stock' | 'limited-allocation';
  ritualLine: string;
  ritualStep: string;
  description: string;
  textureNote: string;
  application: string;
  /**
   * Verified formulation metadata.
   * Official INCI disclosures are intentionally left configurable unless explicitly verified
   * on physical SOMA FACE product packaging — never fabricated.
   */
  verifiedInci: string[] | null;
  formulationNote: string;
  compatibleIds: ProductId[];
  refillEligible: boolean;
  refillPriceUsd: number | null;
  dosagePerUse: number; // ml or g per standard application
  personalizationEligible: boolean;
  engravingMaxChars: number;
  vesselStyle: VesselStyle;
  vesselTintHex: string;
  liquidTintHex: string;
  cutoutImage: string;
  packshotImage: string;
  macroImage: string;
  aspectRatio: number; // width / height of trimmed cutout
  shelfHeightRatio: number; // relative visual height in store & ritual stand (0.45..1.0)
  featuredInHero?: boolean;
  optionalModelUrl?: string | null;
}

export interface FormulaMacroItem {
  id: string;
  label: string;
  caption: string;
  detail: string;
  image: string;
}

export const SOMA_ASSETS = {
  heroEnvImage: '/src/assets/images/hero_essence_env_1795597461473.jpg',
  heroEnvVideo: '/src/assets/images/hero_essence_loop.mp4',
  studioEnvImage: '/src/assets/images/studio_collection_env_1795597462573.jpg',
  handBack: '/src/assets/images/ritual_hand_cutout.png',
  handForeground: '/src/assets/images/ritual_hand_fg_cutout.png',
  macros: {
    silkyCream: '/src/assets/images/macro_silky_cream_1795597469606.jpg',
    luminousSerum: '/src/assets/images/macro_luminous_serum_1795597470388.jpg',
    eyeCare: '/src/assets/images/macro_eye_care_1795597472389.jpg',
    refinedFormulation: '/src/assets/images/macro_refined_formulation_1795597472872.jpg',
    dailyRitual: '/src/assets/images/macro_daily_ritual_1795597472753.jpg',
  },
} as const;

const OFFICIAL_INCI_NOTICE =
  'Official verified INCI list is supplied on physical SOMA FACE product packaging and can be configured in the product database. No unverified ingredient claims are displayed.';

export const SOMA_PRODUCTS: readonly SomaProduct[] = [
  // =========================================================================
  // 1. BOTANICAL & NATURAL SERIES (4 Products)
  // =========================================================================
  {
    id: 'botanical-elixir',
    slug: 'botanical-elixir',
    orderLabel: '01',
    series: 'botanical-natural',
    seriesLabel: 'Botanical & Natural Series',
    stepCategory: 'treat',
    brand: 'SOMA FACE',
    name: 'Botanical Elixir',
    volume: '30 ml',
    volumeValue: 30,
    volumeUnit: 'ml',
    volumeImperial: '1.0 fl oz',
    price: 138,
    availability: 'in-stock',
    ritualLine: 'A silky botanical oil-serum crafted for luminous comfort.',
    ritualStep: 'Morning & Evening · Botanical Treatment',
    description:
      'Housed in warm amber frosted glass with a natural dark walnut pipette collar and champagne-gold ring, Botanical Elixir delivers a lightweight, enveloping veil.',
    textureNote: 'Golden translucent dry-touch botanical oil fluid.',
    application:
      'Dispense 3 to 4 drops into clean palms and press gently over damp skin morning or evening.',
    verifiedInci: null,
    formulationNote: OFFICIAL_INCI_NOTICE,
    compatibleIds: ['deep-cleanse-oil', 'hydrating-balm', 'botanical-matte-moisturizer'],
    refillEligible: true,
    refillPriceUsd: 112,
    dosagePerUse: 0.35,
    personalizationEligible: true,
    engravingMaxChars: 12,
    vesselStyle: 'walnut-dropper',
    vesselTintHex: '#B68443',
    liquidTintHex: '#D19B4A',
    cutoutImage: '/src/assets/images/product_botanical_elixir_cutout.png',
    packshotImage: '/src/assets/images/product_botanical_elixir_1795599728356.jpg',
    macroImage: SOMA_ASSETS.macros.refinedFormulation,
    aspectRatio: 0.31,
    shelfHeightRatio: 0.88,
  },
  {
    id: 'hydrating-balm',
    slug: 'hydrating-balm',
    orderLabel: '02',
    series: 'botanical-natural',
    seriesLabel: 'Botanical & Natural Series',
    stepCategory: 'seal',
    brand: 'SOMA FACE',
    name: 'Hydrating Balm',
    volume: '50 g',
    volumeValue: 50,
    volumeUnit: 'g',
    volumeImperial: '1.76 oz',
    price: 152,
    availability: 'in-stock',
    ritualLine: 'A plush botanical balm designed to seal in serene comfort.',
    ritualStep: 'Evening · Restorative Seal',
    description:
      'Presented in weighted frosted sand glass crowned with a hand-finished walnut lid and champagne-gold ring, Hydrating Balm melts cleanly on skin warmth.',
    textureNote: 'Cushiony whipped ivory balm that softens into a satin veil.',
    application:
      'Warm a small pearl between fingertips and smooth gently across face and neck after serum.',
    verifiedInci: null,
    formulationNote: OFFICIAL_INCI_NOTICE,
    compatibleIds: ['botanical-elixir', 'regenerative-serum', 'eye-balm'],
    refillEligible: true,
    refillPriceUsd: 124,
    dosagePerUse: 0.65,
    personalizationEligible: true,
    engravingMaxChars: 12,
    vesselStyle: 'walnut-jar',
    vesselTintHex: '#DDD4C3',
    liquidTintHex: '#F3ECE0',
    cutoutImage: '/src/assets/images/product_hydrating_balm_cutout.png',
    packshotImage: '/src/assets/images/product_hydrating_balm_1795599730455.jpg',
    macroImage: SOMA_ASSETS.macros.silkyCream,
    aspectRatio: 1.08,
    shelfHeightRatio: 0.65,
  },
  {
    id: 'regenerative-serum',
    slug: 'regenerative-serum',
    orderLabel: '03',
    series: 'botanical-natural',
    seriesLabel: 'Botanical & Natural Series',
    stepCategory: 'treat',
    brand: 'SOMA FACE',
    name: 'Regenerative Serum',
    volume: '20 ml',
    volumeValue: 20,
    volumeUnit: 'ml',
    volumeImperial: '0.67 fl oz',
    price: 148,
    availability: 'in-stock',
    ritualLine: 'Concentrated botanical poise in frosted sage glass.',
    ritualStep: 'Morning & Evening · Targeted Concentrate',
    description:
      'Sculptural dark walnut wood overcap paired with a frosted sage-sand vessel for concentrated daily layering.',
    textureNote: 'Fine translucent gel-serum with immediate silky absorption.',
    application:
      'Apply 2 drops onto cleansed skin before moisturizer, pressing evenly across contours.',
    verifiedInci: null,
    formulationNote: OFFICIAL_INCI_NOTICE,
    compatibleIds: ['deep-cleanse-oil', 'hydrating-balm', 'botanical-matte-moisturizer'],
    refillEligible: false,
    refillPriceUsd: null,
    dosagePerUse: 0.3,
    personalizationEligible: true,
    engravingMaxChars: 12,
    vesselStyle: 'walnut-tall',
    vesselTintHex: '#A7AE9E',
    liquidTintHex: '#C5CCB8',
    cutoutImage: '/src/assets/images/product_regenerative_serum_cutout.png',
    packshotImage: '/src/assets/images/product_regenerative_serum_1795599729591.jpg',
    macroImage: SOMA_ASSETS.macros.luminousSerum,
    aspectRatio: 0.32,
    shelfHeightRatio: 0.78,
  },
  {
    id: 'botanical-matte-moisturizer',
    slug: 'botanical-matte-moisturizer',
    orderLabel: '04',
    series: 'botanical-natural',
    seriesLabel: 'Botanical & Natural Series',
    stepCategory: 'seal',
    brand: 'SOMA FACE',
    name: 'Botanical Matte Moisturizer',
    volume: '50 ml',
    volumeValue: 50,
    volumeUnit: 'ml',
    volumeImperial: '1.7 fl oz',
    price: 128,
    availability: 'in-stock',
    ritualLine: 'Balanced daytime hydration with a quiet velvet finish.',
    ritualStep: 'Morning · Daylight Seal',
    description:
      'Architectural frosted ivory pump bottle topped with a carved walnut actuator and brushed gold collar for effortless measured dosing.',
    textureNote: 'Featherlight lotion-emulsion settling to a soft-focus matte finish.',
    application:
      'Press one to two measured pumps across face and neck as your daytime moisturizing veil.',
    verifiedInci: null,
    formulationNote: OFFICIAL_INCI_NOTICE,
    compatibleIds: ['deep-cleanse-oil', 'regenerative-serum', 'radiant-serum'],
    refillEligible: true,
    refillPriceUsd: 102,
    dosagePerUse: 0.6,
    personalizationEligible: false,
    engravingMaxChars: 12,
    vesselStyle: 'walnut-pump',
    vesselTintHex: '#E4DFD3',
    liquidTintHex: '#F4EFE5',
    cutoutImage: '/src/assets/images/product_botanical_matte_moisturizer_cutout.png',
    packshotImage: '/src/assets/images/product_botanical_matte_moisturizer_1795599729838.jpg',
    macroImage: SOMA_ASSETS.macros.dailyRitual,
    aspectRatio: 0.31,
    shelfHeightRatio: 0.9,
  },

  // =========================================================================
  // 2. MINIMALIST DAILY SERIES (3 Products)
  // =========================================================================
  {
    id: 'hydrating-cream',
    slug: 'hydrating-cream',
    orderLabel: '05',
    series: 'minimalist-daily',
    seriesLabel: 'Minimalist Daily Series',
    stepCategory: 'seal',
    brand: 'SOMA FACE',
    name: 'Hydrating Cream',
    volume: '30 ml',
    volumeValue: 30,
    volumeUnit: 'ml',
    volumeImperial: '1.0 fl oz',
    price: 118,
    availability: 'in-stock',
    ritualLine: 'Essential daily moisture housed in pure alabaster frosted glass.',
    ritualStep: 'Morning & Evening · Daily Seal',
    description:
      'A clean daily cream presented in compact frosted ivory glass with a matte black cap and champagne-gold ring.',
    textureNote: 'Supple, breathable satin cream suitable for morning and evening.',
    application:
      'Smooth a measured touch onto face and neck following serum application.',
    verifiedInci: null,
    formulationNote: OFFICIAL_INCI_NOTICE,
    compatibleIds: ['deep-cleanse-oil', 'radiant-serum', 'eye-balm'],
    refillEligible: true,
    refillPriceUsd: 94,
    dosagePerUse: 0.5,
    personalizationEligible: true,
    engravingMaxChars: 12,
    vesselStyle: 'matte-jar',
    vesselTintHex: '#ECE7DC',
    liquidTintHex: '#FAF7F1',
    cutoutImage: '/src/assets/images/product_hydrating_cream_cutout.png',
    packshotImage: '/src/assets/images/product_hydrating_cream_1795599732005.jpg',
    macroImage: SOMA_ASSETS.macros.silkyCream,
    aspectRatio: 1.04,
    shelfHeightRatio: 0.58,
  },
  {
    id: 'radiant-serum',
    slug: 'radiant-serum',
    orderLabel: '06',
    series: 'minimalist-daily',
    seriesLabel: 'Minimalist Daily Series',
    stepCategory: 'treat',
    brand: 'SOMA FACE',
    name: 'Radiant Serum',
    volume: '20 ml',
    volumeValue: 20,
    volumeUnit: 'ml',
    volumeImperial: '0.67 fl oz',
    price: 126,
    availability: 'in-stock',
    ritualLine: 'A bright, weightless daily veil for composed morning skin.',
    ritualStep: 'Morning · Luminous Step',
    description:
      'Petite architectural frosted champagne cylinder designed for effortless daily layering under daytime cream.',
    textureNote: 'Fluid pearlescent serum with crisp, clean absorption.',
    application:
      'Apply 2 pumps or drops gently onto freshly cleansed face and neck each morning.',
    verifiedInci: null,
    formulationNote: OFFICIAL_INCI_NOTICE,
    compatibleIds: ['deep-cleanse-oil', 'hydrating-cream', 'botanical-matte-moisturizer'],
    refillEligible: false,
    refillPriceUsd: null,
    dosagePerUse: 0.3,
    personalizationEligible: true,
    engravingMaxChars: 12,
    vesselStyle: 'matte-tall',
    vesselTintHex: '#E5DAC8',
    liquidTintHex: '#F3E5CA',
    cutoutImage: '/src/assets/images/product_radiant_serum_cutout.png',
    packshotImage: '/src/assets/images/product_radiant_serum_1795599732247.jpg',
    macroImage: SOMA_ASSETS.macros.luminousSerum,
    aspectRatio: 0.29,
    shelfHeightRatio: 0.76,
  },
  {
    id: 'deep-cleanse-oil',
    slug: 'deep-cleanse-oil',
    orderLabel: '07',
    series: 'minimalist-daily',
    seriesLabel: 'Minimalist Daily Series',
    stepCategory: 'cleanse',
    brand: 'SOMA FACE',
    name: 'Deep Cleanse Oil',
    volume: '100 ml',
    volumeValue: 100,
    volumeUnit: 'ml',
    volumeImperial: '3.4 fl oz',
    price: 92,
    availability: 'in-stock',
    ritualLine: 'The serene first gesture—dissolving impurities without stripping.',
    ritualStep: 'Morning & Evening · First Cleanse',
    description:
      'Generous 100 ml frosted glass vessel fitted with a matte black architectural pump and brushed champagne collar.',
    textureNote: 'Silky pale champagne cleansing oil that emulsifies cleanly with warm water.',
    application:
      'Massage 2 pumps over dry skin, emulsify with lukewarm water, and rinse thoroughly.',
    verifiedInci: null,
    formulationNote: OFFICIAL_INCI_NOTICE,
    compatibleIds: ['the-essence-serum', 'serum', 'hydrating-cream', 'cream'],
    refillEligible: true,
    refillPriceUsd: 74,
    dosagePerUse: 1.5,
    personalizationEligible: false,
    engravingMaxChars: 12,
    vesselStyle: 'matte-pump',
    vesselTintHex: '#DDD1B0',
    liquidTintHex: '#E7D59C',
    cutoutImage: '/src/assets/images/product_deep_cleanse_oil_cutout.png',
    packshotImage: '/src/assets/images/product_deep_cleanse_oil_1795599732984.jpg',
    macroImage: SOMA_ASSETS.macros.refinedFormulation,
    aspectRatio: 0.37,
    shelfHeightRatio: 0.96,
  },

  // =========================================================================
  // 3. SIGNATURE & NIGHT REPAIR SERIES (5 Products — incl. 3 Hero Icons)
  // =========================================================================
  {
    id: 'the-essence-serum',
    slug: 'the-essence-serum',
    orderLabel: '08',
    series: 'signature-night-repair',
    seriesLabel: 'Signature & Night Repair Series',
    stepCategory: 'treat',
    brand: 'SOMA FACE',
    name: 'The Essence Serum',
    volume: '30 ml',
    volumeValue: 30,
    volumeUnit: 'ml',
    volumeImperial: '1.0 fl oz',
    price: 162,
    availability: 'in-stock',
    ritualLine: 'Our signature preparatory essence serum for poised skin.',
    ritualStep: 'Morning & Evening · Signature Essence',
    description:
      'Iconic tall frosted champagne-sand bottle uniting minimal architectural lines with a weightless, fluid texture.',
    textureNote: 'Micro-fluid silk essence preparing skin for cream layering.',
    application:
      'Press 2 to 3 drops over freshly cleansed skin morning and night before cream.',
    verifiedInci: null,
    formulationNote: OFFICIAL_INCI_NOTICE,
    compatibleIds: ['deep-cleanse-oil', 'the-nourishing-cream', 'cream', 'eye-balm'],
    refillEligible: true,
    refillPriceUsd: 132,
    dosagePerUse: 0.35,
    personalizationEligible: true,
    engravingMaxChars: 12,
    vesselStyle: 'matte-tall',
    vesselTintHex: '#DFD2BC',
    liquidTintHex: '#EAD5B0',
    cutoutImage: '/src/assets/images/product_the_essence_serum_cutout.png',
    packshotImage: '/src/assets/images/product_the_essence_serum_1795599734779.jpg',
    macroImage: SOMA_ASSETS.macros.luminousSerum,
    aspectRatio: 0.28,
    shelfHeightRatio: 0.86,
  },
  {
    id: 'the-nourishing-cream',
    slug: 'the-nourishing-cream',
    orderLabel: '09',
    series: 'signature-night-repair',
    seriesLabel: 'Signature & Night Repair Series',
    stepCategory: 'seal',
    brand: 'SOMA FACE',
    name: 'The Nourishing Cream',
    volume: '50 ml',
    volumeValue: 50,
    volumeUnit: 'ml',
    volumeImperial: '1.7 fl oz',
    price: 178,
    availability: 'in-stock',
    ritualLine: 'Velvety architectural comfort formulated for unhurried care.',
    ritualStep: 'Morning & Evening · Signature Seal',
    description:
      'Weighted frosted sand jar topped with a matte black lid and champagne gold hairline collar for plush daily nourishment.',
    textureNote: 'Velvet-rich ivory cream with an enveloping, non-greasy finish.',
    application:
      'Smooth a pearl-sized amount gently upward across face and neck morning or evening.',
    verifiedInci: null,
    formulationNote: OFFICIAL_INCI_NOTICE,
    compatibleIds: ['the-essence-serum', 'serum', 'eye-balm'],
    refillEligible: true,
    refillPriceUsd: 144,
    dosagePerUse: 0.65,
    personalizationEligible: true,
    engravingMaxChars: 12,
    vesselStyle: 'matte-jar',
    vesselTintHex: '#DCD1BF',
    liquidTintHex: '#F4EDE1',
    cutoutImage: '/src/assets/images/product_the_nourishing_cream_cutout.png',
    packshotImage: '/src/assets/images/product_the_nourishing_cream_1795599736873.jpg',
    macroImage: SOMA_ASSETS.macros.silkyCream,
    aspectRatio: 1.07,
    shelfHeightRatio: 0.66,
  },
  {
    id: 'serum',
    slug: 'luminous-repair-serum',
    orderLabel: '10',
    series: 'signature-night-repair',
    seriesLabel: 'Signature & Night Repair Series',
    stepCategory: 'treat',
    brand: 'SOMA FACE',
    name: 'Luminous Repair Serum',
    volume: '30 ml',
    volumeValue: 30,
    volumeUnit: 'ml',
    volumeImperial: '1.0 fl oz',
    price: 145,
    availability: 'in-stock',
    ritualLine: 'A refined addition to your daily skincare ritual.',
    ritualStep: 'Morning & Evening · First Layer',
    description:
      'A weightless, silky fluid housed in frosted sand glass with a matte black cap and champagne-gold collar, crafted to layer effortlessly before overnight care.',
    textureNote: 'Translucent golden-champagne fluid with a smooth, luminous finish.',
    application:
      'Warm two to three drops between clean fingertips and press gently across face and neck morning and evening.',
    verifiedInci: null,
    formulationNote: OFFICIAL_INCI_NOTICE,
    compatibleIds: ['deep-cleanse-oil', 'cream', 'eye-balm'],
    refillEligible: true,
    refillPriceUsd: 118,
    dosagePerUse: 0.35,
    personalizationEligible: true,
    engravingMaxChars: 12,
    vesselStyle: 'matte-tall',
    vesselTintHex: '#D8C7AE',
    liquidTintHex: '#E5CE9E',
    cutoutImage: '/src/assets/images/product_serum_cutout.png',
    packshotImage: '/src/assets/images/product_serum_1795597462504.jpg',
    macroImage: SOMA_ASSETS.macros.luminousSerum,
    aspectRatio: 230 / 905,
    shelfHeightRatio: 0.85,
    featuredInHero: true,
  },
  {
    id: 'cream',
    slug: 'restorative-overnight-cream',
    orderLabel: '11',
    series: 'signature-night-repair',
    seriesLabel: 'Signature & Night Repair Series',
    stepCategory: 'seal',
    brand: 'SOMA FACE',
    name: 'Restorative Overnight Cream',
    volume: '50 ml',
    volumeValue: 50,
    volumeUnit: 'ml',
    volumeImperial: '1.7 fl oz',
    price: 185,
    availability: 'in-stock',
    ritualLine: 'An elegant evening ritual designed around nourishment.',
    ritualStep: 'Evening · Enveloping Veil',
    description:
      'The centerpiece of the SOMA FACE collection—a plush, velvety overnight cream presented in weighted frosted glass with a matte black cap and champagne-gold ring.',
    textureNote: 'Dense, silky ivory emulsion that melts seamlessly on contact.',
    application:
      'Smooth a pearl-sized measure over face and neck as the final step of your evening skincare ritual.',
    verifiedInci: null,
    formulationNote: OFFICIAL_INCI_NOTICE,
    compatibleIds: ['serum', 'the-essence-serum', 'eye-balm'],
    refillEligible: true,
    refillPriceUsd: 148,
    dosagePerUse: 0.7,
    personalizationEligible: true,
    engravingMaxChars: 12,
    vesselStyle: 'matte-jar',
    vesselTintHex: '#D8C9B4',
    liquidTintHex: '#F3ECE0',
    cutoutImage: '/src/assets/images/product_cream_cutout.png',
    packshotImage: '/src/assets/images/product_cream_1795597520786.jpg',
    macroImage: SOMA_ASSETS.macros.silkyCream,
    aspectRatio: 684 / 622,
    shelfHeightRatio: 0.66,
    featuredInHero: true,
  },
  {
    id: 'eye-balm',
    slug: 'active-eye-balm',
    orderLabel: '12',
    series: 'signature-night-repair',
    seriesLabel: 'Signature & Night Repair Series',
    stepCategory: 'eye',
    brand: 'SOMA FACE',
    name: 'Active Eye Balm',
    volume: '15 ml',
    volumeValue: 15,
    volumeUnit: 'ml',
    volumeImperial: '0.5 fl oz',
    price: 120,
    availability: 'in-stock',
    ritualLine: 'Dedicated care for the delicate eye area.',
    ritualStep: 'Morning & Evening · Contour Finish',
    description:
      'A finely balanced, cushiony balm formulated specifically for the delicate orbital contour, housed in a petite frosted glass vessel.',
    textureNote: 'Satin-pearlescent micro-balm designed for gentle, drag-free glide.',
    application:
      'Tap a small touch along the orbital bone using the ring finger until softly absorbed.',
    verifiedInci: null,
    formulationNote: OFFICIAL_INCI_NOTICE,
    compatibleIds: ['serum', 'cream', 'the-nourishing-cream'],
    refillEligible: true,
    refillPriceUsd: 96,
    dosagePerUse: 0.15,
    personalizationEligible: true,
    engravingMaxChars: 12,
    vesselStyle: 'matte-jar',
    vesselTintHex: '#D4C1A3',
    liquidTintHex: '#EFE6D7',
    cutoutImage: '/src/assets/images/product_eye_balm_cutout.png',
    packshotImage: '/src/assets/images/product_eye_balm_1795597466091.jpg',
    macroImage: SOMA_ASSETS.macros.eyeCare,
    aspectRatio: 620 / 561,
    shelfHeightRatio: 0.48,
    featuredInHero: true,
  },
] as const;

export const HERO_TRIO_IDS: readonly ProductId[] = ['serum', 'cream', 'eye-balm'] as const;

export const FORMULA_MACROS: readonly FormulaMacroItem[] = [
  {
    id: 'silky-cream',
    label: 'Silky Cream Texture',
    caption: 'Plush ivory emulsion crafted for evening comfort.',
    detail: 'Restorative Overnight Cream · Sensory Study 01',
    image: SOMA_ASSETS.macros.silkyCream,
  },
  {
    id: 'luminous-serum',
    label: 'Luminous Serum',
    caption: 'Weightless fluid clarity with a refined satin finish.',
    detail: 'Luminous Repair Serum · Sensory Study 02',
    image: SOMA_ASSETS.macros.luminousSerum,
  },
  {
    id: 'refined-formulation',
    label: 'Refined Formulation',
    caption: 'Balanced textures engineered for seamless layering.',
    detail: 'SOMA FACE Atelier · Sensory Study 03',
    image: SOMA_ASSETS.macros.refinedFormulation,
  },
  {
    id: 'delicate-eye-care',
    label: 'Delicate Eye Care',
    caption: 'Cushiony glide tailored to the fragile eye contour.',
    detail: 'Active Eye Balm · Sensory Study 04',
    image: SOMA_ASSETS.macros.eyeCare,
  },
  {
    id: 'daily-skin-ritual',
    label: 'Daily Skin Ritual',
    caption: 'Unrushed tactile care framed by natural stillness.',
    detail: 'The Three-Step Collection · Sensory Study 05',
    image: SOMA_ASSETS.macros.dailyRitual,
  },
] as const;

export function getProductById(id: ProductId): SomaProduct {
  return SOMA_PRODUCTS.find((p) => p.id === id) ?? SOMA_PRODUCTS[10];
}

export function getProductBySlug(slug: string): SomaProduct | undefined {
  return SOMA_PRODUCTS.find((p) => p.slug === slug || p.id === slug);
}
