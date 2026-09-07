"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import {
  ArrowUp,
  Sparkles,
  User,
  Target,
  Layers,
  X,
  Maximize2,
  Minimize2,
  ChevronDown,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
} from "lucide-react"
import { SAMPLE_QUERIES, SCENES } from "@/lib/satquery-data"
import { ResponseCard } from "./response-card"
import { VoiceService } from "@/lib/voice-service"
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
  onCloseMobileDrawer?: () => void
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
  onCloseMobileDrawer,
}: ChatPanelProps) {
  const [value, setValue] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [speechLang, setSpeechLang] = useState<"hi-IN" | "en-IN">("hi-IN")
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const [activeSpeakingId, setActiveSpeakingId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const stopListeningRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, isThinking])

  // Stop voice recognition on unmount
  useEffect(() => {
    return () => {
      VoiceService.stopListening()
      VoiceService.stopSpeaking()
    }
  }, [])

  function submit(customText?: string) {
    const text = (customText ?? value).trim()
    if (!text || isThinking) return
    VoiceService.stopSpeaking()
    setActiveSpeakingId(null)
    onSend(text)
    setValue("")
  }

  const toggleListening = useCallback(() => {
    if (isListening) {
      VoiceService.stopListening()
      if (stopListeningRef.current) stopListeningRef.current()
      setIsListening(false)
      return
    }

    setVoiceError(null)
    setIsListening(true)

    const stopFn = VoiceService.startListening({
      lang: speechLang,
      onResult: (text: string, isFinal: boolean) => {
        setValue(text)
        if (isFinal && text.trim().length > 2) {
          setIsListening(false)
        }
      },
      onError: (err: string) => {
        setVoiceError(err)
        setIsListening(false)
      },
      onEnd: () => {
        setIsListening(false)
      },
    })

    stopListeningRef.current = stopFn
  }, [isListening, speechLang])

  const handleSpeakMessage = useCallback((msgId: string, text: string) => {
    if (activeSpeakingId === msgId) {
      VoiceService.stopSpeaking()
      setActiveSpeakingId(null)
    } else {
      setActiveSpeakingId(msgId)
      VoiceService.speak(
        text,
        () => setActiveSpeakingId(msgId),
        () => setActiveSpeakingId(null)
      )
    }
  }, [activeSpeakingId])

  // Scene or Sub-area tailored suggestion prompts (Bilingual Indian Farmer Friendly)
  const getSuggestions = () => {
    if (activeAOI) {
      return [
        "🌾 फसल की सेहत और हरियाली कैसी है?",
        "💧 क्या इस खेत में पानी भरा हुआ है?",
        "🌱 Fasal ki tabiyat aur upaj (NDVI Crop Vigor)",
        "📋 बीमा क्लेम रिपोर्ट के लिए स्थिति बताएं",
        `Dominant land cover in ~${activeAOI.areaKm2} km² parcel`,
      ]
    }

    switch (activeSceneId) {
      case "brahmaputra":
        return [
          "🌾 खेत में बाढ़ का पानी कितना है?",
          "💧 Delineate inundated lowlands (SAR radar)",
          "🌱 Assess crop loss due to river overflow",
        ]
      case "bhadla":
        return [
          "Solar panel arrays count and dust impact",
          "Land classification and barren vs built terrain",
        ]
      case "wayanad":
        return [
          "🏔️ भूस्खलन और मिट्टी कटाव की जांच करें",
          "Assess steep slope soil saturation and rainfall impact",
        ]
      default:
        return [
          "🌾 खेत में फसल की सेहत कैसी है?",
          "💧 क्या खेत में कहीं पानी भरा है?",
          "🌱 Fasal ka greenness index (NDVI)",
          "📋 पीएम फसल बीमा क्लेम रिपोर्ट तैयार करें",
          "🇮🇳 उपग्रह से जमीन का वर्गीकरण (LULC)",
          ...SAMPLE_QUERIES.map((q) => q.label),
        ]
    }
  }

  const suggestions = getSuggestions()

  return (
    <section className="flex h-full w-full flex-col border-l border-border bg-sidebar select-none">
      {/* Panel Header */}
      <div className="border-b border-border px-3.5 py-2.5 bg-sidebar shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Sparkles className="size-3.5" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-xs font-bold text-foreground">Kisan AI Assistant</h2>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded font-mono font-semibold">
                  Bilingual Voice
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                बोलकर या लिखकर पूछें · Hindi & English
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
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
            {onCloseMobileDrawer && (
              <button
                type="button"
                onClick={onCloseMobileDrawer}
                className="flex lg:hidden items-center justify-center size-7 rounded-full bg-secondary text-foreground hover:bg-muted transition-colors cursor-pointer"
                title="Minimize chat drawer"
              >
                <ChevronDown className="size-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Messages Feed */}
      <div ref={scrollRef} className="flex-1 space-y-3.5 overflow-y-auto p-3 sm:p-4 min-h-0">
        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className={`flex max-w-[94%] sm:max-w-[90%] gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
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
                className={`rounded-xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed shadow-sm ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground font-medium"
                    : "border border-border bg-card text-card-foreground"
                }`}
              >
                {m.aoi && (
                  <div className="mb-1.5 inline-flex items-center gap-1.5 rounded bg-cyan-950/80 px-2 py-0.5 font-mono text-[9px] font-semibold text-cyan-300 border border-cyan-500/40 shadow-sm">
                    <Target className="size-3 text-cyan-400" />
                    <span>Targeted Parcel Focus (~{m.aoi.areaKm2} km²)</span>
                  </div>
                )}
                <p className="text-pretty whitespace-pre-line">{m.text}</p>

                {/* Speaker Audio Listen Button & Grounding Badges for Assistant */}
                {m.role === "assistant" && (
                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40">
                    <button
                      type="button"
                      onClick={() => handleSpeakMessage(m.id || "msg", m.text)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all cursor-pointer ${
                        activeSpeakingId === (m.id || "msg")
                          ? "bg-amber-500 text-slate-950 font-bold animate-pulse shadow-sm"
                          : "bg-secondary/90 text-foreground hover:bg-primary/15 hover:text-primary border border-border"
                      }`}
                      title={activeSpeakingId === (m.id || "msg") ? "Stop Audio" : "Listen (बोलकर सुनें)"}
                    >
                      {activeSpeakingId === (m.id || "msg") ? (
                        <>
                          <VolumeX className="size-3.5" />
                          <span>बोलना रोकें (Stop)</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="size-3.5 text-primary" />
                          <span>🔊 सुनें (Listen)</span>
                        </>
                      )}
                    </button>

                    <div className="flex flex-wrap items-center gap-1 font-mono text-[9px]">
                      {m.boundingBoxes && m.boundingBoxes.length > 0 && (
                        <span className="inline-flex items-center gap-1 rounded bg-accent/15 px-1.5 py-0.5 text-accent border border-accent/30 font-semibold">
                          <Target className="size-2.5" /> {m.boundingBoxes.length} Objects Localized
                        </span>
                      )}
                      {m.boundingBoxes && m.boundingBoxes.length > 0 && onClearAOI && (
                        <button
                          type="button"
                          onClick={onClearAOI}
                          className="inline-flex items-center gap-1 rounded bg-rose-500/20 hover:bg-rose-500/35 text-rose-300 border border-rose-500/40 px-2 py-0.5 text-[10px] font-semibold transition-colors cursor-pointer"
                          title="Clear markings from map"
                        >
                          <X className="size-2.5 text-rose-400" />
                          <span>Clear Marks (हटाएं)</span>
                        </button>
                      )}
                      {m.recommendedLayer && (
                        <span className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-muted-foreground border border-border">
                          <Layers className="size-2.5 text-primary" /> {m.recommendedLayer.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {m.card && <ResponseCard card={m.card} />}

                {m.sources && m.sources.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1 pt-1.5 border-t border-border/50">
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
                <Sparkles className="size-3.5 animate-spin" aria-hidden="true" />
              </div>
              <div className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2.5 shadow-sm">
                <span className="size-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
                <span className="size-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
                <span className="size-2 animate-bounce rounded-full bg-primary" />
                <span className="ml-1.5 font-mono text-[11px] text-muted-foreground">
                  उपग्रह डेटा का विश्लेषण हो रहा है (Analyzing Sentinel-1 SAR + Sentinel-2)...
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Suggested Queries */}
      <div className="border-t border-border px-3.5 pt-2.5 pb-1 bg-sidebar shrink-0">
        <div className="flex items-center justify-between mb-1">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            🌾 किसान त्वरित सवाल (Quick Queries)
          </p>
          <span className="font-mono text-[9px] text-muted-foreground">
            {SCENES[activeSceneId]?.name || "Scene Context"}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto pb-1">
          {suggestions.map((label, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isThinking}
              onClick={() => onSend(label)}
              className="rounded-full border border-border bg-card px-2.5 py-0.5 text-left text-[11px] text-muted-foreground transition-all hover:border-primary/50 hover:text-foreground hover:bg-accent/5 disabled:opacity-50 cursor-pointer"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Area Focus Active Banner */}
      {activeAOI && (
        <div className="mx-3.5 mt-1 -mb-1 flex items-center justify-between rounded-lg border border-cyan-500/40 bg-cyan-950/50 p-2 text-xs text-cyan-200 backdrop-blur-md shadow-sm animate-in fade-in shrink-0">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-cyan-400 animate-ping" />
            <div className="leading-tight">
              <span className="font-semibold text-cyan-300">चयनित खेत (Field Area): </span>
              <span className="font-mono font-bold text-white">~{activeAOI.areaKm2} km²</span>
            </div>
          </div>
          {onClearAOI && (
            <button
              type="button"
              onClick={onClearAOI}
              title="Clear area focus and return to whole scene"
              className="ml-2 flex items-center gap-1.5 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 border border-rose-500/50 px-2.5 py-1 text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 whitespace-nowrap"
            >
              <X className="size-3 text-rose-300" />
              <span>✕ निशान हटाएं (Clear)</span>
            </button>
          )}
        </div>
      )}

      {/* Active Voice Listening Banner */}
      {isListening && (
        <div className="mx-3.5 mt-2 flex items-center justify-between gap-2 rounded-lg bg-red-500/20 border border-red-500/50 px-3 py-1.5 text-xs text-red-200 animate-pulse shadow-lg shrink-0">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-red-500 animate-ping" />
            <span className="font-bold">
              {speechLang === "hi-IN" ? "🎙️ सुन रहा हूँ... अपनी भाषा में बोलिए" : "🎙️ Listening... Speak your query"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => VoiceService.stopListening()}
            className="text-[10px] bg-red-500 px-2 py-0.5 rounded text-white font-bold cursor-pointer hover:bg-red-600"
          >
            पूर्ण (Done)
          </button>
        </div>
      )}

      {voiceError && (
        <div className="mx-3.5 mt-1 text-[11px] text-red-400 bg-red-950/40 border border-red-800/40 rounded px-2.5 py-1">
          {voiceError}
        </div>
      )}

      {/* Query Input Box with Microphone and Language Toggle */}
      <div className="p-3 sm:p-4 bg-sidebar shrink-0">
        <div className="flex items-end gap-1.5 sm:gap-2 rounded-xl border border-border bg-card p-1.5 sm:p-2 shadow-sm focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/50 transition-all">
          {/* Language Toggle Button */}
          <button
            type="button"
            onClick={() => setSpeechLang((prev) => (prev === "hi-IN" ? "en-IN" : "hi-IN"))}
            className="h-8 rounded-lg border border-border bg-secondary/80 px-2 text-[10px] font-bold text-muted-foreground hover:text-foreground hover:bg-secondary transition-all cursor-pointer shrink-0"
            title="भाषा बदलें / Change voice input language"
          >
            {speechLang === "hi-IN" ? "🇮🇳 हिन्दी" : "🌐 EN"}
          </button>

          {/* Voice Mic Button */}
          <button
            type="button"
            onClick={toggleListening}
            className={`flex size-8 shrink-0 items-center justify-center rounded-lg border transition-all cursor-pointer ${
              isListening
                ? "bg-red-500 text-white border-red-400 ring-2 ring-red-400/50 animate-pulse shadow-md"
                : "border-border bg-secondary text-foreground hover:bg-primary/20 hover:text-primary hover:border-primary/40"
            }`}
            title={isListening ? "Listening... Click to stop" : "बोलकर पूछें (Voice Mic)"}
          >
            {isListening ? <MicOff className="size-4" /> : <Mic className="size-4 text-primary" />}
          </button>

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
              isListening
                ? "बोलिए... आवाज़ रिकॉर्ड हो रही है..."
                : activeAOI
                  ? `इस खेत (~${activeAOI.areaKm2} km²) के बारे में पूछें...`
                  : "सवाल पूछें (उदा: 'खेत में पानी भरा है क्या?' या 'फसल की सेहत')..."
            }
            className="max-h-24 flex-1 resize-none bg-transparent px-1.5 py-1 text-xs outline-none placeholder:text-muted-foreground text-foreground"
          />

          <button
            type="button"
            onClick={() => submit()}
            disabled={isThinking || !value.trim()}
            aria-label="Send query"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm transition-all hover:bg-primary/90 disabled:opacity-40 cursor-pointer"
          >
            <ArrowUp className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  )
}
