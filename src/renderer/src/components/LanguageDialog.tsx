import { useState } from 'react'

interface Props {
  onSelect: (lang: 'de' | 'en') => void
}

export function LanguageDialog({ onSelect }: Props): React.JSX.Element {
  const [selected, setSelected] = useState<'de' | 'en' | null>(null)

  const handleConfirm = (): void => {
    if (selected) onSelect(selected)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-[360px] rounded-xl border border-zinc-700/80 bg-zinc-900 p-6 shadow-2xl">
        <h2 className="text-center text-base font-semibold text-zinc-100">
          Choose Language / Sprache waehlen
        </h2>
        <p className="mt-1.5 text-center text-xs text-zinc-500">
          This sets the language for workspace templates.
          <br />
          Dies legt die Sprache der Workspace-Templates fest.
        </p>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={() => setSelected('de')}
            className={`flex-1 rounded-lg border-2 px-4 py-3 text-center transition-all ${
              selected === 'de'
                ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                : 'border-zinc-700 bg-zinc-800/60 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800'
            }`}
          >
            <div className="text-2xl">&#x1F1E9;&#x1F1EA;</div>
            <div className="mt-1 text-sm font-medium">Deutsch</div>
          </button>

          <button
            type="button"
            onClick={() => setSelected('en')}
            className={`flex-1 rounded-lg border-2 px-4 py-3 text-center transition-all ${
              selected === 'en'
                ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                : 'border-zinc-700 bg-zinc-800/60 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800'
            }`}
          >
            <div className="text-2xl">&#x1F1EC;&#x1F1E7;</div>
            <div className="mt-1 text-sm font-medium">English</div>
          </button>
        </div>

        <button
          type="button"
          onClick={handleConfirm}
          disabled={!selected}
          className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-30"
        >
          {selected === 'de' ? 'Weiter' : selected === 'en' ? 'Continue' : 'Select / Waehlen'}
        </button>
      </div>
    </div>
  )
}
