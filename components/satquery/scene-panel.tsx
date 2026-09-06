"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  MapPin,
  Radar,
  Layers,
  Sparkles,
  UploadCloud,
  Cpu,
  Navigation,
  ChevronLeft,
  Search,
  Clock,
  Trash2,
  Loader2,
  X,
  Compass,
} from "lucide-react"
import { LAYERS, type LayerId, type SceneMeta } from "@/lib/satquery-data"

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="font-mono text-xs text-foreground font-medium">{value}</span>
    </div>
  )
}

const CAPABILITIES = [
  "Multimodal VLM Reasoning (Optical + SAR)",
  "BigEarthNet-MM 19-class LULC Taxonomy",
  "Zero-shot Object Grounding & Counting",
  "Otsu SAR Cloud-Penetrating Flood Mapping",
  "Bi-temporal Change Vector Analysis",
  "Vegetation Vigor & Crop Stress (NDVI)",
]

export interface RecentLocationItem {
  id: string
  name: string
  displayName: string
  region: string
  lat: number
  lon: number
  bounds: { north: number; south: number; east: number; west: number }
  tileUrl: string
}

const DEFAULT_RECENT_LOCATIONS: RecentLocationItem[] = [
  {
    id: "geo-kopargaon",
    name: "Kopargaon",
    displayName: "Kopargaon, Ahmednagar, Maharashtra, India",
    region: "Maharashtra, India",
    lat: 19.8824,
    lon: 74.4789,
    bounds: { north: 19.9174, south: 19.8474, east: 74.5139, west: 74.4439 },
    tileUrl:
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=74.4439,19.8474,74.5139,19.9174&bboxSR=4326&imageSR=4326&size=1024,1024&f=image",
  },
  {
    id: "geo-shirdi",
    name: "Shirdi",
    displayName: "Shirdi, Rahata, Ahmednagar, Maharashtra, India",
    region: "Maharashtra, India",
    lat: 19.7667,
    lon: 74.4764,
    bounds: { north: 19.8017, south: 19.7317, east: 74.5114, west: 74.4414 },
    tileUrl:
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=74.4414,19.7317,74.5114,19.8017&bboxSR=4326&imageSR=4326&size=1024,1024&f=image",
  },
  {
    id: "geo-pune",
    name: "Pune",
    displayName: "Pune, Maharashtra, India",
    region: "Maharashtra, India",
    lat: 18.5204,
    lon: 73.8567,
    bounds: { north: 18.5554, south: 18.4854, east: 73.8917, west: 73.8217 },
    tileUrl:
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=73.8217,18.4854,73.8917,18.5554&bboxSR=4326&imageSR=4326&size=1024,1024&f=image",
  },
  {
    id: "geo-bhadla",
    name: "Bhadla Solar Park",
    displayName: "Bhadla Solar Park, Phalodi, Rajasthan, India",
    region: "Rajasthan, India",
    lat: 27.5385,
    lon: 71.9177,
    bounds: { north: 27.5735, south: 27.5035, east: 71.9527, west: 71.8827 },
    tileUrl:
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=71.8827,27.5035,71.9527,27.5735&bboxSR=4326&imageSR=4326&size=1024,1024&f=image",
  },
]

interface ScenePanelProps {
  activeLayer: LayerId
  onLayerChange: (id: LayerId) => void
  selectedSceneId: string
  onSceneChange: (id: string) => void
  onOpenUpload: () => void
  onOpenBenchmark: () => void
  onLocateMe?: () => void
  isLocating?: boolean
  customSceneMeta?: SceneMeta | null
  onCollapse?: () => void
  onLocationSelect?: (searchedScene: SceneMeta, tileUrl: string) => void
}

