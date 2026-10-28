import { useState } from 'react'
import { BACKGROUND_OPTIONS, DEFAULT_BACKGROUND, applyBackground, restoreBackground, saveBackground, type BackgroundSettings } from '../lib/background'
import { Button } from './UI'
import { cn } from '../lib/cn'

/** منتقي خلفيات زخرفية لا يغطي النصوص والبطاقات، ويحفظ الاختيار محليًا. */
export function BackgroundPicker() {
  const [background, setBackground] = useState<BackgroundSettings>(restoreBackground)

  const change = (next: BackgroundSettings) => {
    setBackground(next)
    applyBackground(next)
    saveBackground(next)
  }

  return (
    <section className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700" aria-labelledby="background-heading">
      <div>
        <h3 id="background-heading" className="text-sm font-bold text-slate-800 dark:text-slate-100">
          خلفية الموقع
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          اختر زخارف ترتبط بالتعليم، وتتوافق تلقائيًا مع لون الموقع والوضع الداكن.
        </p>
      </div>

      <div role="radiogroup" aria-labelledby="background-heading" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {BACKGROUND_OPTIONS.map((option) => {
          const selected = background.pattern === option.id
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => change({ ...background, pattern: option.id })}
              className={cn(
                'min-w-0 rounded-xl border p-2 text-start transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
                selected
                  ? 'border-brand-600 bg-brand-50 dark:border-brand-400 dark:bg-brand-900/30'
                  : 'border-slate-200 bg-white hover:border-brand-300 dark:border-slate-600 dark:bg-slate-800 dark:hover:border-brand-500',
              )}
            >
              <span
                data-background={option.id}
                className="background-preview relative mb-2 flex h-20 w-full items-center justify-center overflow-hidden rounded-lg border border-slate-100 bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
                aria-hidden="true"
              >
                <span className="relative z-10 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
                  معلّم بلس
                </span>
              </span>
              <span className="block text-xs font-semibold text-slate-800 dark:text-slate-100">{option.label}</span>
              <span className="mt-1 block text-[11px] text-slate-500 dark:text-slate-400">{option.description}</span>
            </button>
          )
        })}
      </div>

      <div className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-900/40">
        <div className="mb-2 flex items-center justify-between gap-2">
          <label htmlFor="background-intensity" className="text-sm font-medium text-slate-700 dark:text-slate-200">
            وضوح الزخارف
          </label>
          <output htmlFor="background-intensity" className="text-sm font-semibold tabular-nums text-brand-700 dark:text-brand-300">
            {background.intensity}%
          </output>
        </div>
        <input
          id="background-intensity"
          type="range"
          min={0}
          max={35}
          step={5}
          disabled={background.pattern === 'none'}
          value={background.intensity}
          onChange={(event) => change({ ...background, intensity: Number(event.target.value) })}
          className="w-full cursor-pointer accent-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
        />
        <div className="mt-1 flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>أخف</span>
          <span>أوضح</span>
        </div>
      </div>

      <Button variant="outline" size="sm" onClick={() => change({ ...DEFAULT_BACKGROUND })}>
        استعادة الخلفية الافتراضية
      </Button>
    </section>
  )
}
