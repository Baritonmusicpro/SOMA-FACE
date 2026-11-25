import { SceneIndex } from '../motion/stageMath';

interface SceneIndicatorProps {
  activeScene: SceneIndex;
  onSelectScene: (scene: SceneIndex) => void;
}

const SCENE_LABELS: readonly { index: SceneIndex; numeral: string; title: string }[] = [
  { index: 0, numeral: '01', title: 'The Essence' },
  { index: 1, numeral: '02', title: 'The Formula' },
  { index: 2, numeral: '03', title: 'The Ritual' },
  { index: 3, numeral: '04', title: 'The Collection' },
];

export function SceneIndicator({ activeScene, onSelectScene }: SceneIndicatorProps) {
  const isLight = activeScene === 2 || activeScene === 3;

  return (
    <>
      {/* Desktop right-edge minimal 4-step scene indicator */}
      <aside
        aria-label="Scene navigation"
        className="fixed right-6 lg:right-9 top-1/2 -translate-y-1/2 z-30 hidden md:flex flex-col items-end gap-5"
      >
        {SCENE_LABELS.map((item) => {
          const active = activeScene === item.index;
          return (
            <button
              key={item.index}
              type="button"
              onClick={() => onSelectScene(item.index)}
              aria-label={`Scene ${item.numeral}: ${item.title}`}
              aria-current={active ? 'step' : undefined}
              className="group flex items-center gap-3 py-1 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#B89A65]"
            >
              <span
                className={`text-[10.5px] tracking-[0.18em] uppercase transition-all duration-500 ${
                  active
                    ? isLight
                      ? 'opacity-95 text-[#F5F0E8]'
                      : 'opacity-95 text-[#30251F]'
                    : isLight
                      ? 'opacity-0 group-hover:opacity-75 text-[#F5F0E8]'
                      : 'opacity-0 group-hover:opacity-75 text-[#30251F]'
                }`}
              >
                {item.title}
              </span>
              <span
                className={`block h-[1.5px] transition-all duration-500 ${
                  active
                    ? isLight
                      ? 'w-8 bg-[#B89A65]'
                      : 'w-8 bg-[#30251F]'
                    : isLight
                      ? 'w-3.5 bg-[#F5F0E8]/40 group-hover:w-5 group-hover:bg-[#F5F0E8]/75'
                      : 'w-3.5 bg-[#30251F]/30 group-hover:w-5 group-hover:bg-[#30251F]/65'
                }`}
              />
            </button>
          );
        })}
      </aside>

      {/* Mobile compact bottom 4-step indicator */}
      <div
        aria-label="Scene progress"
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 flex md:hidden items-center gap-3 px-3 py-1.5"
      >
        {SCENE_LABELS.map((item) => {
          const active = activeScene === item.index;
          return (
            <button
              key={item.index}
              type="button"
              onClick={() => onSelectScene(item.index)}
              aria-label={`Go to ${item.title}`}
              aria-current={active ? 'step' : undefined}
              className="flex h-8 w-8 items-center justify-center cursor-pointer"
            >
              <span
                className={`block h-[2px] transition-all duration-500 ${
                  active
                    ? isLight
                      ? 'w-7 bg-[#B89A65]'
                      : 'w-7 bg-[#30251F]'
                    : isLight
                      ? 'w-3 bg-[#F5F0E8]/35'
                      : 'w-3 bg-[#30251F]/30'
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Subtle animated scroll indicator on Scene 1 */}
      <div
        aria-hidden={activeScene !== 0}
        className={`fixed bottom-7 left-1/2 -translate-x-1/2 z-30 hidden md:flex flex-col items-center gap-2.5 pointer-events-none transition-opacity duration-700 ${
          activeScene === 0 ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <span className="text-[10px] tracking-[0.24em] uppercase text-[#30251F]/70">Scroll</span>
        <span className="relative h-9 w-px overflow-hidden bg-[#30251F]/20">
          <span className="animate-scroll-line absolute inset-0 bg-[#30251F]/80" />
        </span>
      </div>
    </>
  );
}
