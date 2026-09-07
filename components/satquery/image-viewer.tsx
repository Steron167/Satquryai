"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import dynamic from "next/dynamic"
import {
  Search,
  Loader2,
  MapPin,
  PanelLeftOpen,
  X,
  Hand,
  BoxSelect,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react"
import { SCENES, LAYERS, type SceneMeta, type LayerId } from "@/lib/satquery-data"
import type { ViewerState, SelectedArea } from "./types"

const DynamicLeafletMap = dynamic(
  () => import("./leaflet-map").then((mod) => mod.LeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-slate-950 text-muted-foreground font-mono text-xs">
        <Loader2 className="size-5 animate-spin text-primary mr-2" />
        Streaming High-Resolution Satellite Map...
      </div>
    ),
  }
)

interface ImageViewerProps {
  state: ViewerState
  scene?: SceneMeta
  onZoomChange?: (zoom: number) => void
  onPanChange?: (pan: { x: number; y: number }) => void
  onSelectArea?: (aoi: SelectedArea | null) => void
  onAnalyzeArea?: (aoi: SelectedArea) => void
  userCustomImage?: string | null
  onLocationSelect?: (searchedScene: SceneMeta, tileUrl: string) => void
  isLeftPanelOpen?: boolean
  onToggleLeftPanel?: () => void
  onLayerChange?: (layer: LayerId) => void
  onToggleFlood?: () => void
  onClearAllMarkings?: () => void
}

