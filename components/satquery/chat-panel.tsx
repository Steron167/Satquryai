"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowUp, Sparkles, User, Target, Layers, X, Maximize2, Minimize2 } from "lucide-react"
import { SAMPLE_QUERIES, SCENES } from "@/lib/satquery-data"
import { ResponseCard } from "./response-card"
import type { ChatMessage, SelectedArea } from "./types"

interface ChatPanelProps {
  messages: ChatMessage[]
  isThinking: boolean
  onSend: (text: string) => void
  activeSceneId?: string
  activeAOI?: SelectedArea | null
  onClearAOI?: () => void
  isExpanded?: boolean
  onToggleExpand?: () => void
}

export function ChatPanel({
  messages,
  isThinking,
  onSend,
  activeSceneId = "godavari",
  activeAOI,
  onClearAOI,
  isExpanded,
  onToggleExpand,
}: ChatPanelProps) {
  const [value, setValue] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, isThinking])

  function submit() {
    const text = value.trim()
    if (!text || isThinking) return
    onSend(text)
    setValue("")
  }

  // Scene or Sub-area tailored suggestion prompts
  const getSuggestions = () => {
    if (activeAOI) {
      return [
        `What is the dominant land cover inside this selected area (~${activeAOI.areaKm2} km²)?`,
        `Detect water bodies, ponds, and channels in this sub-region`,
        `Evaluate vegetation vigor & crop canopy health (NDVI) here`,
        `Identify and count any built structures or settlements in this box`,
      ]
    }

    switch (activeSceneId) {
      case "brahmaputra":
        return [
          "Use SAR radar to delineate flood extent through monsoon clouds",
          "Identify submerged grassland corridors and erosion",
          "Compare optical vs SAR operational advantages here",
        ]
      case "bhadla":
        return [
          "Detect and count solar panel arrays across the desert",
          "Classify arid vs built-up infrastructure (LULC)",
          "Assess dust and sand encroachment risks on panels",
        ]
      case "sundarbans":
        return [
          "Analyze mangrove canopy health and vigor using NDVI",
          "Delineate tidal creek water channels and mudflats",
          "Assess storm surge buffer vulnerability",
        ]
      default:
        return SAMPLE_QUERIES.map((q) => q.label)
    }
  }

  const suggestions = getSuggestions()

  return (
    <section className="flex h-full w-full flex-col border-l border-border bg-sidebar select-none">
      {/* Panel Header */}
      <div className="border-b border-border px-4 py-3 bg-sidebar">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-semibold">Vision-Language Assistant</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded">
              Multimodal VLM
            </span>
            {onToggleExpand && (
              <button
                type="button"
                onClick={onToggleExpand}
                className="hidden lg:flex items-center justify-center size-6 rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border border-border/60 hover:border-border"
                title={isExpanded ? "Standard width" : "Expand chat width"}
              >
                {isExpanded ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
              </button>
            )}
          </div>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Ask natural-language queries across Optical & SAR observations.
        </p>
      </div>

      {/* Messages Feed */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className={`flex max-w-[92%] gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div
                className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md shadow-sm ${
                  m.role === "user" ? "bg-secondary text-foreground" : "bg-primary/20 text-primary"
                }`}
              >
                {m.role === "user" ? (
                  <User className="size-3.5" aria-hidden="true" />
                ) : (
                  <Sparkles className="size-3.5" aria-hidden="true" />
                )}
              </div>
              <div
                className={`rounded-lg px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground font-medium"
                    : "border border-border bg-card text-card-foreground"
                }`}
              >
                {m.aoi && (
                  <div className="mb-1.5 inline-flex items-center gap-1.5 rounded bg-cyan-950/80 px-2 py-0.5 font-mono text-[9px] font-semibold text-cyan-300 border border-cyan-500/40 shadow-sm">
                    <Target className="size-3 text-cyan-400" />
                    <span>Targeted ROI Focus (~{m.aoi.areaKm2} km²)</span>
                  </div>
                )}
                <p className="text-pretty">{m.text}</p>

                {/* Grounding and Recommended Layer Badges */}
                {m.role === "assistant" && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
                    {m.boundingBoxes && m.boundingBoxes.length > 0 && (
                      <span className="inline-flex items-center gap-1 rounded bg-accent/15 px-2 py-0.5 text-accent border border-accent/30 font-semibold">
                        <Target className="size-3" /> {m.boundingBoxes.length} Objects Localized
                      </span>
                    )}
                    {m.recommendedLayer && (
                      <span className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-muted-foreground border border-border">
                        <Layers className="size-3 text-primary" /> Display: {m.recommendedLayer.toUpperCase()}
                      </span>
                    )}
                  </div>
                )}

                {m.card && <ResponseCard card={m.card} />}

                {m.sources && m.sources.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5 pt-1.5 border-t border-border/50">
                    {m.sources.map((s) => {
                      const isGroq = s.toLowerCase().includes("groq")
                      const isTavily = s.toLowerCase().includes("tavily")
                      const isGemini = s.toLowerCase().includes("gemini")
                      return (
                        <span
                          key={s}
                          className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[9px] ${
                            isGroq
                              ? "border-amber-500/40 bg-amber-950/40 text-amber-300 font-semibold"
                              : isTavily
                                ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-300 font-semibold"
                                : isGemini
                                  ? "border-blue-500/40 bg-blue-950/40 text-blue-300 font-semibold"
                                  : "border-border bg-background/60 text-muted-foreground"
                          }`}
                        >
                          {isGroq && "⚡ "}
                          {isTavily && "🌐 "}
                          {isGemini && "✨ "}
                          {s}
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="flex justify-start">
            <div className="flex gap-2">
              <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/20 text-primary">
                <Sparkles className="size-3.5" aria-hidden="true" />
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-3 shadow-sm">
                <span className="size-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                <span className="size-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                <span className="size-2 animate-bounce rounded-full bg-primary" />
                <span className="ml-1.5 font-mono text-[11px] text-muted-foreground">
                  Cross-referencing Sentinel-1 SAR + Sentinel-2 Optical…
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Suggested Queries */}
      <div className="border-t border-border px-4 pt-3 bg-sidebar">
        <div className="flex items-center justify-between mb-1.5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Suggested Remote Sensing Queries
          </p>
          <span className="font-mono text-[9px] text-muted-foreground">
            {SCENES[activeSceneId]?.name || "Scene Context"}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
          {suggestions.map((label, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isThinking}
              onClick={() => onSend(label)}
              className="rounded-full border border-border bg-card px-2.5 py-1 text-left text-[11px] text-muted-foreground transition-all hover:border-primary/50 hover:text-foreground hover:bg-accent/5 disabled:opacity-50"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Area Focus Active Banner */}
      {activeAOI && (
        <div className="mx-4 mt-2 -mb-2 flex items-center justify-between rounded-lg border border-cyan-500/40 bg-cyan-950/50 p-2 text-xs text-cyan-200 backdrop-blur-md shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-cyan-400 animate-ping" />
            <div className="leading-tight">
              <span className="font-semibold text-cyan-300">Constrained to Sub-Area: </span>
              <span className="font-mono font-bold text-white">~{activeAOI.areaKm2} km²</span>
              <span className="hidden sm:inline font-mono text-[10px] text-cyan-400/80 ml-1.5">
                ({activeAOI.bounds.south.toFixed(3)}°N, {activeAOI.bounds.west.toFixed(3)}°E to {activeAOI.bounds.north.toFixed(3)}°N, {activeAOI.bounds.east.toFixed(3)}°E)
              </span>
            </div>
          </div>
          {onClearAOI && (
            <button
              type="button"
              onClick={onClearAOI}
              title="Clear area focus and return to whole scene"
              className="ml-2 flex items-center gap-1 rounded bg-cyan-900/80 px-2 py-0.5 text-[10px] font-medium text-cyan-300 hover:bg-cyan-800 hover:text-white transition-colors"
            >
              <X className="size-3" />
              <span>Exit ROI</span>
            </button>
          )}
        </div>
      )}

      {/* Query Input Box */}
      <div className="p-4 bg-sidebar">
        <div className="flex items-end gap-2 rounded-lg border border-border bg-card p-2 shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/50 transition-all">
          <textarea
            rows={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                e.preventDefault()
                submit()
              }
            }}
            placeholder={
              activeAOI
                ? `Ask specifically about this selected sub-area (~${activeAOI.areaKm2} km²)...`
                : "Ask anything (e.g., 'Detect inundated farm parcels' or 'Classify LULC')..."
            }
            className="max-h-24 flex-1 resize-none bg-transparent px-1.5 py-1 text-xs outline-none placeholder:text-muted-foreground text-foreground"
          />
          <button
            type="button"
            onClick={submit}
            disabled={isThinking || !value.trim()}
            aria-label="Send query"
            className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:opacity-40"
          >
            <ArrowUp className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  )
}