export function ScenePanel({
  activeLayer,
  onLayerChange,
  selectedSceneId,
  onSceneChange,
  onOpenUpload,
  onOpenBenchmark,
  onLocateMe,
  isLocating,
  customSceneMeta,
  onCollapse,
  onLocationSelect,
}: ScenePanelProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<RecentLocationItem[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [recentSearches, setRecentSearches] = useState<RecentLocationItem[]>([])
  const searchRef = useRef<HTMLDivElement>(null)

  // Load recents from localStorage or fallback to defaults
  useEffect(() => {
    try {
      const stored = localStorage.getItem("satquery_recent_locations")
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRecentSearches(parsed)
          return
        }
      }
    } catch {}
    setRecentSearches(DEFAULT_RECENT_LOCATIONS)
  }, [])

  // Close search dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
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
          setShowDropdown(true)
        }
      }
    } catch (err) {
      console.warn("Geocoding error in ScenePanel:", err)
    } finally {
      setIsSearching(false)
    }
  }, [])

  const handleSelectLocation = useCallback(
    (loc: RecentLocationItem) => {
      const newSceneMeta: SceneMeta = {
        id: loc.id,
        name: loc.name,
        region: loc.region || loc.displayName,
        lat: `${loc.lat.toFixed(4)}° N`,
        lon: `${loc.lon.toFixed(4)}° E`,
        area: "49.0 km²",
        acquired: "Live Satellite AOI Tile",
        cloud: "< 5%",
        resolution: "0.5 - 10 m / px",
        bounds: loc.bounds,
        description: `High-resolution live satellite observation tile of ${loc.displayName}. Ready for AI multimodal analysis.`,
        summary: `Satellite observation of ${loc.displayName}`,
        hotspots: ["Urban / Built-up Sector", "Agricultural Parcels", "Water Drainage Corridors", "Transport Network"],
        layers: { optical: "", sar: "", ndvi: "", ndwi: "" },
      }

      if (onLocationSelect) {
        onLocationSelect(newSceneMeta, loc.tileUrl)
      } else {
        onSceneChange(loc.id)
      }

      // Update recent searches in state & localStorage
      setRecentSearches((prev) => {
        const filtered = prev.filter((item) => item.id !== loc.id && item.name.toLowerCase() !== loc.name.toLowerCase())
        const updated = [loc, ...filtered].slice(0, 6)
        try {
          localStorage.setItem("satquery_recent_locations", JSON.stringify(updated))
        } catch {}
        return updated
      })

      setShowDropdown(false)
      setSearchQuery("")
    },
    [onLocationSelect, onSceneChange]
  )

  const handleClearRecents = useCallback(() => {
    setRecentSearches([])
    try {
      localStorage.removeItem("satquery_recent_locations")
    } catch {}
  }, [])

  const currentScene: SceneMeta = customSceneMeta || {
    id: "geo-kopargaon",
    name: "Kopargaon",
    region: "Maharashtra, India",
    lat: "19.8824° N",
    lon: "74.4789° E",
    area: "49.0 km²",
    acquired: "Live Satellite AOI Tile",
    cloud: "< 5%",
    resolution: "0.5 - 10 m / px",
    bounds: { north: 19.9174, south: 19.8474, east: 74.5139, west: 74.4439 },
    description: "High-resolution satellite observation tile centered on Kopargaon, Maharashtra. Ready for multimodal analysis.",
    summary: "Satellite observation of Kopargaon, Maharashtra",
    hotspots: ["Urban Corridor", "Agricultural Parcels", "Water Drainage Corridors", "Transport Network"],
    layers: { optical: "", sar: "", ndvi: "", ndwi: "" },
  }

  return (
    <aside className="flex h-full w-full flex-col gap-4 overflow-y-auto border-r border-border bg-sidebar p-4 select-none">
      {/* Top Header */}
      <section className="rounded-lg border border-border bg-card p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Compass className="size-4 text-primary" aria-hidden="true" />
            <h2 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              Search & Scenes
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" title="AOI Connected" />
            {onCollapse && (
              <button
                type="button"
                onClick={onCollapse}
                className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border border-border/70 hover:border-border shadow-2xs"
                title="Collapse left panel (gives more space to map and chat)"
              >
                <ChevronLeft className="size-3.5" />
                <span className="text-[10px] font-mono">Hide</span>
              </button>
            )}
          </div>
        </div>

        {/* Location Search Bar */}
        <div ref={searchRef} className="relative mb-3">
          <div className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/40 transition-all">
            <Search className="size-3.5 text-primary shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                if (!e.target.value.trim()) setShowDropdown(false)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleSearch(searchQuery)
                }
              }}
              placeholder="Search any place or coordinates..."
              className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-xs"
            />
            {isSearching ? (
              <Loader2 className="size-3.5 animate-spin text-primary shrink-0" />
            ) : searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("")
                  setShowDropdown(false)
                }}
                className="text-muted-foreground hover:text-foreground p-0.5"
              >
                <X className="size-3" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => handleSearch(searchQuery)}
              disabled={isSearching || !searchQuery.trim()}
              className="rounded bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-all shrink-0"
            >
              Fly To
            </button>
          </div>

          {/* Autocomplete Results Dropdown */}
          {showDropdown && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-lg border border-border bg-card/98 backdrop-blur-md p-1 shadow-2xl">
              {searchResults.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleSelectLocation(r)}
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

        {/* Recent Searches */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              <Clock className="size-3 text-primary" />
              <span>Recent Searches</span>
            </div>
            {recentSearches.length > 0 && (
              <button
                type="button"
                onClick={handleClearRecents}
                className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                title="Clear recent searches"
              >
                <Trash2 className="size-3" />
                <span>Clear</span>
              </button>
            )}
          </div>

          {recentSearches.length === 0 ? (
            <p className="text-[11px] text-muted-foreground italic py-1">No recent searches</p>
          ) : (
            <div className="flex flex-col gap-1">
              {recentSearches.map((item) => {
                const isActive =
                  customSceneMeta?.name?.toLowerCase() === item.name.toLowerCase() ||
                  selectedSceneId === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectLocation(item)}
                    className={`flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors cursor-pointer ${
                      isActive
                        ? "bg-primary/15 border border-primary/40 text-primary font-semibold"
                        : "hover:bg-muted text-foreground border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin className={`size-3 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                      <span className="truncate">{item.name}</span>
                    </div>
                    <span className="font-mono text-[9px] text-muted-foreground shrink-0">
                      {item.lat.toFixed(2)}°, {item.lon.toFixed(2)}°
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Active Operational Scene Details */}
        <div className="pt-2 border-t border-border/80">
          <div className="mb-1.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <MapPin className="size-3.5 text-primary shrink-0" />
              <h3 className="text-xs font-bold text-foreground truncate">{currentScene.name}</h3>
            </div>
            <span className="shrink-0 rounded bg-primary/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-primary">
              ACTIVE AOI
            </span>
          </div>

          <p className="mb-2 text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
            {currentScene.region} · {currentScene.description}
          </p>

          <div className="divide-y divide-border/60">
            <Stat label="Lat" value={currentScene.lat} />
            <Stat label="Lon" value={currentScene.lon} />
            <Stat label="Area" value={currentScene.area} />
            <Stat label="Acquired" value={currentScene.acquired} />
            <Stat label="Cloud" value={currentScene.cloud} />
            <Stat label="GSD" value={currentScene.resolution} />
          </div>
        </div>

        {/* Action Buttons: Locate Me & Upload */}
        <div className="mt-3 pt-2.5 border-t border-border flex flex-col gap-2">
          {onLocateMe && (
            <button
              type="button"
              onClick={onLocateMe}
              disabled={isLocating}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-primary/50 bg-primary/15 py-2 text-xs font-semibold text-primary hover:bg-primary/25 disabled:opacity-50 transition-all shadow-sm cursor-pointer"
            >
              <Navigation className={`size-3.5 ${isLocating ? "animate-spin text-accent" : ""}`} />
              {isLocating ? "Acquiring Satellite Tile..." : "Locate My Area & Analyze"}
            </button>
          )}

          <button
            type="button"
            onClick={onOpenUpload}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-primary/40 bg-primary/5 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            <UploadCloud className="size-3.5" />
            Upload Custom AOI / Images
          </button>
        </div>
      </section>

      {/* Sensor Data Layers */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-muted-foreground" aria-hidden="true" />
            <h3 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Multimodal Layers
            </h3>
          </div>
          <span className="font-mono text-[10px] text-muted-foreground">
            {LAYERS.length} channels
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {LAYERS.map((l) => {
            const active = activeLayer === l.id
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => onLayerChange(l.id)}
                className={`flex flex-col items-start gap-1 rounded-md border p-2 text-left transition-all ${
                  active
                    ? "border-primary bg-primary/10 text-primary shadow-xs"
                    : "border-border bg-card text-card-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="font-mono text-[11px] font-semibold tracking-wide">
                    {l.label}
                  </span>
                  {l.id === "sar" ? (
                    <Radar className="size-3 text-cyan-400" />
                  ) : l.id === "ndvi" ? (
                    <Sparkles className="size-3 text-emerald-400" />
                  ) : null}
                </div>
                <span className="font-mono text-[9px] text-muted-foreground">{l.sensor}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Sensor Fusion Badge */}
      <section className="rounded-lg border border-border bg-card p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Radar className="size-4 text-accent" aria-hidden="true" />
            <h3 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Sensor Fusion Core
            </h3>
          </div>
          <button
            type="button"
            onClick={onOpenBenchmark}
            className="flex items-center gap-1 text-[10px] font-mono text-primary hover:underline"
          >
            <Cpu className="size-3" />
            Benchmark
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["Sentinel-2 MSI", "Sentinel-1 CSAR", "BigEarthNet-MM", "VRSBench VQA"].map((s) => (
            <span
              key={s}
              className="rounded-full border border-border bg-secondary/80 px-2 py-0.5 font-mono text-[10px] text-secondary-foreground"
            >
              {s}
            </span>
          ))}
        </div>
      </section>

      {/* Model Capabilities */}
      <section>
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="size-4 text-primary" aria-hidden="true" />
          <h3 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Core Capabilities
          </h3>
        </div>
        <ul className="flex flex-col gap-1.5">
          {CAPABILITIES.map((c) => (
            <li key={c} className="flex items-start gap-2 text-[11px] text-muted-foreground leading-snug">
              <span className="size-1 mt-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
              {c}
            </li>
          ))}
        </ul>
      </section>
    </aside>
  )
}
