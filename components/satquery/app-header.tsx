"use client"

import { Satellite, Circle, FileText, Cpu, PanelLeftOpen, PanelLeftClose, Play, Square } from "lucide-react"

interface AppHeaderProps {
  onOpenBenchmark?: () => void
  onOpenReport?: () => void
  isLeftPanelOpen?: boolean
  onToggleLeftPanel?: () => void
  onStartDemo?: () => void
  isDemoRunning?: boolean
}

export function AppHeader({
  onOpenBenchmark,
  onOpenReport,
  isLeftPanelOpen,
  onToggleLeftPanel,
  onStartDemo,
  isDemoRunning,
}: AppHeaderProps) {
  return (
    <header className="relative z-40 flex items-center justify-between gap-4 border-b border-border bg-sidebar px-4 py-2.5 select-none shadow-sm">
      <div className="flex items-center gap-2.5 sm:gap-3">
        {onToggleLeftPanel && (
          <button
            type="button"
            onClick={onToggleLeftPanel}
            className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              isLeftPanelOpen
                ? "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary"
                : "border-primary/50 bg-primary/15 text-primary shadow-sm ring-1 ring-primary/30 animate-pulse"
            }`}
            title={isLeftPanelOpen ? "Collapse Scene Sidebar" : "Expand Scene Sidebar"}
          >
            {isLeftPanelOpen ? (
              <PanelLeftClose className="size-4" />
            ) : (
              <PanelLeftOpen className="size-4 text-primary" />
            )}
            <span className="hidden sm:inline">
              {isLeftPanelOpen ? "Hide Scenes" : "Show Scenes"}
            </span>
          </button>
        )}

        <div className="flex size-9 items-center justify-center rounded-md bg-primary/15 ring-1 ring-primary/30 shadow-sm">
          <Satellite className="size-5 text-primary" aria-hidden="true" />
        </div>
        <div className="leading-tight">
          <h1 className="text-sm font-semibold tracking-tight">
            SatQuery <span className="text-primary">AI</span>
          </h1>
        </div>
      </div>

      {/* Center Status Badge */}
      <div className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-1 lg:flex shadow-sm">
        <Circle className="size-2 animate-pulse fill-emerald-400 text-emerald-400" aria-hidden="true" />
        <span className="font-mono text-[11px] text-muted-foreground">
          SatQuery-VLM Dual-Stream · BigEarthNet-MM · Online
        </span>
      </div>

      {/* Action Buttons & ISRO Badge */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {onStartDemo && (
          <button
            type="button"
            onClick={onStartDemo}
            className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-bold transition-all shadow-sm cursor-pointer ${
              isDemoRunning
                ? "border-amber-500/80 bg-amber-500/25 text-amber-300 ring-2 ring-amber-500/50 animate-pulse"
                : "border-emerald-500/60 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 ring-1 ring-emerald-500/30"
            }`}
            title="Automated 30-Second Live Demonstration for Judges"
          >
            {isDemoRunning ? (
              <Square className="size-3.5 fill-current" />
            ) : (
              <Play className="size-3.5 fill-current" />
            )}
            <span className="whitespace-nowrap">{isDemoRunning ? "Stop Demo" : "▶ Judges Demo"}</span>
          </button>
        )}

        {onOpenBenchmark && (
          <button
            type="button"
            onClick={onOpenBenchmark}
            className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
          >
            <Cpu className="size-3.5 text-primary" />
            <span className="hidden sm:inline">Benchmarks</span>
          </button>
        )}

        {onOpenReport && (
          <button
            type="button"
            onClick={onOpenReport}
            className="flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors shadow-sm"
          >
            <FileText className="size-3.5" />
            <span className="hidden sm:inline">Export Report</span>
          </button>
        )}

        <div className="hidden text-right md:block pl-2 border-l border-border">
          <p className="text-xs font-medium text-foreground">ISRO — Dept. of Space</p>
        </div>

        <div className="flex size-8 items-center justify-center rounded-md border border-border bg-card font-mono text-xs font-semibold text-primary shadow-sm">
          IN
        </div>
      </div>
    </header>
  )
}
