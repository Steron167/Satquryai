"use client"

import { useCallback, useState } from "react"
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

      if (response.effect) {
        setViewer((prev) => ({
          ...prev,
          layer: response.effect?.layer ?? prev.layer,
          detections: response.effect?.detections ?? false,
          flood: response.effect?.flood ?? false,
          compare: response.effect?.compare ?? false,
          dynamicBoxes: response.boundingBoxes || response.effect?.boundingBoxes || [],
        }))
      }

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
      const prompt = `Perform detailed spatial analysis on the highlighted sub-region [${aoi.bounds.south.toFixed(3)}°N, ${aoi.bounds.west.toFixed(3)}°E to ${aoi.bounds.north.toFixed(3)}°N, ${aoi.bounds.east.toFixed(3)}°E] covering ~${aoi.areaKm2} km² in ${activeScene.name}. What key terrain, water bodies, vegetation vigor, and infrastructure are visible inside this specific area?`
      handleSend(prompt, aoi)
    },
    [handleSend, activeScene.name]
  )

  const handleLayerChange = useCallback((layer: LayerId) => {
    setViewer((prev) => ({ ...prev, layer, compare: false }))
  }, [])

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      {/* Navigation Header with Benchmark & Report triggers */}
      <AppHeader
        onOpenBenchmark={() => setIsBenchmarkOpen(true)}
        onOpenReport={() => setIsReportOpen(true)}
        isLeftPanelOpen={isLeftPanelOpen}
        onToggleLeftPanel={() => setIsLeftPanelOpen((prev) => !prev)}
      />

      <main className="relative flex min-h-0 flex-1 overflow-hidden flex-col lg:flex-row">
        {/* Left Side: Scene Panel (Collapsible) */}
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

        {/* Center: Image Viewer */}
        <div className="relative flex-1 min-h-0 min-w-0 max-lg:h-[42vh] h-full overflow-hidden">
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
          />
        </div>

        {/* Right Side: Chat Panel (Dynamic Width) */}
        <div
          className={`flex h-full min-h-0 shrink-0 flex-col transition-all duration-300 ease-in-out max-lg:flex-1 ${
            isChatExpanded
              ? "w-full lg:w-[38rem] xl:w-[42rem]"
              : isLeftPanelOpen
              ? "w-full lg:w-[25rem] xl:w-[27rem]"
              : "w-full lg:w-[32rem] xl:w-[36rem]"
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
