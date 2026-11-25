import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';
import { SOMA_PRODUCTS, type ProductId } from './src/data/products';
import { CURRENCY_CONFIG, type CurrencyCode, type LanguageCode } from './src/i18n/translations';
import {
  buildOrderConfirmation,
  calculatePricingSummary,
  type CartItem,
} from './src/store/cartLogic';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT ?? 3000);
const isProduction = process.env.NODE_ENV === 'production';

// Allowed image MIME types & 6 MB base64 cap for multimodal endpoints
const ALLOWED_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BASE64_LENGTH = 8_000_000;

const VALID_PRODUCT_IDS = new Set<string>(SOMA_PRODUCTS.map((p) => p.id));

const CATALOG_GROUNDING = SOMA_PRODUCTS.map(
  (p) =>
    `- id="${p.id}" | name="${p.name}" | series="${p.seriesLabel}" | step="${p.stepCategory}" | volume="${p.volume}" | priceUSD=${p.price} | refillEligible=${p.refillEligible} | engravingEligible=${p.personalizationEligible} | texture="${p.textureNote}" | application="${p.application}"`
).join('\n');

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error('GEMINI_API_KEY_MISSING');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function handleGeminiError(res: Response, err: unknown) {
  const message = err instanceof Error ? err.message : 'Unexpected AI service error';
  if (message === 'GEMINI_API_KEY_MISSING') {
    return res.status(503).json({
      error:
        'AI service is unavailable because GEMINI_API_KEY is not configured in Settings > Secrets.',
      code: 'API_KEY_MISSING',
    });
  }
  if (/403|PERMISSION_DENIED|API_KEY_INVALID/i.test(message)) {
    return res.status(403).json({
      error: 'Please check your GEMINI_API_KEY in Settings > Secrets.',
      code: 'API_KEY_INVALID',
    });
  }
  if (/429|RESOURCE_EXHAUSTED/i.test(message)) {
    return res.status(429).json({
      error: 'AI quota reached temporarily. Please retry shortly.',
      code: 'QUOTA_EXCEEDED',
    });
  }
  return res.status(502).json({
    error: 'Unable to complete the AI request right now. Please try again.',
    detail: message,
  });
}

function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  if (typeof dataUrl !== 'string' || dataUrl.length > MAX_BASE64_LENGTH) return null;
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;
  const mimeType = match[1];
  if (!ALLOWED_IMAGE_MIMES.has(mimeType)) return null;
  return { mimeType, data: match[2] };
}

function safeLanguage(lang: unknown): LanguageCode {
  const allowed: LanguageCode[] = ['en', 'tr', 'de', 'ru', 'es', 'pt', 'zh'];
  return typeof lang === 'string' && (allowed as string[]).includes(lang)
    ? (lang as LanguageCode)
    : 'en';
}

function safeCurrency(curr: unknown): CurrencyCode {
  const allowed: CurrencyCode[] = ['USD', 'EUR', 'TRY', 'RUB', 'BRL', 'CNY'];
  return typeof curr === 'string' && (allowed as string[]).includes(curr)
    ? (curr as CurrencyCode)
    : 'USD';
}

function sanitizeCartItems(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return [];
  const clean: CartItem[] = [];
  for (const entry of raw.slice(0, 24)) {
    if (!entry || typeof entry !== 'object') continue;
    const item = entry as Record<string, unknown>;
    if (typeof item.productId !== 'string' || !VALID_PRODUCT_IDS.has(item.productId)) continue;
    const quantity = Math.min(20, Math.max(1, Math.floor(Number(item.quantity) || 1)));
    const isRefill = Boolean(item.isRefill);
    const isSubscription = Boolean(item.isSubscription);
    const engravingText =
      typeof item.engravingText === 'string'
        ? item.engravingText.replace(/[^\p{L}\p{N}\s.\-&]/gu, '').trim().slice(0, 12)
        : undefined;
    clean.push({
      id: typeof item.id === 'string' ? item.id.slice(0, 80) : `${item.productId}|${isRefill}`,
      productId: item.productId as ProductId,
      quantity,
      isRefill,
      isSubscription,
      engravingText: engravingText || undefined,
    });
  }
  return clean;
}

