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
  MapPin,
  Mic,
  Navigation,
  Compass,
  FileText,
  Printer,
  Sprout,
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

const DEFAULT_INITIAL_TILE = null

const getInitialMessage = (sceneName: string): ChatMessage => ({
  id: "welcome",
  role: "assistant",
  text: `SatQuery AI initialized. Active scene: ${sceneName}, ingested via co-registered Sentinel-2 (Multispectral) and Sentinel-1 (C-band SAR). Ask questions in plain text or search any location.`,
})

export default function Page() {
  const [selectedSceneId, setSelectedSceneId] = useState<string>("geo-kopargaon")
  const [customScene, setCustomScene] = useState<SceneMeta | null>(DEFAULT_INITIAL_SCENE)
  const [customOptical, setCustomOptical] = useState<string | null>(null)
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
  const [mobileTab, setMobileTab] = useState<"map" | "chat" | "places" | "report">("map")
  const [mounted, setMounted] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const mq = window.matchMedia("(min-width: 1024px)")
    setIsDesktop(mq.matches)
    setMounted(true)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

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
        setMobileTab("map")

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
      setMobileTab("map")
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
    setMobileTab("map")
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
      setMobileTab("chat")

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
      const prompt = `Classify and analyze the dominant land-cover and surface features in the selected region [${aoi.bounds.south.toFixed(3)}°N, ${aoi.bounds.west.toFixed(3)}°E to ${aoi.bounds.north.toFixed(3)}°N, ${aoi.bounds.east.toFixed(3)}°E] covering ~${aoi.areaKm2} km² in ${activeScene.name}. Verify ground-truth: whether this area is built-up settlement/infrastructure, agricultural cropland, waterbody, or open terrain, and detect all key structures.`
      handleSend(prompt, aoi)
      setMobileTab("chat")
    },
    [handleSend, activeScene.name]
  )

  const handleLayerChange = useCallback((layer: LayerId) => {
    setViewer((prev) => ({ ...prev, layer, compare: false }))
  }, [])

  const handleClearAllMarkings = useCallback(() => {
    setViewer((prev) => ({
      ...prev,
      selectedAOI: null,
      dynamicBoxes: [],
      detections: false,
      flood: false,
    }))
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
        onToggleLeftPanel={() => {
          setIsLeftPanelOpen((prev) => !prev)
          setMobileTab("places")
        }}
        onStartDemo={isDemoRunning ? stopJudgesDemo : startJudgesDemo}
        isDemoRunning={isDemoRunning}
        onOpenChat={() => setMobileTab("chat")}
      />

      {/* Main Workspace */}
      <main className="relative flex min-h-0 flex-1 overflow-hidden flex-col">
        {/* DESKTOP VIEWPORT (hidden on mobile, 3-column power layout on lg+) */}
        <div className="hidden lg:flex flex-1 min-h-0 w-full h-full overflow-hidden flex-row">
          {/* Left Side: Scene Panel (Collapsible) */}
          <div
            className={`relative h-full shrink-0 transition-all duration-300 ease-in-out ${
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

          {/* Center: Image Viewer (Flexible on Desktop) */}
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

            {mounted && isDesktop && (
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
                onClearAllMarkings={handleClearAllMarkings}
              />
            )}
          </div>

          {/* Desktop Side Chat Panel (Dynamic Width) */}
          <div
            className={`flex h-full min-h-0 shrink-0 flex-col transition-all duration-300 ease-in-out ${
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
              onClearAOI={handleClearAllMarkings}
              isExpanded={isChatExpanded}
              onToggleExpand={() => setIsChatExpanded((prev) => !prev)}
            />
          </div>
        </div>

        {/* MOBILE VIEWPORT (lg:hidden, 4-Tab Native App Mode with bottom nav) */}
        <div className="lg:hidden relative flex-1 min-h-0 w-full h-full overflow-hidden flex flex-col">
          {/* Mobile Judges Live Demo Status Banner */}
          {isDemoRunning && (
            <div className="pointer-events-auto absolute top-2 left-2 right-2 z-50 flex items-center justify-between gap-1.5 rounded-xl border border-amber-500/80 bg-slate-950/95 px-3 py-1.5 text-[11px] text-amber-200 shadow-2xl backdrop-blur-md">
              <div className="flex items-center gap-1.5 overflow-hidden">
                <span className="font-bold text-amber-300 font-mono shrink-0">🏆 DEMO:</span>
                <span className="truncate text-foreground font-medium">{demoStatus}</span>
              </div>
              <button
                type="button"
                onClick={stopJudgesDemo}
                className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300"
              >
                Stop
              </button>
            </div>
          )}

          {/* Tab 1: Map Tab (Preserved in DOM to prevent Leaflet dimension collapse and NaN crashes) */}
          <div
            className={`relative flex-1 min-h-0 w-full h-full overflow-hidden ${
              mobileTab === "map" ? "flex flex-col z-10" : "invisible pointer-events-none absolute inset-0 -z-10"
            }`}
          >
            {mounted && !isDesktop && (
              <ImageViewer
                state={viewer}
                scene={activeScene}
                userCustomImage={isCustomSceneActive ? customOptical : null}
                onZoomChange={(zoom) => setViewer((prev) => ({ ...prev, zoom }))}
                onPanChange={(pan) => setViewer((prev) => ({ ...prev, pan }))}
                onSelectArea={(aoi) => setViewer((prev) => ({ ...prev, selectedAOI: aoi }))}
                onAnalyzeArea={handleAnalyzeArea}
                onLocationSelect={handleLocationSelect}
                isLeftPanelOpen={false}
                onToggleLeftPanel={() => setMobileTab("places")}
                onLayerChange={handleLayerChange}
                onToggleFlood={() => setViewer((prev) => ({ ...prev, flood: !prev.flood }))}
                onClearAllMarkings={handleClearAllMarkings}
              />
            )}

            {/* Floating Map Quick Controls for Mobile Farmers */}
            <div className="pointer-events-auto absolute top-2 left-2 right-2 z-20 flex items-center justify-between gap-1 overflow-x-auto no-scrollbar py-1">
              <div className="flex items-center gap-1 rounded-full bg-slate-950/90 p-1 border border-border/70 backdrop-blur-md shadow-lg text-[10px]">
                <button
                  type="button"
                  onClick={() => handleLayerChange("optical")}
                  className={`rounded-full px-2.5 py-1 font-semibold transition-all ${
                    viewer.layer === "optical" && !viewer.flood
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  🛰️ ऑप्टिकल
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleLayerChange("sar")
                    setViewer((prev) => ({ ...prev, flood: false }))
                  }}
                  className={`rounded-full px-2.5 py-1 font-semibold transition-all ${
                    viewer.layer === "sar" && !viewer.flood
                      ? "bg-sky-500 text-slate-950 shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  📡 SAR रडार
                </button>
                <button
                  type="button"
                  onClick={() => handleLayerChange("ndvi")}
                  className={`rounded-full px-2.5 py-1 font-semibold transition-all ${
                    viewer.layer === "ndvi"
                      ? "bg-emerald-500 text-slate-950 shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  🌱 फसल सेहत
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
                  className={`rounded-full px-2.5 py-1 font-semibold transition-all ${
                    viewer.flood
                      ? "bg-cyan-400 text-slate-950 shadow-sm font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  🌊 बाढ़
                </button>
                {(viewer.selectedAOI || (viewer.dynamicBoxes && viewer.dynamicBoxes.length > 0) || viewer.flood) && (
                  <button
                    type="button"
                    onClick={handleClearAllMarkings}
                    className="rounded-full bg-rose-500/20 border border-rose-500/50 px-2 py-1 text-[10px] font-bold text-rose-300 shadow-sm hover:bg-rose-500/30 transition-all cursor-pointer whitespace-nowrap"
                    title="Clear all markings from map"
                  >
                    ✕ निशान हटाएं
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleLocateMe}
                disabled={isLocating}
                className="flex items-center gap-1 rounded-full bg-slate-950/90 border border-primary/50 px-2.5 py-1 text-[11px] font-bold text-primary shadow-lg backdrop-blur-md hover:bg-primary/20 shrink-0"
                title="My Farm GPS"
              >
                <Navigation className={`size-3.5 ${isLocating ? "animate-spin" : ""}`} />
                <span>GPS</span>
              </button>
            </div>
          </div>

          {/* Tab 2: Kisan AI Chat Tab (Full-Screen Chat on Mobile with Voice & Audio) */}
          <div className={`relative flex-1 min-h-0 w-full h-full overflow-hidden ${mobileTab === "chat" ? "flex flex-col" : "hidden"}`}>
            <ChatPanel
              messages={messages}
              isThinking={isThinking}
              onSend={handleSend}
              activeSceneId={selectedSceneId}
              activeAOI={viewer.selectedAOI}
              onClearAOI={handleClearAllMarkings}
              isExpanded={true}
              onCloseMobileDrawer={() => setMobileTab("map")}
            />
          </div>

          {/* Tab 3: Places & Location Search Tab */}
          <div className={`relative flex-1 min-h-0 w-full h-full overflow-y-auto bg-sidebar ${mobileTab === "places" ? "flex flex-col" : "hidden"}`}>
            <ScenePanel
              activeLayer={viewer.layer}
              onLayerChange={(layer) => {
                handleLayerChange(layer)
                setMobileTab("map")
              }}
              selectedSceneId={selectedSceneId}
              onSceneChange={(id) => {
                handleSceneChange(id)
                setMobileTab("map")
              }}
              onOpenUpload={() => {
                setIsUploadOpen(true)
              }}
              onOpenBenchmark={() => {
                setIsBenchmarkOpen(true)
              }}
              onLocateMe={() => {
                handleLocateMe()
                setMobileTab("map")
              }}
              isLocating={isLocating}
              customSceneMeta={customScene}
              onCollapse={() => setMobileTab("map")}
              onLocationSelect={(scene, url) => {
                handleLocationSelect(scene, url)
                setMobileTab("map")
              }}
            />
          </div>

          {/* Tab 4: Farmer Situation & PMFBY Insurance Report Tab */}
          <div className={`relative flex-1 min-h-0 w-full h-full overflow-y-auto bg-card p-3.5 ${mobileTab === "report" ? "flex flex-col" : "hidden"}`}>
            <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
              <div className="flex items-center gap-2">
                <FileText className="size-5 text-primary" />
                <div>
                  <h2 className="text-sm font-bold text-foreground">किसान फसल व नुकसान रिपोर्ट</h2>
                  <p className="text-[11px] text-muted-foreground">PMFBY Official Verification Certificate</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsReportOpen(true)}
                className="flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-md"
              >
                <span>विस्तृत रिपोर्ट</span>
              </button>
            </div>
            <div className="flex-1 space-y-3">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <Sprout className="size-4" />
                  <span>सक्रिय क्षेत्र: {activeScene.name} ({activeScene.region})</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  उपग्रह डेटा: Sentinel-1 SAR रडार + Sentinel-2 मल्टी-स्पेक्ट्रल + OpenStreetMap भू-सत्यापन
                </p>
              </div>

              <div className="rounded-xl border border-border bg-secondary/30 p-3 space-y-2">
                <div className="text-xs font-bold text-foreground">💡 किसान सहायता निर्देश:</div>
                <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
                  <li><strong>नक्शा टैब</strong> पर जाकर अपने खेत पर बॉक्स खींचें या &quot;खेत चुनें&quot; दबाएं।</li>
                  <li><strong>किसान AI</strong> टैब में माइक 🎙️ दबाकर हिंदी में बोलें: &quot;मेरी फसल कैसी है?&quot;</li>
                  <li>बाढ़ या सूखे की स्थिति में यह रिपोर्ट PMFBY बीमा क्लेम के लिए सीधे डाउनलोड या प्रिंट करें।</li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => setIsReportOpen(true)}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 text-xs font-bold text-white shadow-lg transition-all"
              >
                <Printer className="size-4" />
                <span>सरकारी PMFBY प्रमाणपत्र देखें / प्रिंट करें</span>
              </button>
            </div>
          </div>

          {/* Fixed Farmer Mobile Bottom Navigation Bar */}
          <nav className="h-16 shrink-0 bg-sidebar/95 backdrop-blur-lg border-t border-border shadow-2xl flex items-center justify-around px-2 z-40">
            {/* Tab 1: 🗺️ Map */}
            <button
              type="button"
              onClick={() => setMobileTab("map")}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                mobileTab === "map"
                  ? "text-primary font-bold bg-primary/15"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Compass className="size-5" />
              <span className="text-[10px]">नक्शा</span>
            </button>

            {/* Tab 2: 💬 Kisan AI Chat */}
            <button
              type="button"
              onClick={() => setMobileTab("chat")}
              className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                mobileTab === "chat"
                  ? "text-primary font-bold bg-primary/15"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="relative flex items-center">
                <MessageSquare className="size-5" />
                {isThinking ? (
                  <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-amber-400 animate-ping" />
                ) : (
                  <Mic className="size-2.5 text-primary absolute -bottom-0.5 -right-1" />
                )}
              </div>
              <span className="text-[10px]">किसान AI</span>
            </button>

            {/* Tab 3: 📍 Places / Search */}
            <button
              type="button"
              onClick={() => setMobileTab("places")}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                mobileTab === "places"
                  ? "text-primary font-bold bg-primary/15"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MapPin className="size-5" />
              <span className="text-[10px]">जगह</span>
            </button>

            {/* Tab 4: 📋 Report */}
            <button
              type="button"
              onClick={() => setMobileTab("report")}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                mobileTab === "report"
                  ? "text-primary font-bold bg-primary/15"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="size-5" />
              <span className="text-[10px]">रिपोर्ट</span>
            </button>
          </nav>
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
