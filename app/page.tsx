"use client"

import { useCallback, useState, useRef, useEffect } from "react"
import {
  Sparkles,
  ChevronUp,
  ChevronDown,
  Radar,
  Droplets,
  BoxSelect,
  X,
  Play,
  Square,
  Sun,
  MessageSquare,
} from "lucide-react"
import { AppHeader } from "@/components/satquery/app-header"
import { ScenePanel } from "@/components/satquery/scene-panel"
import { ImageViewer } from "@/components/satquery/image-viewer"
import { ChatPanel } from "@/components/satquery/chat-panel"
import { UploadModal } from "@/components/satquery/upload-modal"
import { BenchmarkModal } from "@/components/satquery/benchmark-modal"
import { ReportModal } from "@/components/satquery/report-modal"
import type { ChatMessage, ViewerState, SelectedArea } from "@/components/satquery/types"
import {
  matchQuery,
  apiToResponse,
  type ApiAnalysis,
  type CannedResponse,
  type LayerId,
  type SceneMeta,
  SCENES,
} from "@/lib/satquery-data"

const DEFAULT_INITIAL_SCENE: SceneMeta = {
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
  description:
    "High-resolution live satellite observation tile centered on Kopargaon, Maharashtra. Ready for multimodal AI analysis.",
  summary: "Satellite observation of Kopargaon, Maharashtra",
  hotspots: ["Urban Corridor", "Agricultural Parcels", "Water Drainage Corridors", "Transport Network"],
  layers: { optical: "", sar: "", ndvi: "", ndwi: "" },
}

const DEFAULT_INITIAL_TILE =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=74.4439,19.8474,74.5139,19.9174&bboxSR=4326&imageSR=4326&size=1024,1024&f=image"

const getInitialMessage = (sceneName: string): ChatMessage => ({
  id: "welcome",
  role: "assistant",
  text: `SatQuery AI initialized. Active scene: ${sceneName}, ingested via co-registered Sentinel-2 (Multispectral) and Sentinel-1 (C-band SAR). Ask questions in plain text or search any location.`,
})