async function createServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Health & catalog endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      aiConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
      paymentMode: process.env.STRIPE_SECRET_KEY ? 'live' : 'test',
      catalogCount: SOMA_PRODUCTS.length,
    });
  });

  app.get('/api/catalog', (_req: Request, res: Response) => {
    res.json({ products: SOMA_PRODUCTS });
  });

  // =========================================================================
  // 1. WEATHER-ADAPTIVE SKINCARE (Open-Meteo — strict numeric lat/lon, no SSRF)
  // =========================================================================
  app.get('/api/weather', async (req: Request, res: Response) => {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({ error: 'Valid numeric latitude and longitude are required.' });
    }

    try {
      const url = new URL('https://api.open-meteo.com/v1/forecast');
      url.searchParams.set('latitude', lat.toFixed(4));
      url.searchParams.set('longitude', lon.toFixed(4));
      url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m');
      url.searchParams.set('hourly', 'uv_index');
      url.searchParams.set('forecast_days', '1');

      const upstream = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(7000),
      });
      if (!upstream.ok) {
        return res.status(502).json({ error: 'Weather provider returned an unexpected status.' });
      }
      const data = (await upstream.json()) as {
        current?: {
          temperature_2m?: number;
          relative_humidity_2m?: number;
          weather_code?: number;
          wind_speed_10m?: number;
        };
        hourly?: { uv_index?: number[] };
      };

      const tempC = data.current?.temperature_2m ?? 20;
      const humidity = data.current?.relative_humidity_2m ?? 50;
      const windKmh = data.current?.wind_speed_10m ?? 8;
      const weatherCode = data.current?.weather_code ?? 0;
      const uvValues = data.hourly?.uv_index ?? [2];
      const peakUv = Math.max(...uvValues.slice(0, 24).filter((v) => Number.isFinite(v)), 0);

      // Deterministic weather-adaptive cosmetic pairing grounded exclusively in verified catalog vessels
      let conditionSummary = 'Temperate & Balanced';
      let recommendedIds: ProductId[] = ['the-essence-serum', 'hydrating-cream', 'eye-balm'];
      let guidance =
        'Balanced ambient conditions favor light daily layering with fluid serum and a breathable seal.';

      if (humidity < 40 || tempC < 8) {
        conditionSummary = 'Dry / Cool Air';
        recommendedIds = ['botanical-elixir', 'cream', 'eye-balm'];
        guidance =
          'Low ambient humidity or brisk air favors richer evening comfort—layer an enveloping oil-serum beneath Restorative Overnight Cream.';
      } else if (humidity > 70 || tempC > 26) {
        conditionSummary = 'Warm / Humid Air';
        recommendedIds = ['deep-cleanse-oil', 'radiant-serum', 'botanical-matte-moisturizer'];
        guidance =
          'Warm, humid conditions pair well with thorough evening oil cleansing and a featherlight soft-matte daytime moisturizer.';
      } else if (peakUv >= 6) {
        conditionSummary = 'High Daytime UV Index';
        recommendedIds = ['radiant-serum', 'botanical-matte-moisturizer', 'cream'];
        guidance =
          'Elevated UV conditions call for light daytime hydration beneath dedicated SPF protection, followed by restorative evening comfort.';
      }

      const rawCity = typeof req.query.city === 'string' ? req.query.city.trim().slice(0, 48) : '';
      const city = rawCity || 'Selected Location';

      return res.json({
        city,
        temperatureC: Math.round(tempC * 10) / 10,
        humidity: Math.round(humidity),
        humidityPct: Math.round(humidity),
        uvIndex: Math.round(peakUv * 10) / 10,
        windKmh: Math.round(windKmh),
        weatherCode,
        conditionSummary,
        guidance,
        recommendedIds,
      });
    } catch (err) {
      return res.status(502).json({
        error: 'Unable to fetch live weather from Open-Meteo.',
        detail: err instanceof Error ? err.message : 'Network error',
      });
    }
  });

  // =========================================================================
  // 2. SERVER-SIDE CHECKOUT & BUNDLE DISCOUNT VALIDATION (TEST MODE SAFE)
  // =========================================================================
  app.post('/api/checkout/validate', (req: Request, res: Response) => {
    const body = req.body as Record<string, unknown>;
    const items = sanitizeCartItems(body.items);
    if (items.length === 0) {
      return res.status(400).json({ error: 'Shopping bag is empty or contains invalid items.' });
    }

    const currency = safeCurrency(body.currency);
    const giftWrap = Boolean(body.giftWrap);
    const giftNote = typeof body.giftNote === 'string' ? body.giftNote.trim().slice(0, 200) : '';
    const customerName = typeof body.customerName === 'string' ? body.customerName.trim() : '';
    const customerEmail = typeof body.customerEmail === 'string' ? body.customerEmail.trim() : '';
    const shippingAddress =
      typeof body.shippingAddress === 'string' ? body.shippingAddress.trim() : '';

    if (!customerName || !customerEmail || !shippingAddress) {
      return res
        .status(400)
        .json({ error: 'Name, email address, and delivery address are required.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const paymentMode = process.env.STRIPE_SECRET_KEY ? 'live' : 'test';
    const order = buildOrderConfirmation(items, customerName, customerEmail, {
      shippingAddress,
      currency,
      giftWrap,
      giftNote,
      paymentMode,
    });

    const serverPricing = calculatePricingSummary(items, { giftWrap, currency });
    return res.json({
      validated: true,
      paymentMode,
      currencyRate: CURRENCY_CONFIG[currency].rateFromUsd,
      pricing: serverPricing,
      order,
      notice:
        paymentMode === 'test'
          ? 'Test Mode Order Created: No live payment provider charge was executed.'
          : 'Order validated for live payment capture.',
    });
  });

  // =========================================================================
  // 3. AI SKIN CONCIERGE (Multilingual, Action-Aware, Non-Medical)
  // =========================================================================
  app.post('/api/ai/concierge', async (req: Request, res: Response) => {
    const body = req.body as Record<string, unknown>;
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 1200) : '';
    if (!message) {
      return res.status(400).json({ error: 'Message is required.' });
    }
    const language = safeLanguage(body.language);
    const history = Array.isArray(body.history) ? body.history.slice(-6) : [];
    const weatherContext =
      typeof body.weatherSummary === 'string' ? body.weatherSummary.slice(0, 200) : '';

    try {
      const ai = getGeminiClient();
      const historyText = history
        .map((h: unknown) => {
          if (!h || typeof h !== 'object') return '';
          const r = h as Record<string, unknown>;
          return `${r.role === 'user' ? 'Client' : 'Concierge'}: ${String(r.text ?? '').slice(0, 350)}`;
        })
        .filter(Boolean)
        .join('\n');

      const prompt = [
        historyText ? `Recent conversation:\n${historyText}` : '',
        weatherContext ? `Current ambient weather context: ${weatherContext}` : '',
        `Client message (respond strictly in language code "${language}"): ${message}`,
      ]
        .filter(Boolean)
        .join('\n\n');

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction: `You are the SOMA FACE Luxury Skincare Concierge.
Respond elegantly, concisely, and warmly in language "${language}".
Ground EVERY product mention strictly in the verified SOMA FACE catalog below:
${CATALOG_GROUNDING}

CRITICAL RULES:
- Never fabricate unverified INCI ingredient lists, clinical trial percentages, or certifications. If asked for exact full INCI, note that official full INCI disclosures accompany physical SOMA FACE packaging.
- Never diagnose medical conditions or present yourself as a dermatologist or doctor.
- Recommend valid product IDs from the catalog above when helpful, and choose an optional UI action only when appropriate.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: { type: Type.STRING },
              recommendedProductIds: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              suggestedAction: {
                type: Type.STRING,
                description:
                  'One of: none, open_product, open_studio, open_ritual_builder, open_collection',
              },
              focusProductId: { type: Type.STRING },
            },
            required: ['reply', 'recommendedProductIds', 'suggestedAction'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim()) as {
        reply?: string;
        recommendedProductIds?: string[];
        suggestedAction?: string;
        focusProductId?: string;
      };

      const validIds = (parsed.recommendedProductIds ?? []).filter((id) =>
        VALID_PRODUCT_IDS.has(id)
      ) as ProductId[];
      const focusId =
        parsed.focusProductId && VALID_PRODUCT_IDS.has(parsed.focusProductId)
          ? (parsed.focusProductId as ProductId)
          : validIds[0];

      return res.json({
        reply: parsed.reply ?? 'How may I assist your SOMA FACE skincare ritual today?',
        recommendedProductIds: validIds.slice(0, 3),
        suggestedAction: parsed.suggestedAction ?? 'none',
        focusProductId: focusId,
      });
    } catch (err) {
      return handleGeminiError(res, err);
    }
  });

  // =========================================================================
  // 4. SOMA LAB — AI SKIN ANALYSIS (Explicit Consent Required, Non-Medical)
  // =========================================================================
  app.post('/api/ai/skin-analysis', async (req: Request, res: Response) => {
    const body = req.body as Record<string, unknown>;
    if (body.consentAccepted !== true) {
      return res
        .status(400)
        .json({ error: 'Explicit photo processing consent is required before analysis.' });
    }
    const image = parseDataUrl(String(body.imageDataUrl ?? ''));
    if (!image) {
      return res
        .status(400)
        .json({ error: 'Please provide a valid JPEG, PNG, or WebP portrait image (under 6 MB).' });
    }
    const language = safeLanguage(body.language);
    const concerns = typeof body.concerns === 'string' ? body.concerns.slice(0, 300) : '';

    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: {
          parts: [
            { inlineData: { mimeType: image.mimeType, data: image.data } },
            {
              text: `Analyze visible cosmetic skincare characteristics in this portrait in language "${language}". User stated preferences/notes: "${concerns || 'General daily refinement'}". Recommend 3 compatible SOMA FACE vessels (cleanse/treat/seal or eye) from the verified catalog.`,
            },
          ],
        },
        config: {
          systemInstruction: `You are SOMA LAB Cosmetic Visual Assessment AI.
You evaluate ONLY visible, cosmetic skin appearance cues (apparent surface hydration, radiance/luminosity, visible shine vs. dryness, undertone warmth/coolness/neutrality) under photo lighting.
CRITICAL RULES:
- Never diagnose any medical or dermatological condition (no acne grades, rosacea, eczema, melanoma, or prescriptions).
- Always state clear lighting and camera limitations of single-image cosmetic assessment.
- Only recommend product IDs from this verified SOMA FACE catalog:
${CATALOG_GROUNDING}`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              undertoneCalibration: { type: Type.STRING },
              skinToneBand: { type: Type.STRING },
              visualObservations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    attribute: { type: Type.STRING },
                    rating: { type: Type.INTEGER },
                    note: { type: Type.STRING },
                  },
                  required: ['attribute', 'rating', 'note'],
                },
              },
              cosmeticSuggestions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              recommendedProductIds: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              limitationsDisclosure: { type: Type.STRING },
            },
            required: [
              'undertoneCalibration',
              'skinToneBand',
              'visualObservations',
              'cosmeticSuggestions',
              'recommendedProductIds',
              'limitationsDisclosure',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim()) as {
        undertoneCalibration?: string;
        skinToneBand?: string;
        visualObservations?: Array<{ attribute: string; rating: number; note: string }>;
        cosmeticSuggestions?: string[];
        recommendedProductIds?: string[];
        limitationsDisclosure?: string;
      };

      const validIds = (parsed.recommendedProductIds ?? []).filter((id) =>
        VALID_PRODUCT_IDS.has(id)
      ) as ProductId[];

      return res.json({
        undertoneCalibration: parsed.undertoneCalibration ?? 'Neutral-Warm (lighting-dependent)',
        skinToneBand: parsed.skinToneBand ?? 'Calibrated from ambient lighting',
        visualObservations: (parsed.visualObservations ?? []).slice(0, 5),
        cosmeticSuggestions: (parsed.cosmeticSuggestions ?? []).slice(0, 4),
        recommendedProductIds:
          validIds.length > 0 ? validIds.slice(0, 3) : (['serum', 'cream', 'eye-balm'] as ProductId[]),
        limitationsDisclosure:
          parsed.limitationsDisclosure ??
          'Image-based cosmetic observations depend on camera lighting, white balance, and angle, and do not constitute medical or dermatological evaluation.',
      });
    } catch (err) {
      return handleGeminiError(res, err);
    }
  });

  // =========================================================================
  // 5. SOMA LAB — AI ROUTINE GENERATOR (Morning/Evening/Cleanse/Treat/Seal)
  // =========================================================================
  app.post('/api/ai/routine', async (req: Request, res: Response) => {
    const body = req.body as Record<string, unknown>;
    const skinFeel = typeof body.skinFeel === 'string' ? body.skinFeel.slice(0, 120) : 'Balanced';
    const focus = typeof body.focus === 'string' ? body.focus.slice(0, 180) : 'Radiance & comfort';
    const climate = typeof body.climate === 'string' ? body.climate.slice(0, 180) : 'Temperate';
    const language = safeLanguage(body.language);

    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Create a luxury cosmetic skincare routine in language "${language}" for skin feel "${skinFeel}", cosmetic focus "${focus}", and ambient environment "${climate}".`,
        config: {
          systemInstruction: `You are the SOMA FACE Ritual Architect.
Construct a structured Morning & Evening cosmetic routine organized into Cleanse, Treat, and Seal steps using ONLY verified product IDs from the catalog below:
${CATALOG_GROUNDING}
Do not make medical claims or fabricate unverified INCI ingredients.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              routineTitle: { type: Type.STRING },
              rationale: { type: Type.STRING },
              morning: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    phase: { type: Type.STRING, description: 'Cleanse, Treat, or Seal' },
                    productId: { type: Type.STRING },
                    guidance: { type: Type.STRING },
                  },
                  required: ['phase', 'productId', 'guidance'],
                },
              },
              evening: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    phase: { type: Type.STRING, description: 'Cleanse, Treat, or Seal' },
                    productId: { type: Type.STRING },
                    guidance: { type: Type.STRING },
                  },
                  required: ['phase', 'productId', 'guidance'],
                },
              },
            },
            required: ['routineTitle', 'rationale', 'morning', 'evening'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim()) as {
        routineTitle?: string;
        rationale?: string;
        morning?: Array<{ phase: string; productId: string; guidance: string }>;
        evening?: Array<{ phase: string; productId: string; guidance: string }>;
      };

      const filterSteps = (steps?: Array<{ phase: string; productId: string; guidance: string }>) =>
        (steps ?? []).filter((s) => VALID_PRODUCT_IDS.has(s.productId)).slice(0, 4);

      return res.json({
        routineTitle: parsed.routineTitle ?? 'Personalized SOMA FACE Ritual',
        rationale: parsed.rationale ?? '',
        morning: filterSteps(parsed.morning),
        evening: filterSteps(parsed.evening),
      });
    } catch (err) {
      return handleGeminiError(res, err);
    }
  });

  // =========================================================================
  // 6. SOMA LAB — AI INCI DECODER (Text, Pasted INCI, or Consented Label Photo)
  // =========================================================================
  app.post('/api/ai/inci-decoder', async (req: Request, res: Response) => {
    const body = req.body as Record<string, unknown>;
    const inciText = typeof body.inciText === 'string' ? body.inciText.trim().slice(0, 4000) : '';
    const imageRaw = typeof body.imageDataUrl === 'string' ? body.imageDataUrl : '';
    const language = safeLanguage(body.language);

    let parsedImage: { mimeType: string; data: string } | null = null;
    if (imageRaw) {
      if (body.consentAccepted !== true) {
        return res
          .status(400)
          .json({ error: 'Explicit photo processing consent is required to analyze a label image.' });
      }
      parsedImage = parseDataUrl(imageRaw);
      if (!parsedImage) {
        return res
          .status(400)
          .json({ error: 'Invalid label image format. Use JPEG, PNG, or WebP under 6 MB.' });
      }
    }

    if (!inciText && !parsedImage) {
      return res
        .status(400)
        .json({ error: 'Enter an INCI ingredient list or upload a product label photo.' });
    }

    try {
      const ai = getGeminiClient();
      const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];
      if (parsedImage) {
        parts.push({ inlineData: parsedImage });
      }
      parts.push({
        text: `Decode and explain the cosmetic INCI ingredients in language "${language}".
${inciText ? `Provided INCI text: ${inciText}` : 'Read the visible INCI ingredient list from the attached label photograph.'}
Do NOT invent ingredients not present in the provided text or photograph. Clearly note any uncertainty, potential cosmetic layering cautions (e.g. strong acids with retinoids), and practical AM/PM layering suggestions.`,
      });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: { parts },
        config: {
          systemInstruction:
            'You are SOMA LAB Cosmetic Formulation Educator. Explain INCI ingredients accurately and conservatively without medical diagnosis or fabricated ingredient lists.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              ingredients: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    role: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                    timing: { type: Type.STRING, description: 'AM, PM, or AM / PM' },
                  },
                  required: ['name', 'role', 'explanation', 'timing'],
                },
              },
              compatibilityNotes: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              layeringGuidance: { type: Type.STRING },
              disclaimer: { type: Type.STRING },
            },
            required: [
              'summary',
              'ingredients',
              'compatibilityNotes',
              'layeringGuidance',
              'disclaimer',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      return res.json(parsed);
    } catch (err) {
      return handleGeminiError(res, err);
    }
  });

  // =========================================================================
  // VITE MIDDLEWARE (DEV) OR STATIC DIST (PROD)
  // =========================================================================
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      const indexFile = path.resolve(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output missing. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SOMA FACE server listening on http://localhost:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error('Failed to start SOMA FACE server:', err);
  process.exit(1);
});
