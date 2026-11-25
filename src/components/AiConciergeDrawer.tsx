import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  Box,
  Layers,
  Mic,
  MicOff,
  Send,
  ShieldAlert,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { ProductId, getProductById } from '../data/products';
import {
  LANGUAGE_OPTIONS,
  LocalePreferences,
  UiDictionary,
  formatCurrencyAmount,
} from '../i18n/translations';
import { WeatherSnapshot } from './CollectionStore';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  recommendedIds?: ProductId[];
  suggestedAction?: 'open_studio' | 'open_ritual_builder' | 'open_collection' | 'none';
}

interface AiConciergeDrawerProps {
  isOpen: boolean;
  prefs: LocalePreferences;
  t: UiDictionary;
  weather: WeatherSnapshot | null;
  onClose: () => void;
  onSelectProduct: (id: ProductId) => void;
  onInspect3D: (id: ProductId) => void;
  onOpenRitualBuilder: () => void;
  onAddToBag: (id: ProductId) => void;
}

const STARTER_PROMPTS = [
  'Suggest a 3-step evening ritual for dry skin.',
  'Compare Luminous Repair Serum and The Essence Serum.',
  'Which vessels are refillable?',
];

export function AiConciergeDrawer({
  isOpen,
  prefs,
  t,
  weather,
  onClose,
  onSelectProduct,
  onInspect3D,
  onOpenRitualBuilder,
  onAddToBag,
}: AiConciergeDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Welcome to SOMA FACE Atelier. Ask me to compare textures, assemble a Morning or Evening 3-step ritual, check refill eligibility, or open any vessel in our 3D Studio.',
      recommendedIds: ['serum', 'cream', 'eye-balm'],
      suggestedAction: 'open_ritual_builder',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [speakReplies, setSpeakReplies] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (!isOpen) return null;

  const bcp47 =
    LANGUAGE_OPTIONS.find((l) => l.code === prefs.language)?.bcp47 ?? 'en-US';

  const speakText = (text: string) => {
    if (!speakReplies || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = bcp47;
      utter.rate = 0.96;
      window.speechSynthesis.speak(utter);
    } catch {
      // Speech synthesis unavailable
    }
  };

  const toggleVoiceInput = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const w = window as unknown as {
      SpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
        start: () => void;
        stop: () => void;
      };
      webkitSpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
        start: () => void;
        stop: () => void;
      };
    };

    const SpeechRec = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRec) {
      setErrorMsg('Voice input is not supported in this browser. Please type your question below.');
      return;
    }

    setErrorMsg(null);
    const rec = new SpeechRec();
    rec.lang = bcp47;
    rec.interimResults = false;
    rec.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript ?? '';
      if (transcript) {
        setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
      }
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  };

  const sendMessage = async (textToSend: string) => {
    const clean = textToSend.trim();
    if (!clean || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: clean,
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await fetch('/api/ai/concierge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: clean,
          language: prefs.language,
          weatherSummary: weather
            ? `${weather.city}: ${Math.round(weather.temperatureC)}C, ${Math.round(weather.humidityPct)}% humidity, UV ${weather.uvIndex}`
            : undefined,
          history: nextHistory.slice(-6).map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data?.error || 'Concierge service is temporarily unavailable.');
      } else {
        const reply: ChatMessage = {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: data.reply || 'I can help you explore the SOMA FACE collection.',
          recommendedIds: Array.isArray(data.recommendedProductIds)
            ? data.recommendedProductIds
            : [],
          suggestedAction: data.suggestedAction,
        };
        setMessages((prev) => [...prev, reply]);
        speakText(reply.content);
      }
    } catch {
      setErrorMsg('Could not reach the SOMA AI Concierge server endpoint.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#111110]/72"
      role="dialog"
      aria-modal="true"
      aria-label={t.conciergeTitle}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative flex h-full w-full max-w-[470px] flex-col bg-[#F6F3EE] dark:bg-[#1B1A18] text-[#1C1B19] dark:text-[#F2ECE1] border-l border-[#1C1B19]/15 dark:border-[#CFAF70]/25 shadow-2xl"
        data-testid="ai-concierge-drawer"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1C1B19]/12 dark:border-[#F2ECE1]/12">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 text-[#B6975C]" />
            <div>
              <h2 className="font-display text-2xl font-normal leading-none">
                {t.conciergeTitle}
              </h2>
              <p className="mt-0.5 text-[10px] tracking-[0.18em] uppercase opacity-60">
                Multilingual Voice &amp; Text Atelier Advisor ({prefs.language.toUpperCase()})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSpeakReplies((v) => !v)}
              title={speakReplies ? 'Mute spoken replies' : 'Read replies aloud'}
              aria-label="Toggle spoken replies"
              className={`inline-flex h-8 w-8 items-center justify-center border cursor-pointer ${
                speakReplies
                  ? 'border-[#B6975C] text-[#B6975C]'
                  : 'border-[#1C1B19]/15 dark:border-[#F2ECE1]/15 opacity-70'
              }`}
            >
              {speakReplies ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close AI Concierge"
              className="inline-flex h-8 w-8 items-center justify-center opacity-75 hover:opacity-100 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Non-Medical Disclosure Bar */}
        <div className="px-6 py-2.5 bg-[#EAE3D7]/65 dark:bg-[#111110] border-b border-[#1C1B19]/10 dark:border-[#F2ECE1]/10 flex items-center gap-2 text-[11px] font-light opacity-85">
          <ShieldAlert className="h-3.5 w-3.5 text-[#B6975C] shrink-0" />
          <span>{t.conciergeDisclaimer}</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[90%] px-4 py-3 text-[13.5px] font-light leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#1C1B19] text-[#F6F3EE] dark:bg-[#CFAF70] dark:text-[#111110]'
                    : 'border border-[#1C1B19]/12 dark:border-[#F2ECE1]/14 bg-[#EAE3D7]/45 dark:bg-[#111110]/80'
                }`}
              >
                {msg.content}
              </div>

              {/* Actionable Recommended Vessels */}
              {msg.role === 'assistant' && msg.recommendedIds && msg.recommendedIds.length > 0 && (
                <div className="mt-2.5 w-full space-y-2">
                  {msg.recommendedIds.slice(0, 3).map((pid) => {
                    const p = getProductById(pid);
                    return (
                      <div
                        key={pid}
                        className="flex items-center gap-3 border border-[#1C1B19]/14 dark:border-[#F2ECE1]/14 bg-[#F6F3EE] dark:bg-[#111110] p-2.5"
                      >
                        <img
                          src={p.cutoutImage}
                          alt={p.name}
                          className="h-12 w-10 object-contain shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onSelectProduct(pid);
                            }}
                            className="font-display text-[16px] hover:underline text-left truncate block w-full cursor-pointer"
                          >
                            {p.name}
                          </button>
                          <span className="text-[11px] opacity-65 tabular-nums">
                            {formatCurrencyAmount(p.price, prefs.currency)} &middot; {p.volume}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              onInspect3D(pid);
                            }}
                            title="Inspect in 3D Studio"
                            className="inline-flex h-7 w-7 items-center justify-center border border-[#1C1B19]/20 dark:border-[#F2ECE1]/20 hover:border-[#B6975C] cursor-pointer"
                          >
                            <Box className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onAddToBag(pid)}
                            className="border border-[#1C1B19] bg-[#1C1B19] dark:border-[#CFAF70] dark:bg-[#CFAF70] dark:text-[#111110] px-2.5 py-1 text-[10px] tracking-[0.14em] uppercase text-[#F6F3EE] cursor-pointer"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {msg.suggestedAction === 'open_ritual_builder' && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenRitualBuilder();
                      }}
                      className="inline-flex items-center gap-1.5 text-[10.5px] tracking-[0.16em] uppercase text-[#8E7760] dark:text-[#CFAF70] hover:underline cursor-pointer pt-1"
                    >
                      <Layers className="h-3.5 w-3.5" />
                      Open Travertine Ritual Builder &rarr;
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <p className="text-[12px] italic opacity-65">Consulting SOMA FACE atelier archive…</p>
          )}
          {errorMsg && (
            <p className="text-[12px] text-[#9E3C2B] dark:text-[#F09A8A]" role="alert">
              {errorMsg}
            </p>
          )}
          <div ref={endRef} />
        </div>

        {/* Starter Prompts + Input Bar */}
        <div className="border-t border-[#1C1B19]/12 dark:border-[#F2ECE1]/12 p-4 space-y-3 bg-[#EAE3D7]/45 dark:bg-[#111110]">
          <div className="flex flex-wrap gap-1.5">
            {STARTER_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => sendMessage(prompt)}
                className="border border-[#1C1B19]/15 dark:border-[#F2ECE1]/18 px-2.5 py-1 text-[11px] font-light hover:border-[#B6975C] transition-colors cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleVoiceInput}
              aria-label={listening ? 'Stop voice input' : 'Start voice input'}
              title="Voice Input"
              className={`inline-flex h-10 w-10 shrink-0 items-center justify-center border transition-colors cursor-pointer ${
                listening
                  ? 'border-[#B6975C] bg-[#B6975C] text-[#111110]'
                  : 'border-[#1C1B19]/22 dark:border-[#F2ECE1]/22 hover:border-[#B6975C]'
              }`}
            >
              {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t.conciergePlaceholder}
              className="flex-1 border border-[#1C1B19]/22 dark:border-[#F2ECE1]/22 bg-[#F6F3EE] dark:bg-[#1B1A18] px-3.5 py-2.5 text-[13px] outline-none focus:border-[#B6975C]"
            />

            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label={t.send}
              className="inline-flex h-10 px-4 items-center justify-center gap-1.5 border border-[#1C1B19] bg-[#1C1B19] dark:border-[#CFAF70] dark:bg-[#CFAF70] dark:text-[#111110] text-[11px] font-medium tracking-[0.15em] uppercase text-[#F6F3EE] disabled:opacity-45 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