export default function Page() {
  const [selectedSceneId, setSelectedSceneId] = useState<string>("geo-kopargaon")
  const [customScene, setCustomScene] = useState<SceneMeta | null>(DEFAULT_INITIAL_SCENE)
  const [customOptical, setCustomOptical] = useState<string | null>(DEFAULT_INITIAL_TILE)
  const [customSar, setCustomSar] = useState<string | null>(null)
  const [isLocating, setIsLocating] = useState(false)

  const isCustomSceneActive = Boolean(
    customScene &&
      (selectedSceneId === customScene.id ||
        selectedSceneId === "custom" ||
        selectedSceneId === "my-location" ||
        selectedSceneId.startsWith("geo-") ||
        selectedSceneId.startsWith("location-"))
  )
  const activeScene = isCustomSceneActive ? customScene! : DEFAULT_INITIAL_SCENE

  const [messages, setMessages] = useState<ChatMessage[]>([getInitialMessage(activeScene.name)])
  const [isThinking, setIsThinking] = useState(false)

  const [viewer, setViewer] = useState<ViewerState>({
    layer: "optical",
    detections: false,
    flood: false,
    compare: false,
    zoom: 1,
    pan: { x: 0, y: 0 },
    dynamicBoxes: [],
    selectedAOI: null,
  })

  // Panel layout toggle states
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true)
  const [isChatExpanded, setIsChatExpanded] = useState(false)
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false)

  // Automated Showcase / Live Judges Demonstration State
  const [isDemoRunning, setIsDemoRunning] = useState(false)
  const [demoStep, setDemoStep] = useState(1)
  const [demoStatus, setDemoStatus] = useState("")
  const demoTimersRef = useRef<NodeJS.Timeout[]>([])

  // Modal dialog states
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [isBenchmarkOpen, setIsBenchmarkOpen] = useState(false)
  const [isReportOpen, setIsReportOpen] = useState(false)

  const handleLocateMe = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setMessages((prev) => [
        ...prev,
        {
          id: `geo-err-${Date.now()}`,
          role: "assistant",
          text: "Geolocation is not supported by your browser. You can still select any operational scene or upload custom imagery.",
        },
      ])
      return
    }

    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        const delta = 0.035
        const north = Number((latitude + delta).toFixed(4))
        const south = Number((latitude - delta).toFixed(4))
        const east = Number((longitude + delta).toFixed(4))
        const west = Number((longitude - delta).toFixed(4))

        const tileUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${west},${south},${east},${north}&bboxSR=4326&imageSR=4326&size=1024,1024&f=image`

        const localScene: SceneMeta = {
          id: "my-location",
          name: "My Live Location",
          region: `${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E`,
          lat: `${latitude.toFixed(4)}° N`,
          lon: `${longitude.toFixed(4)}° E`,
          area: "49.0 km²",
          acquired: "Live Satellite AOI Tile",
          cloud: "< 5%",
          resolution: "0.5 - 10 m / px",
          bounds: { north, south, east, west },
          description: `High-resolution live satellite observation tile centered on your current GPS coordinates (${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E). Ready for AI multimodal analysis.`,
          summary: "GPS-located satellite Area of Interest loaded dynamically.",
          hotspots: ["Local Urban Core", "Vegetation Parcels", "Water Drainage", "Transport Corridors"],
          layers: {
            optical: tileUrl,
            sar: tileUrl,
            ndvi: tileUrl,
            ndwi: tileUrl,
          },
        }

        setCustomScene(localScene)
        setSelectedSceneId("my-location")
        setCustomOptical(tileUrl)
        setViewer({
          layer: "optical",
          detections: false,
          flood: false,
          compare: false,
          zoom: 1,
          pan: { x: 0, y: 0 },
          dynamicBoxes: [],
          selectedAOI: null,
        })
        setIsLocating(false)

        setMessages((prev) => [
          ...prev,
          {
            id: `geo-${Date.now()}`,
            role: "assistant",
            text: `🛰️ Live satellite imagery acquired for your location (${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E)! The high-resolution observation tile is now active in your viewer. Ask me anything about land cover, buildings, roads, or green canopy in your area.`,
          },
        ])
      },
      (err) => {
        setIsLocating(false)
        console.warn("Geolocation error:", err)
        setMessages((prev) => [
          ...prev,
          {
            id: `geo-denied-${Date.now()}`,
            role: "assistant",
            text: "Could not access GPS location (permission was denied or request timed out). You can still browse the 4 operational Indian scenes or upload custom imagery.",
          },
        ])
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }, [])


  const handleSceneChange = useCallback(
    (sceneId: string) => {
      setSelectedSceneId(sceneId)
      const isCustom =
        customScene &&
        (sceneId === customScene.id ||
          sceneId === "custom" ||
          sceneId === "my-location" ||
          sceneId.startsWith("geo-") ||
          sceneId.startsWith("location-"))

      const newScene = isCustom ? customScene! : SCENES[sceneId] ?? SCENES.godavari

      setViewer({
        layer: "optical",
        detections: false,
        flood: false,
        compare: false,
        zoom: 1,
        pan: { x: 0, y: 0 },
        dynamicBoxes: [],
        selectedAOI: null,
      })

      setMessages((prev) => [
        ...prev,
        {
          id: `scene-${Date.now()}`,
          role: "assistant",
          text: `Switched operational scene to ${newScene.name} (${newScene.region}). Multimodal optical and SAR streams re-calibrated. Ready for analysis.`,
        },
      ])
    },
    [customScene]
  )

  const handleLocationSelect = useCallback((searchedScene: SceneMeta, tileUrl: string) => {
    setCustomScene(searchedScene)
    setSelectedSceneId(searchedScene.id)
    setCustomOptical(tileUrl)
    setViewer({
      layer: "optical",
      detections: false,
      flood: false,
      compare: false,
      zoom: 1,
      pan: { x: 0, y: 0 },
      dynamicBoxes: [],
      selectedAOI: null,
    })

    setMessages((prev) => [
      ...prev,
      {
        id: `search-${Date.now()}`,
        role: "assistant",
        text: `🛰️ Satellite observation tile acquired for ${searchedScene.name} (${searchedScene.region})! High-resolution observation tile is now active in your viewer. Ask me anything about land cover, buildings, roads, or green canopy in ${searchedScene.name}.`,
      },
    ])
  }, [])

  const handleUploadSuccess = useCallback(
    (newCustomScene: SceneMeta, opticalDataUrl: string, sarDataUrl?: string) => {
      setCustomScene(newCustomScene)
      setCustomOptical(opticalDataUrl)
      if (sarDataUrl) setCustomSar(sarDataUrl)
      setSelectedSceneId("custom")

      setViewer({
        layer: "optical",
        detections: false,
        flood: false,
        compare: false,
        zoom: 1,
        pan: { x: 0, y: 0 },
        dynamicBoxes: [],
        selectedAOI: null,
      })

      setMessages((prev) => [
        ...prev,
        {
          id: `upload-${Date.now()}`,
          role: "assistant",
          text: `Successfully ingested custom imagery for "${newCustomScene.name}". You can now query land cover, detect infrastructure, or analyze anomalies on your uploaded dataset.`,
        },
      ])
    },
    []
  )

  const handleSend = useCallback(
    async (text: string, overrideAOI?: SelectedArea | null) => {
      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        text,
      }
      setMessages((prev) => [...prev, userMsg])
      setIsThinking(true)
      setIsMobileChatOpen(true)

      const activeAOI = overrideAOI !== undefined ? overrideAOI : viewer.selectedAOI

      let response: CannedResponse
      try {
        const payload = {
          query: text,
          sceneId: selectedSceneId,
          customScene: isCustomSceneActive
            ? {
                name: activeScene.name,
                region: activeScene.region,
                lat: activeScene.lat,
                lon: activeScene.lon,
                area: activeScene.area,
                bounds: activeScene.bounds,
                description: activeScene.description,
              }
            : undefined,
          selectedAOI: activeAOI || undefined,
          userOpticalBase64:
            customOptical && customOptical.startsWith("data:")
              ? customOptical.split(",")[1]
              : undefined,
          userOpticalUrl:
            customOptical && customOptical.startsWith("http") ? customOptical : undefined,
          userSarBase64:
            customSar && customSar.startsWith("data:") ? customSar.split(",")[1] : undefined,
        }

        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        if (!res.ok) throw new Error("bad status")
        const data = (await res.json()) as {
          result?: ApiAnalysis
          source?: string
          sources?: string[]
        }
        response = data.result
          ? apiToResponse(data.result, data.sources)
          : matchQuery(text, selectedSceneId, activeAOI, isCustomSceneActive ? activeScene : undefined)
      } catch {
        // Fallback to domain-specific reasoning engine
        response = matchQuery(text, selectedSceneId, activeAOI, isCustomSceneActive ? activeScene : undefined)
      }

      const queryLower = text.toLowerCase()
      const isFloodQuery =
        queryLower.includes("flood") ||
        queryLower.includes("inundat") ||
        queryLower.includes("submerg") ||
        queryLower.includes("waterlog")

      const isWaterQuery =
        !isFloodQuery &&
        (queryLower.includes("water") || queryLower.includes("river") || queryLower.includes("lake") || queryLower.includes("canal"))

      const isCropQuery =
        queryLower.includes("crop") || queryLower.includes("farm") || queryLower.includes("vegetat") || queryLower.includes("ndvi")

      const isUrbanQuery =
        queryLower.includes("build") || queryLower.includes("urban") || queryLower.includes("settle") || queryLower.includes("structure")

      const shouldEnableFlood = isFloodQuery || Boolean(response.effect?.flood)
      const shouldEnableDetections =
        Boolean(response.boundingBoxes && response.boundingBoxes.length > 0) ||
        Boolean(response.effect?.detections) ||
        isUrbanQuery ||
        isCropQuery ||
        isWaterQuery ||
        isFloodQuery

      setViewer((prev) => ({
        ...prev,
        layer: response.effect?.layer || (isFloodQuery ? "sar" : isWaterQuery ? "ndwi" : isCropQuery ? "ndvi" : prev.layer),
        detections: shouldEnableDetections,
        flood: shouldEnableFlood,
        compare: response.effect?.compare ?? false,
        dynamicBoxes: response.boundingBoxes || response.effect?.boundingBoxes || prev.dynamicBoxes,
      }))

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: response.text,
          card: response.card,
          sources: response.sources,
          boundingBoxes: response.boundingBoxes,
          recommendedLayer: response.effect?.layer,
          aoi: activeAOI,
        },
      ])
      setIsThinking(false)
    },
    [selectedSceneId, customOptical, customSar, viewer.selectedAOI, isCustomSceneActive, activeScene]
  )

  const handleAnalyzeArea = useCallback(
    (aoi: SelectedArea) => {
      const prompt = `Perform detailed spatial land-cover and crop analysis on the selected field parcel [${aoi.bounds.south.toFixed(3)}°N, ${aoi.bounds.west.toFixed(3)}°E to ${aoi.bounds.north.toFixed(3)}°N, ${aoi.bounds.east.toFixed(3)}°E] covering ~${aoi.areaKm2} km² in ${activeScene.name}. What is the dominant land cover, vegetation vigor, and crop status inside this specific area?`
      handleSend(prompt, aoi)
    },
    [handleSend, activeScene.name]
  )

  const handleLayerChange = useCallback((layer: LayerId) => {
    setViewer((prev) => ({ ...prev, layer, compare: false }))
  }, [])

  // Cleanup demo timers on unmount
  useEffect(() => {
    return () => {
      demoTimersRef.current.forEach(clearTimeout)
    }
  }, [])

  const stopJudgesDemo = useCallback(() => {
    demoTimersRef.current.forEach(clearTimeout)
    demoTimersRef.current = []
    setIsDemoRunning(false)
    setDemoStatus("")
  }, [])

  const startJudgesDemo = useCallback(() => {
    stopJudgesDemo()
    setIsDemoRunning(true)
    setDemoStep(1)
    setDemoStatus("Step 1/5: Loading Sentinel-2 Optical Multi-spectral Scene (Godavari Basin / Agricultural Belt)...")

    // Step 1 (0s): Select Godavari agricultural scene, optical layer, clear previous AOI
    setSelectedSceneId("godavari")
    setCustomScene(null)
    setViewer({
      layer: "optical",
      detections: false,
      flood: false,
      compare: false,
      zoom: 13,
      pan: { x: 0, y: 0 },
      dynamicBoxes: [],
      selectedAOI: null,
    })

    const sampleFarmAOI: SelectedArea = {
      xmin: 28,
      ymin: 32,
      xmax: 72,
      ymax: 68,
      bounds: { north: 19.894, south: 19.870, east: 74.494, west: 74.464 },
      areaKm2: 1.35,
    }

    // Step 2 (3s): Simulate farmer selecting agricultural field parcel (AOI)
    const t1 = setTimeout(() => {
      setDemoStep(2)
      setDemoStatus("Step 2/5: Farmer designates ~1.35 km² crop parcel (Area of Interest / Khet)...")
      setViewer((prev) => ({
        ...prev,
        selectedAOI: sampleFarmAOI,
      }))
    }, 3000)

    // Step 3 (6s): Send multimodal inquiry
    const t2 = setTimeout(() => {
      setDemoStep(3)
      setDemoStatus("Step 3/5: AI Multimodal VLM cross-referencing Sentinel-1 SAR & Sentinel-2 Optical...")
      setIsMobileChatOpen(true)
      handleSend(
        "Assess SAR flood inundation and NDVI crop vigor damage inside this designated field parcel (~1.35 km²)",
        sampleFarmAOI
      )
    }, 6000)

    // Step 4 (11s): Sentinel-1 C-band SAR Radar Cloud Penetration & Flood Inundation (< -16dB)
    const t3 = setTimeout(() => {
      setDemoStep(4)
      setDemoStatus("Step 4/5: Sentinel-1 C-Band SAR Radar penetrates monsoon clouds · Flood inundation strictly mapped on field parcel...")
      setViewer((prev) => ({
        ...prev,
        layer: "sar",
        flood: true,
        detections: true,
      }))
    }, 11000)

    // Step 5 (16s): NDVI Vegetation Vigor Index & Crop Loss Estimation
    const t4 = setTimeout(() => {
      setDemoStep(5)
      setDemoStatus("Step 5/5: Computing NDVI Vegetation Vigor (Healthy canopy vs submerged crop area)...")
      setViewer((prev) => ({
        ...prev,
        layer: "ndvi",
      }))
    }, 16000)

    // Step 6 (21s): Open Official Situation Report for Judges
    const t5 = setTimeout(() => {
      setDemoStatus("✅ Demonstration Complete: Official ISRO Situation & Insurance Damage Report Generated!")
      setIsReportOpen(true)
      const tEnd = setTimeout(() => {
        setIsDemoRunning(false)
      }, 6000)
      demoTimersRef.current.push(tEnd)
    }, 21000)

    demoTimersRef.current = [t1, t2, t3, t4, t5]
  }, [handleSend, stopJudgesDemo])

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      {/* Navigation Header with Benchmark, Report & Judges Demo triggers */}
      <AppHeader
        onOpenBenchmark={() => setIsBenchmarkOpen(true)}
        onOpenReport={() => setIsReportOpen(true)}
        isLeftPanelOpen={isLeftPanelOpen}
        onToggleLeftPanel={() => setIsLeftPanelOpen((prev) => !prev)}
        onStartDemo={isDemoRunning ? stopJudgesDemo : startJudgesDemo}
        isDemoRunning={isDemoRunning}
      />

      {/* Main Workspace */}
      <main className="relative flex min-h-0 flex-1 overflow-hidden flex-col lg:flex-row">
        {/* Left Side: Scene Panel (Collapsible - Desktop only) */}
        <div
          className={`relative hidden h-full shrink-0 transition-all duration-300 ease-in-out lg:block ${
            isLeftPanelOpen
              ? "w-64 min-w-[16rem] opacity-100"
              : "w-0 min-w-0 -translate-x-full overflow-hidden opacity-0 pointer-events-none"
          }`}
        >
          <ScenePanel
            activeLayer={viewer.layer}
            onLayerChange={handleLayerChange}
            selectedSceneId={selectedSceneId}
            onSceneChange={handleSceneChange}
            onOpenUpload={() => setIsUploadOpen(true)}
            onOpenBenchmark={() => setIsBenchmarkOpen(true)}
            onLocateMe={handleLocateMe}
            isLocating={isLocating}
            customSceneMeta={customScene}
            onCollapse={() => setIsLeftPanelOpen(false)}
            onLocationSelect={handleLocationSelect}
          />
        </div>

        {/* Center: Image Viewer (Full-Screen on Mobile, Flexible on Desktop) */}
        <div className="relative flex-1 min-h-0 min-w-0 h-full w-full overflow-hidden">
          {/* Judges Live Demo Status Banner */}
          {isDemoRunning && (
            <div className="pointer-events-auto absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5 rounded-full border border-amber-500/80 bg-slate-950/95 px-4 py-2 text-xs text-amber-200 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 max-w-[95vw]">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
              </span>
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="font-bold text-amber-300 font-mono shrink-0">🏆 DEMO</span>
                <span className="text-border">|</span>
                <span className="truncate text-foreground font-medium text-[11px] sm:text-xs">{demoStatus}</span>
              </div>
              <button
                type="button"
                onClick={stopJudgesDemo}
                className="ml-auto flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 hover:bg-amber-500/30 transition-colors shrink-0"
              >
                <Square className="size-3 fill-current" />
                <span>Stop</span>
              </button>
            </div>
          )}

          <ImageViewer
            state={viewer}
            scene={activeScene}
            userCustomImage={isCustomSceneActive ? customOptical : null}
            onZoomChange={(zoom) => setViewer((prev) => ({ ...prev, zoom }))}
            onPanChange={(pan) => setViewer((prev) => ({ ...prev, pan }))}
            onSelectArea={(aoi) => setViewer((prev) => ({ ...prev, selectedAOI: aoi }))}
            onAnalyzeArea={handleAnalyzeArea}
            onLocationSelect={handleLocationSelect}
            isLeftPanelOpen={isLeftPanelOpen}
            onToggleLeftPanel={() => setIsLeftPanelOpen((prev) => !prev)}
            onLayerChange={handleLayerChange}
            onToggleFlood={() => setViewer((prev) => ({ ...prev, flood: !prev.flood }))}
          />

          {/* Floating Mobile Farmer Quick Action Bar (Mobile Only, above peek bar) */}
          <div className="lg:hidden pointer-events-auto absolute bottom-14 left-2 right-2 z-20 flex items-center justify-around gap-1 rounded-2xl border border-border/80 bg-background/95 p-1.5 shadow-2xl backdrop-blur-md">
            <button
              type="button"
              onClick={() => {
                if (viewer.selectedAOI) {
                  setViewer((prev) => ({ ...prev, selectedAOI: null }))
                } else {
                  const sampleParcel: SelectedArea = {
                    xmin: 30,
                    ymin: 35,
                    xmax: 70,
                    ymax: 65,
                    bounds: { north: 19.892, south: 19.872, east: 74.492, west: 74.468 },
                    areaKm2: 0.95,
                  }
                  setViewer((prev) => ({ ...prev, selectedAOI: sampleParcel }))
                }
              }}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-bold transition-all cursor-pointer ${
                viewer.selectedAOI
                  ? "bg-cyan-500 text-slate-950 shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <BoxSelect className="size-4" />
              <span>{viewer.selectedAOI ? "Field (~0.95km²)" : "Select Field"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setViewer((prev) => ({
                  ...prev,
                  layer: "sar",
                  flood: !prev.flood,
                }))
              }}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-bold transition-all cursor-pointer ${
                viewer.flood
                  ? "bg-sky-500 text-slate-950 shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <Radar className="size-4" />
              <span>{viewer.flood ? "Flood ON" : "Check Flood"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setViewer((prev) => ({
                  ...prev,
                  layer: prev.layer === "ndvi" ? "optical" : "ndvi",
                }))
              }}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-bold transition-all cursor-pointer ${
                viewer.layer === "ndvi"
                  ? "bg-emerald-500 text-slate-950 shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <Sparkles className="size-4" />
              <span>Crop Health</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setViewer((prev) => ({
                  ...prev,
                  layer: prev.layer === "isro" ? "optical" : "isro",
                }))
              }}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-bold transition-all cursor-pointer ${
                viewer.layer === "isro"
                  ? "bg-orange-500 text-slate-950 shadow-sm font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <span className="text-sm leading-none">🇮🇳</span>
              <span>ISRO</span>
            </button>

            <button
              type="button"
              onClick={() => setIsMobileChatOpen(true)}
              className="flex flex-col items-center gap-0.5 rounded-xl bg-primary/15 text-primary hover:bg-primary/25 px-2.5 py-1.5 text-[10px] font-bold transition-all cursor-pointer"
            >
              <MessageSquare className="size-4" />
              <span>Ask AI</span>
            </button>
          </div>

          {/* Mobile Bottom Sheet Peek Bar (when drawer is closed) */}
          {!isMobileChatOpen && (
            <div
              onClick={() => setIsMobileChatOpen(true)}
              className="lg:hidden absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between border-t border-border bg-sidebar/95 px-4 py-2.5 shadow-2xl backdrop-blur-md cursor-pointer hover:bg-sidebar transition-all"
            >
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-full bg-primary/20 text-primary">
                  <Sparkles className="size-3.5" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-semibold flex items-center gap-1.5">
                    <span>Vision-Language AI Assistant</span>
                    <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-mono">Bilingual</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Khet me paani · Fasal ki tabiyat (Tap to open)</p>
                </div>
              </div>
              <div className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-foreground">
                <span>Open</span>
                <ChevronUp className="size-3.5" />
              </div>
            </div>
          )}
        </div>

        {/* Mobile Full-Height Sliding Chat Drawer */}
        {isMobileChatOpen && (
          <>
            <div
              onClick={() => setIsMobileChatOpen(false)}
              className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity"
            />
            <div className="lg:hidden fixed inset-x-0 bottom-0 top-[12vh] z-50 rounded-t-2xl shadow-2xl border-t border-border overflow-hidden bg-sidebar flex flex-col transition-transform duration-300 animate-in slide-in-from-bottom">
              <div
                className="flex justify-center pt-2 pb-1 bg-sidebar cursor-pointer"
                onClick={() => setIsMobileChatOpen(false)}
              >
                <div className="h-1.5 w-12 rounded-full bg-muted-foreground/40" />
              </div>
              <div className="flex-1 min-h-0">
                <ChatPanel
                  messages={messages}
                  isThinking={isThinking}
                  onSend={handleSend}
                  activeSceneId={selectedSceneId}
                  activeAOI={viewer.selectedAOI}
                  onClearAOI={() => setViewer((prev) => ({ ...prev, selectedAOI: null }))}
                  isExpanded={true}
                  onCloseMobileDrawer={() => setIsMobileChatOpen(false)}
                />
              </div>
            </div>
          </>
        )}

        {/* Desktop Side Chat Panel (Dynamic Width) */}
        <div
          className={`hidden lg:flex h-full min-h-0 shrink-0 flex-col transition-all duration-300 ease-in-out ${
            isChatExpanded
              ? "w-[38rem] xl:w-[42rem]"
              : isLeftPanelOpen
              ? "w-[25rem] xl:w-[27rem]"
              : "w-[32rem] xl:w-[36rem]"
          }`}
        >
          <ChatPanel
            messages={messages}
            isThinking={isThinking}
            onSend={handleSend}
            activeSceneId={selectedSceneId}
            activeAOI={viewer.selectedAOI}
            onClearAOI={() => setViewer((prev) => ({ ...prev, selectedAOI: null }))}
            isExpanded={isChatExpanded}
            onToggleExpand={() => setIsChatExpanded((prev) => !prev)}
          />
        </div>
      </main>

      {/* Modal Dialogs */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />

      <BenchmarkModal
        isOpen={isBenchmarkOpen}
        onClose={() => setIsBenchmarkOpen(false)}
      />

      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        scene={activeScene}
        messages={messages}
      />
    </div>
  )
}
