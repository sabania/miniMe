// Shared UI primitives used across Settings, Scheduler, and other pages

export function Row({ label, children }: { label: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-sm text-zinc-300">{label}</span>
      {children}
    </div>
  )
}

export function PillGroup({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <div className="flex gap-1">{children}</div>
}

export function Pill({ active, onClick, title, children }: { active: boolean; onClick: () => void; title?: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150 ${
        active
          ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
          : 'bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:border-zinc-600/80 hover:text-zinc-300'
      }`}
    >
      {children}
    </button>
  )
}

export function Toggle({ checked, onChange, title, small }: { checked: boolean; onChange: (next: boolean) => void; title?: string; small?: boolean }): React.JSX.Element {
  const w = small ? 'w-7 h-4' : 'w-9 h-5'
  const dot = small ? 'h-3 w-3' : 'h-4 w-4'
  const translate = small ? 'translate-x-3' : 'translate-x-4'
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      title={title}
      className={`relative ${w} rounded-full transition-colors duration-150 shrink-0 ${checked ? 'bg-blue-600' : 'bg-zinc-700'}`}
    >
      <div className={`absolute top-0.5 ${dot} rounded-full bg-white shadow-sm transition-transform duration-150 ${checked ? translate : 'translate-x-0.5'}`} />
    </button>
  )
}