export function ImageViewer({
  state,
  scene = SCENES.godavari,
  onSelectArea,
  onAnalyzeArea,
  onLocationSelect,
  isLeftPanelOpen,
  onToggleLeftPanel,
  onLayerChange,
  onToggleFlood,
  onClearAllMarkings,
}: ImageViewerProps) {
  // Mode & navigation states
  const [toolMode, setToolMode] = useState<"navigate" | "select">("navigate")
  const [showLabels, setShowLabels] = useState(true)
  const [currentZoom, setCurrentZoom] = useState(13)
  const [mapAction, setMapAction] = useState<{
    type: "zoomIn" | "zoomOut" | "recenter"
    id: number
  } | null>(null)

  // Location search states
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<
    Array<{
      id: string
      name: string
      displayName: string
      region: string
      lat: number
      lon: number
      bounds: { north: number; south: number; east: number; west: number }
      tileUrl: string
    }>
  >([])
  const [showResults, setShowResults] = useState(false)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  // Close search dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSearch = useCallback(async (qText: string) => {
    const q = qText.trim()
    if (!q) return
    setIsSearching(true)
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`)
      if (res.ok) {
        const data = await res.json()
        if (data.results && data.results.length > 0) {
          setSearchResults(data.results)
          setShowResults(true)
        }
      }
    } catch (err) {
      console.warn("Geocoding error:", err)
    } finally {
      setIsSearching(false)
    }
  }, [])

  const handleSelectResult = useCallback(
    (result: (typeof searchResults)[0]) => {
      const searchedScene: SceneMeta = {
        id: result.id,
        name: result.name,
        region: result.region || result.displayName,
        lat: `${result.lat.toFixed(4)}° N`,
        lon: `${result.lon.toFixed(4)}° E`,
        area: "49.0 km²",
        acquired: "Live Satellite AOI Tile",
        cloud: "< 5%",
        resolution: "0.5 - 10 m / px",
        bounds: result.bounds,
        description: `High-resolution live satellite observation tile centered on ${result.displayName}. Ready for AI multimodal analysis.`,
        summary: `Satellite observation of ${result.displayName}`,
        hotspots: ["Urban / Built-up Sector", "Agricultural Parcels", "Water Drainage Corridors", "Transport Network"],
        layers: { optical: "", sar: "", ndvi: "", ndwi: "" },
      }

      if (onLocationSelect) {
        onLocationSelect(searchedScene, result.tileUrl)
      }

      setShowResults(false)
      setSearchQuery("")
    },
    [onLocationSelect]
  )

  const layerMeta = LAYERS.find((l) => l.id === state.layer) || LAYERS[0]

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-slate-950 select-none">
      {/* Dedicated High-Visibility Top Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 bg-sidebar/95 px-3 py-1.5 text-xs shadow-sm backdrop-blur-md shrink-0 relative z-30">
        {/* Left: Show Scenes Toggle (when collapsed) & Active Layer Info */}
        <div className="flex items-center gap-2">
          {!isLeftPanelOpen && onToggleLeftPanel && (
            <button
              type="button"
              onClick={onToggleLeftPanel}
              className="flex items-center gap-1.5 rounded-md border border-primary/50 bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary shadow-sm hover:bg-primary/25 transition-all cursor-pointer animate-pulse"
              title="Expand Operational Scenes & Location Panel"
            >
              <PanelLeftOpen className="size-3.5" />
              <span>Scenes</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <span
              className={`size-2 rounded-full animate-pulse ${
                state.layer === "sar"
                  ? "bg-cyan-400"
                  : state.layer === "ndvi"
                  ? "bg-emerald-400"
                  : state.layer === "ndwi"
                  ? "bg-blue-400"
                  : "bg-amber-400"
              }`}
            />
            <span className="font-semibold text-xs text-foreground">{layerMeta.label}</span>
            <span className="hidden xl:inline text-[10px] text-muted-foreground font-mono">
              ({scene.name})
            </span>
          </div>
        </div>

        {/* Center: Google Maps-Style Location Search Bar */}
        <div ref={searchContainerRef} className="relative flex items-center w-56 sm:w-72 md:w-80">
          <div className="flex w-full items-center gap-1.5 rounded-lg border border-border/80 bg-card/95 px-2.5 py-1 text-xs shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/40 transition-all">
            <Search className="size-3.5 text-primary shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                if (!e.target.value.trim()) setShowResults(false)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleSearch(searchQuery)
                }
              }}
              placeholder="Search location (e.g. Kopargaon, Shirdi)..."
              className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-xs"
            />
            {isSearching ? (
              <Loader2 className="size-3.5 animate-spin text-primary shrink-0" />
            ) : searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("")
                  setShowResults(false)
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => handleSearch(searchQuery)}
              disabled={isSearching || !searchQuery.trim()}
              className="rounded bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-all shrink-0 cursor-pointer"
            >
              Fly To
            </button>
          </div>

          {/* Autocomplete Dropdown */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-lg border border-border bg-card/98 backdrop-blur-md p-1 shadow-2xl z-50 animate-in fade-in slide-in-from-top-1">
              {searchResults.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleSelectResult(r)}
                  className="flex w-full items-start gap-2 rounded-md p-2 text-left text-xs hover:bg-muted/80 transition-colors group cursor-pointer"
                >
                  <MapPin className="size-3.5 text-primary shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                      {r.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground line-clamp-1">
                      {r.displayName}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Mode Selector (Pan / Select Area), Labels Toggle, & Zoom Quick Controls */}
        <div className="flex items-center gap-2">
          {/* Pan vs Select Area Mode Toggle */}
          <div className="flex items-center rounded-lg border border-border bg-card p-0.5 shadow-sm">
            <button
              type="button"
              onClick={() => setToolMode("navigate")}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-all cursor-pointer ${
                toolMode === "navigate"
                  ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
              title="Pan & Navigate Mode"
            >
              <Hand className="size-3.5" />
              <span className="hidden sm:inline">Pan</span>
            </button>
            <button
              type="button"
              onClick={() => setToolMode("select")}
              className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                toolMode === "select"
                  ? "bg-cyan-500 text-slate-950 font-bold shadow-sm ring-2 ring-cyan-400/40"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
              title="Click and drag on map to select and analyze an Area of Interest (AOI)"
            >
              <BoxSelect className="size-3.5" />
              <span>Select Area</span>
              {state.selectedAOI && (
                <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" />
              )}
            </button>
            {(state.selectedAOI || (state.dynamicBoxes && state.dynamicBoxes.length > 0) || state.flood) && (
              <button
                type="button"
                onClick={onClearAllMarkings}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-rose-300 hover:text-rose-100 hover:bg-rose-950/60 border border-rose-500/30 transition-all cursor-pointer"
                title="Clear all selected areas and detection boxes from map"
              >
                <X className="size-3 text-rose-400" />
                <span className="hidden sm:inline">Clear Marks</span>
              </button>
            )}
          </div>

          {/* Google Maps Hybrid Labels Toggle */}
          <button
            type="button"
            onClick={() => setShowLabels((prev) => !prev)}
            className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold transition-all cursor-pointer ${
              showLabels
                ? "border-primary/40 bg-primary/15 text-primary"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
            title="Toggle Google Maps-Style Street & Town Labels"
          >
            {showLabels ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
            <span className="hidden md:inline">{showLabels ? "Labels ON" : "Labels OFF"}</span>
          </button>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 border-l border-border pl-1.5">
            <button
              type="button"
              onClick={() => setMapAction({ type: "zoomOut", id: Date.now() })}
              disabled={currentZoom <= 2}
              className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title={currentZoom <= 2 ? "Minimum Zoom" : "Zoom Out (-)"}
            >
              <ZoomOut className="size-3.5" />
            </button>
            <span className="font-mono text-[10px] text-muted-foreground min-w-7 text-center font-bold">
              {currentZoom}x
            </span>
            <button
              type="button"
              onClick={() => setMapAction({ type: "zoomIn", id: Date.now() })}
              disabled={currentZoom >= 18}
              className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title={currentZoom >= 18 ? "Maximum Resolution Reached (18x)" : "Zoom In (+)"}
            >
              <ZoomIn className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setMapAction({ type: "recenter", id: Date.now() })}
              className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer ml-0.5"
              title="Recenter Map View (⌖)"
            >
              <RotateCcw className="size-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Interactive Leaflet Map Engine */}
      <div className="relative flex-1 min-h-0 w-full overflow-hidden">
        <DynamicLeafletMap
          state={state}
          scene={scene}
          onSelectArea={onSelectArea}
          onAnalyzeArea={onAnalyzeArea}
          onLayerChange={onLayerChange}
          toolMode={toolMode}
          onToolModeChange={setToolMode}
          showLabels={showLabels}
          onToggleLabels={() => setShowLabels((prev) => !prev)}
          mapAction={mapAction}
          onZoomChange={setCurrentZoom}
          isLeftPanelOpen={isLeftPanelOpen}
          onToggleLeftPanel={onToggleLeftPanel}
          onToggleFlood={onToggleFlood}
          onClearAllMarkings={onClearAllMarkings}
        />
      </div>
    </div>
  )
}
