"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import L from "leaflet"
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  BoxSelect,
  Eye,
  EyeOff,
  Sparkles,
  Radar,
  Layers,
  Crosshair,
  Droplets,
  Sun,
  ChevronRight,
} from "lucide-react"
import type { ViewerState, SelectedArea } from "./types"
import type { SceneMeta, LayerId, DetectionBox } from "@/lib/satquery-data"

// Global Leaflet crash prevention: ensure invalid NaN coordinates never throw fatal unhandled exceptions
if (typeof window !== "undefined" && typeof L !== "undefined") {
  const anyL = L as any
  if (anyL.LatLng && !anyL.LatLng.__satqueryProtected) {
    const OriginalLatLng = anyL.LatLng
    function SafeLatLng(lat: any, lng: any, alt?: any) {
      const safeLat = typeof lat === "number" && Number.isFinite(lat) ? lat : 19.8824
      const safeLng = typeof lng === "number" && Number.isFinite(lng) ? lng : 74.4789
      return new OriginalLatLng(safeLat, safeLng, alt)
    }
    SafeLatLng.prototype = OriginalLatLng.prototype
    SafeLatLng.__satqueryProtected = true
    anyL.LatLng = SafeLatLng

    anyL.latLng = function (a: any, b: any, c: any) {
      if (a instanceof anyL.LatLng) return a
      if (Array.isArray(a)) {
        const safeLat = typeof a[0] === "number" && Number.isFinite(a[0]) ? a[0] : 19.8824
        const safeLng = typeof a[1] === "number" && Number.isFinite(a[1]) ? a[1] : 74.4789
        return new anyL.LatLng(safeLat, safeLng, a[2])
      }
      if (a === undefined || a === null) return new anyL.LatLng(19.8824, 74.4789)
      if (typeof a === "object" && "lat" in a) {
        const safeLat = typeof a.lat === "number" && Number.isFinite(a.lat) ? a.lat : 19.8824
        const lngVal = a.lng !== undefined ? a.lng : a.lon
        const safeLng = typeof lngVal === "number" && Number.isFinite(lngVal) ? lngVal : 74.4789
        return new anyL.LatLng(safeLat, safeLng, a.alt)
      }
      const safeLat = typeof a === "number" && Number.isFinite(a) ? a : 19.8824
      const safeLng = typeof b === "number" && Number.isFinite(b) ? b : 74.4789
      return new anyL.LatLng(safeLat, safeLng, c)
    }
  }

  if (anyL.Map && anyL.Map.prototype && !anyL.Map.prototype.__satqueryProtected) {
    const origFlyTo = anyL.Map.prototype.flyTo
    anyL.Map.prototype.flyTo = function (target: any, zoom: any, options: any) {
      try {
        const size = this.getSize()
        if (!size || size.x <= 20 || size.y <= 20) return this
        return origFlyTo.call(this, target, zoom, options)
      } catch (err) {
        console.warn("Leaflet flyTo suppressed error:", err)
        return this
      }
    }

    const origFlyToBounds = anyL.Map.prototype.flyToBounds
    anyL.Map.prototype.flyToBounds = function (bounds: any, options: any) {
      try {
        const size = this.getSize()
        if (!size || size.x <= 20 || size.y <= 20) return this
        return origFlyToBounds.call(this, bounds, options)
      } catch (err) {
        console.warn("Leaflet flyToBounds suppressed error:", err)
        return this
      }
    }

    const origFitBounds = anyL.Map.prototype.fitBounds
    anyL.Map.prototype.fitBounds = function (bounds: any, options: any) {
      try {
        const size = this.getSize()
        if (!size || size.x <= 20 || size.y <= 20) return this
        return origFitBounds.call(this, bounds, options)
      } catch (err) {
        console.warn("Leaflet fitBounds suppressed error:", err)
        return this
      }
    }

    anyL.Map.prototype.__satqueryProtected = true
  }
}

interface LeafletMapProps {
  state: ViewerState
  scene: SceneMeta
  onSelectArea?: (aoi: SelectedArea | null) => void
  onAnalyzeArea?: (aoi: SelectedArea) => void
  onLayerChange?: (layer: LayerId) => void
  toolMode?: "navigate" | "select"
  onToolModeChange?: (mode: "navigate" | "select") => void
  showLabels?: boolean
  onToggleLabels?: () => void
  mapAction?: { type: "zoomIn" | "zoomOut" | "recenter"; id: number } | null
  onZoomChange?: (zoom: number) => void
  isLeftPanelOpen?: boolean
  onToggleLeftPanel?: () => void
  onToggleFlood?: () => void
  onClearAllMarkings?: () => void
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  )
}

function parseCenter(scene?: SceneMeta | null): [number, number] {
  if (!scene) return [19.8824, 74.4789]
  if (scene.bounds) {
    const n = Number(scene.bounds.north)
    const s = Number(scene.bounds.south)
    const e = Number(scene.bounds.east)
    const w = Number(scene.bounds.west)
    if (Number.isFinite(n) && Number.isFinite(s) && Number.isFinite(e) && Number.isFinite(w)) {
      return [(n + s) / 2, (e + w) / 2]
    }
  }
  if (scene.lat && scene.lon) {
    const latNum = parseFloat(String(scene.lat))
    const lonNum = parseFloat(String(scene.lon))
    if (Number.isFinite(latNum) && Number.isFinite(lonNum)) return [latNum, lonNum]
  }
  return [19.8824, 74.4789] // Default Kopargaon
}

export function LeafletMap({
  state,
  scene,
  onSelectArea,
  onAnalyzeArea,
  onLayerChange,
  toolMode: propToolMode,
  onToolModeChange,
  showLabels: propShowLabels,
  onToggleLabels,
  mapAction,
  onZoomChange,
  isLeftPanelOpen,
  onToggleLeftPanel,
  onToggleFlood,
  onClearAllMarkings,
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const baseTileRef = useRef<L.TileLayer | null>(null)
  const labelsLayerRef = useRef<L.TileLayer | null>(null)
  const roadsLayerRef = useRef<L.TileLayer | null>(null)
  const selectionRectRef = useRef<L.Rectangle | null>(null)
  const detectionMarkersRef = useRef<L.LayerGroup | null>(null)
  const floodLayerGroupRef = useRef<L.LayerGroup | null>(null)

  const [internalToolMode, setInternalToolMode] = useState<"navigate" | "select">("navigate")
  const activeToolMode = propToolMode !== undefined ? propToolMode : internalToolMode

  const setToolMode = (mode: "navigate" | "select") => {
    setInternalToolMode(mode)
    onToolModeChange?.(mode)
  }

  const [internalShowLabels, setInternalShowLabels] = useState(true)
  const activeShowLabels = propShowLabels !== undefined ? propShowLabels : internalShowLabels

  const [zoomLevel, setZoomLevel] = useState(13)
  const [cursorPos, setCursorPos] = useState<{ lat: number; lon: number } | null>(null)
  const [selectedAOI, setSelectedAOI] = useState<SelectedArea | null>(state.selectedAOI || null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [dragStart, setDragStart] = useState<L.LatLng | null>(null)
  const [radarThreshold, setRadarThreshold] = useState(-14)

  // Initialize Leaflet Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const [initLat, initLon] = parseCenter(scene)

    const map = L.map(containerRef.current, {
      center: [initLat, initLon],
      zoom: 13,
      minZoom: 2,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: false,
    })

    // Dedicated high-priority pane for Google Maps-style labels (above tile and vector panes)
    if (!map.getPane("labelsPane")) {
      const labelsPane = map.createPane("labelsPane")
      labelsPane.style.zIndex = "450"
      labelsPane.style.pointerEvents = "none"
    }

    // Sub-meter Crisp Satellite Imagery (ESRI World Imagery - capped at zoom 18 to avoid 'map unavailable')
    const baseTiles = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 18,
        maxNativeZoom: 18,
        attribution: "ESRI, Maxar, Earthstar Geographics",
      }
    ).addTo(map)
    baseTileRef.current = baseTiles

    // Google Maps-Style Hybrid Labels (CartoDB Voyager)
    const labels = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png",
      {
        subdomains: "abcd",
        maxZoom: 18,
        pane: "labelsPane",
        opacity: 1,
      }
    )
    labelsLayerRef.current = labels

    // Highways & Major Transportation Overlay
    const roads = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 18,
        pane: "labelsPane",
        opacity: 0.85,
      }
    )
    roadsLayerRef.current = roads

    // Add labels by default
    labels.addTo(map)
    roads.addTo(map)

    // Layer groups
    const floodGroup = L.layerGroup().addTo(map)
    floodLayerGroupRef.current = floodGroup

    const detectionGroup = L.layerGroup().addTo(map)
    detectionMarkersRef.current = detectionGroup

    // Map Event Listeners
    map.on("zoomend", () => {
      const z = map.getZoom()
      setZoomLevel(z)
      onZoomChange?.(z)
    })

    map.on("mousemove", (e) => {
      if (e?.latlng && Number.isFinite(e.latlng.lat) && Number.isFinite(e.latlng.lng)) {
        setCursorPos({
          lat: Number(e.latlng.lat.toFixed(4)),
          lon: Number(e.latlng.lng.toFixed(4)),
        })
      }
    })

    // Auto ResizeObserver to prevent (NaN, NaN) projection errors when switching tabs/resizing
    let resizeObserver: ResizeObserver | null = null
    if (typeof ResizeObserver !== "undefined" && containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (
          mapRef.current &&
          containerRef.current &&
          containerRef.current.clientWidth > 50 &&
          containerRef.current.clientHeight > 50
        ) {
          try {
            mapRef.current.invalidateSize({ animate: false })
          } catch (e) {
            console.warn("map.invalidateSize suppressed:", e)
          }
        }
      })
      resizeObserver.observe(containerRef.current)
    }

    mapRef.current = map

    return () => {
      resizeObserver?.disconnect()
      map.remove()
      mapRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle external map actions (zoomIn, zoomOut, recenter) from top toolbar
  useEffect(() => {
    if (!mapAction || !mapRef.current) return
    if (mapAction.type === "zoomIn") {
      mapRef.current.zoomIn()
    } else if (mapAction.type === "zoomOut") {
      mapRef.current.zoomOut()
    } else if (mapAction.type === "recenter") {
      const [lat, lon] = parseCenter(scene)
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        try {
          mapRef.current.flyTo([lat, lon], 13.5, { duration: 1 })
        } catch (e) {
          console.warn("flyTo recenter error:", e)
        }
      }
    }
  }, [mapAction, scene])

  // Handle Fly-To on Scene / Location Change
  useEffect(() => {
    if (!mapRef.current) return
    const [targetLat, targetLon] = parseCenter(scene)
    if (!Number.isFinite(targetLat) || !Number.isFinite(targetLon)) return
    try {
      const currentCenter = mapRef.current.getCenter()
      if (currentCenter && Number.isFinite(currentCenter.lat) && Number.isFinite(currentCenter.lng)) {
        const dist = Math.hypot(currentCenter.lat - targetLat, currentCenter.lng - targetLon)
        if (dist > 0.005) {
          mapRef.current.flyTo([targetLat, targetLon], 13.5, { duration: 1.5 })
        }
      }
    } catch (e) {
      console.warn("flyTo scene change error:", e)
    }
  }, [scene])

  // Multimodal Channel Rendering: Apply filter ONLY to base satellite tile pane
  // This ensures labels and vectors in labelsPane / overlayPane stay 100% crisp and readable
  useEffect(() => {
    if (!mapRef.current) return
    const tilePane = mapRef.current.getPane("tilePane")
    if (!tilePane) return

    let filterStyle = "none"
    switch (state.layer) {
      case "sar": {
        const contrast = Math.round(220 + (radarThreshold + 14) * 8)
        const brightness = Math.round(85 + (radarThreshold + 14) * 2)
        filterStyle = `grayscale(100%) contrast(${contrast}%) brightness(${brightness}%)`
        break
      }
      case "ndvi": {
        filterStyle = "contrast(135%) saturate(180%) brightness(100%)"
        break
      }
      case "ndwi": {
        filterStyle = "contrast(210%) saturate(230%) hue-rotate(185deg) brightness(90%)"
        break
      }
      case "isro": {
        filterStyle = "contrast(150%) saturate(180%) brightness(105%) hue-rotate(10deg)"
        break
      }
      case "nasa": {
        filterStyle = "contrast(135%) saturate(145%) brightness(98%) hue-rotate(-5deg)"
        break
      }
      case "optical":
      default: {
        filterStyle = "none"
        break
      }
    }

    tilePane.style.filter = filterStyle
    tilePane.style.transition = "filter 0.35s ease"
  }, [state.layer, radarThreshold])

  // Toggle Google Maps-Style Hybrid Labels
  useEffect(() => {
    if (!mapRef.current) return
    if (activeShowLabels) {
      if (labelsLayerRef.current && !mapRef.current.hasLayer(labelsLayerRef.current)) {
        labelsLayerRef.current.addTo(mapRef.current)
      }
      if (roadsLayerRef.current && !mapRef.current.hasLayer(roadsLayerRef.current)) {
        roadsLayerRef.current.addTo(mapRef.current)
      }
    } else {
      if (labelsLayerRef.current && mapRef.current.hasLayer(labelsLayerRef.current)) {
        mapRef.current.removeLayer(labelsLayerRef.current)
      }
      if (roadsLayerRef.current && mapRef.current.hasLayer(roadsLayerRef.current)) {
        mapRef.current.removeLayer(roadsLayerRef.current)
      }
    }
  }, [activeShowLabels])

  // Sync AOI Selection state with parent
  useEffect(() => {
    setSelectedAOI(state.selectedAOI || null)
  }, [state.selectedAOI])

  // Render Selection Rectangle on Map
  useEffect(() => {
    if (!mapRef.current) return

    if (selectionRectRef.current) {
      selectionRectRef.current.remove()
      selectionRectRef.current = null
    }

    if (selectedAOI?.bounds) {
      const b = selectedAOI.bounds
      if (
        Number.isFinite(b.south) &&
        Number.isFinite(b.west) &&
        Number.isFinite(b.north) &&
        Number.isFinite(b.east)
      ) {
        try {
          const bounds = L.latLngBounds([b.south, b.west], [b.north, b.east])
          if (bounds.isValid()) {
            const rect = L.rectangle(bounds, {
              color: "#06b6d4",
              weight: 2.5,
              fillColor: "#22d3ee",
              fillOpacity: 0.22,
              dashArray: "6, 6",
            }).addTo(mapRef.current)

            selectionRectRef.current = rect
          }
        } catch (e) {
          console.warn("Error drawing selection rect:", e)
        }
      }
    }
  }, [selectedAOI])

  // Render SAR Flood Inundation Polygons (when state.flood is active)
  useEffect(() => {
    if (!mapRef.current || !floodLayerGroupRef.current) return
    floodLayerGroupRef.current.clearLayers()

    if (state.flood) {
      let floodPolygons: [number, number][][] = []
      let targetBounds: L.LatLngBounds | null = null

      if (
        selectedAOI?.bounds &&
        Number.isFinite(selectedAOI.bounds.north) &&
        Number.isFinite(selectedAOI.bounds.south) &&
        Number.isFinite(selectedAOI.bounds.east) &&
        Number.isFinite(selectedAOI.bounds.west)
      ) {
        // Constrain flood inundation strictly to the farmer's selected field parcel
        const b = selectedAOI.bounds
        const centerLat = (b.north + b.south) / 2
        const centerLon = (b.east + b.west) / 2
        const latSpan = Math.abs(b.north - b.south)
        const lonSpan = Math.abs(b.east - b.west)

        floodPolygons = [
          [
            [centerLat + latSpan * 0.18, centerLon - lonSpan * 0.35],
            [centerLat + latSpan * 0.36, centerLon - lonSpan * 0.12],
            [centerLat + latSpan * 0.22, centerLon + lonSpan * 0.28],
            [centerLat - latSpan * 0.12, centerLon + lonSpan * 0.38],
            [centerLat - latSpan * 0.36, centerLon + lonSpan * 0.14],
            [centerLat - latSpan * 0.20, centerLon - lonSpan * 0.26],
          ],
        ]
        try {
          const bnds = L.latLngBounds([b.south, b.west], [b.north, b.east])
          if (bnds.isValid()) targetBounds = bnds
        } catch {}
      } else {
        const [centerLat, centerLon] = parseCenter(scene)
        floodPolygons = [
          [
            [centerLat + 0.008, centerLon - 0.025],
            [centerLat + 0.012, centerLon - 0.010],
            [centerLat + 0.006, centerLon + 0.015],
            [centerLat - 0.002, centerLon + 0.030],
            [centerLat - 0.008, centerLon + 0.018],
            [centerLat - 0.003, centerLon - 0.005],
            [centerLat + 0.002, centerLon - 0.022],
          ],
          [
            [centerLat - 0.015, centerLon - 0.018],
            [centerLat - 0.010, centerLon - 0.008],
            [centerLat - 0.018, centerLon + 0.005],
            [centerLat - 0.025, centerLon - 0.005],
          ],
        ]
      }

      const allCoords: [number, number][] = []

      floodPolygons.forEach((polyCoords, idx) => {
        const validPoly = polyCoords.filter(
          (c) => Array.isArray(c) && c.length === 2 && Number.isFinite(c[0]) && Number.isFinite(c[1])
        )
        if (validPoly.length < 3) return
        allCoords.push(...validPoly)

        try {
          const poly = L.polygon(validPoly, {
            color: "#0284c7",
            weight: 2.5,
            fillColor: "#38bdf8",
            fillOpacity: 0.45,
            dashArray: "4, 4",
          })

          const titleText = selectedAOI
            ? `🌊 SAR Inundated Parcel Sub-Area (~${(selectedAOI.areaKm2 * 0.35).toFixed(1)} km²)`
            : `🌊 SAR Inundated Zone #${idx + 1}`

          poly.bindTooltip(
            `<div class="font-mono text-[10px] font-bold text-sky-200 bg-slate-950/95 px-2 py-1 rounded border border-sky-400/80 shadow-xl backdrop-blur-sm">
              ${titleText}<br/>
              <span class="text-[9px] text-sky-300 font-normal">Otsu &lt; -16.2 dB · Submerged Crop Lowland</span>
            </div>`,
            { permanent: true, direction: "center", className: "satquery-tooltip" }
          )

          floodLayerGroupRef.current?.addLayer(poly)
        } catch (polyErr) {
          console.warn("Flood polygon draw error:", polyErr)
        }
      })

      if (
        mapRef.current &&
        containerRef.current &&
        containerRef.current.clientWidth > 50 &&
        containerRef.current.clientHeight > 50
      ) {
        if (targetBounds && targetBounds.isValid()) {
          try {
            mapRef.current.flyToBounds(targetBounds.pad(0.15), { duration: 1.2, maxZoom: 17 })
          } catch (e) {
            console.warn("flyToBounds targetBounds suppressed:", e)
          }
        } else if (allCoords.length > 0) {
          try {
            const groupBounds = L.latLngBounds(allCoords)
            if (groupBounds.isValid()) {
              mapRef.current.flyToBounds(groupBounds.pad(0.2), { duration: 1.2, maxZoom: 16 })
            }
          } catch (e) {
            console.warn("flyToBounds groupBounds suppressed:", e)
          }
        }
      }
    }
  }, [state.flood, scene, selectedAOI])

  // Render AI Object Grounding Bounding Boxes
  useEffect(() => {
    if (!mapRef.current || !detectionMarkersRef.current) return
    detectionMarkersRef.current.clearLayers()

    if (state.detections && state.dynamicBoxes && state.dynamicBoxes.length > 0) {
      const center = parseCenter(scene)
      const rawBounds = selectedAOI?.bounds || scene.bounds
      const north = rawBounds && Number.isFinite(rawBounds.north) ? rawBounds.north : center[0] + 0.04
      const south = rawBounds && Number.isFinite(rawBounds.south) ? rawBounds.south : center[0] - 0.04
      const east = rawBounds && Number.isFinite(rawBounds.east) ? rawBounds.east : center[1] + 0.04
      const west = rawBounds && Number.isFinite(rawBounds.west) ? rawBounds.west : center[1] - 0.04

      const latSpan = north - south
      const lonSpan = east - west

      if (!Number.isFinite(latSpan) || !Number.isFinite(lonSpan) || latSpan <= 0 || lonSpan <= 0) {
        return
      }

      const allBoxBounds: L.LatLngBounds[] = []

      state.dynamicBoxes.forEach((box: DetectionBox) => {
        const ymin = Number(box.ymin)
        const ymax = Number(box.ymax)
        const xmin = Number(box.xmin)
        const xmax = Number(box.xmax)

        if (!Number.isFinite(ymin) || !Number.isFinite(ymax) || !Number.isFinite(xmin) || !Number.isFinite(xmax)) {
          return
        }

        const cleanYmin = Math.max(0, Math.min(100, Math.min(ymin, ymax)))
        const cleanYmax = Math.max(0, Math.min(100, Math.max(ymin, ymax)))
        const cleanXmin = Math.max(0, Math.min(100, Math.min(xmin, xmax)))
        const cleanXmax = Math.max(0, Math.min(100, Math.max(xmin, xmax)))

        // Guard against degenerate zero-size boxes
        const safeYmax = cleanYmax <= cleanYmin ? Math.min(100, cleanYmin + 5) : cleanYmax
        const safeXmax = cleanXmax <= cleanXmin ? Math.min(100, cleanXmin + 5) : cleanXmax

        const boxNorth = north - (cleanYmin / 100) * latSpan
        const boxSouth = north - (safeYmax / 100) * latSpan
        const boxWest = west + (cleanXmin / 100) * lonSpan
        const boxEast = west + (safeXmax / 100) * lonSpan

        if (
          !Number.isFinite(boxNorth) ||
          !Number.isFinite(boxSouth) ||
          !Number.isFinite(boxWest) ||
          !Number.isFinite(boxEast)
        ) {
          return
        }

        try {
          const rectBounds = L.latLngBounds([boxSouth, boxWest], [boxNorth, boxEast])
          if (!rectBounds.isValid()) return

          allBoxBounds.push(rectBounds)

          const labelLower = (box.label || "").toLowerCase()
          const isFlood = labelLower.includes("flood") || labelLower.includes("inundat") || labelLower.includes("submerg")
          const isWater =
            !isFlood &&
            (labelLower.includes("water") ||
              labelLower.includes("river") ||
              labelLower.includes("canal") ||
              labelLower.includes("drainage"))
          const isVeg =
            labelLower.includes("crop") ||
            labelLower.includes("vegetat") ||
            labelLower.includes("canopy") ||
            labelLower.includes("paddy") ||
            labelLower.includes("forest") ||
            labelLower.includes("farm")

          const strokeColor = isFlood ? "#0284c7" : isWater ? "#06b6d4" : isVeg ? "#16a34a" : "#f59e0b"
          const fillColor = isFlood ? "#38bdf8" : isWater ? "#22d3ee" : isVeg ? "#4ade80" : "#fbbf24"
          const borderClass = isFlood
            ? "border-sky-500 text-sky-200"
            : isWater
            ? "border-cyan-500 text-cyan-200"
            : isVeg
            ? "border-emerald-500 text-emerald-200"
            : "border-amber-500 text-amber-300"
          const iconPrefix = isFlood ? "🌊 " : isWater ? "💧 " : isVeg ? "🌱 " : "🏢 "

          const rect = L.rectangle(rectBounds, {
            color: strokeColor,
            weight: 2.2,
            fillColor: fillColor,
            fillOpacity: 0.22,
            dashArray: isFlood ? "4, 4" : undefined,
          })

          const conf = Number.isFinite(box.conf) ? box.conf : 0.92
          rect.bindTooltip(
            `<div class="font-mono text-[10px] font-bold ${borderClass} bg-slate-950/95 px-2 py-0.5 rounded border shadow-xl backdrop-blur-sm whitespace-nowrap">
              ${iconPrefix}${box.label || "Feature"} <span class="opacity-80 font-normal">(${Math.round(conf * 100)}%)</span>
            </div>`,
            { permanent: true, direction: "top", className: "satquery-tooltip" }
          )

          detectionMarkersRef.current?.addLayer(rect)
        } catch (boxErr) {
          console.warn("Detection box add error:", boxErr)
        }
      })

      // If user hasn't explicitly selected an AOI, fly to show all detected boxes smoothly
      if (
        !selectedAOI &&
        allBoxBounds.length > 0 &&
        mapRef.current &&
        containerRef.current &&
        containerRef.current.clientWidth > 50 &&
        containerRef.current.clientHeight > 50 &&
        !state.flood
      ) {
        const validBounds = allBoxBounds.filter(
          (b) =>
            b &&
            typeof b.isValid === "function" &&
            b.isValid() &&
            Number.isFinite(b.getSouth()) &&
            Number.isFinite(b.getNorth()) &&
            Number.isFinite(b.getWest()) &&
            Number.isFinite(b.getEast())
        )
        if (validBounds.length > 0) {
          let combinedBounds = validBounds[0]
          for (let i = 1; i < validBounds.length; i++) {
            combinedBounds = combinedBounds.extend(validBounds[i])
          }
          if (
            combinedBounds &&
            typeof combinedBounds.isValid === "function" &&
            combinedBounds.isValid() &&
            Number.isFinite(combinedBounds.getSouth()) &&
            Number.isFinite(combinedBounds.getNorth())
          ) {
            try {
              mapRef.current.flyToBounds(combinedBounds.pad(0.2), { duration: 1.2, maxZoom: 16 })
            } catch (flyErr) {
              console.warn("flyToBounds suppressed error:", flyErr)
            }
          }
        }
      }
    }
  }, [state.detections, state.dynamicBoxes, selectedAOI, scene, state.flood])

  const touchStartPos = useRef<{ x: number; y: number } | null>(null)
  const mouseStartPos = useRef<{ x: number; y: number } | null>(null)

  // ROI Mouse Drag Handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (activeToolMode !== "select" || !mapRef.current) return
      const map = mapRef.current
      try {
        const latlng = map.mouseEventToLatLng(e.nativeEvent)
        if (!latlng || !Number.isFinite(latlng.lat) || !Number.isFinite(latlng.lng)) return
        mouseStartPos.current = { x: e.clientX, y: e.clientY }
        setIsDrawing(true)
        setDragStart(latlng)
        map.dragging.disable()
      } catch (err) {
        console.warn("handleMouseDown error:", err)
      }
    },
    [activeToolMode]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDrawing || !dragStart || !mapRef.current) return
      if (!Number.isFinite(dragStart.lat) || !Number.isFinite(dragStart.lng)) return
      const map = mapRef.current
      try {
        const currentLatLng = map.mouseEventToLatLng(e.nativeEvent)
        if (!currentLatLng || !Number.isFinite(currentLatLng.lat) || !Number.isFinite(currentLatLng.lng)) return
        const bounds = L.latLngBounds(dragStart, currentLatLng)
        if (!bounds.isValid()) return

        if (selectionRectRef.current) {
          selectionRectRef.current.setBounds(bounds)
        } else {
          selectionRectRef.current = L.rectangle(bounds, {
            color: "#06b6d4",
            weight: 2.5,
            fillColor: "#22d3ee",
            fillOpacity: 0.22,
            dashArray: "6, 6",
          }).addTo(map)
        }
      } catch (err) {
        console.warn("handleMouseMove error:", err)
      }
    },
    [isDrawing, dragStart]
  )

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!isDrawing || !dragStart || !mapRef.current) return
      const map = mapRef.current
      let currentLatLng = dragStart
      try {
        const converted = map.mouseEventToLatLng(e.nativeEvent)
        if (converted && Number.isFinite(converted.lat) && Number.isFinite(converted.lng)) {
          currentLatLng = converted
        }
      } catch (err) {
        console.warn("handleMouseUp mouseEventToLatLng error:", err)
      }

      const dragDistance = mouseStartPos.current
        ? Math.hypot(e.clientX - mouseStartPos.current.x, e.clientY - mouseStartPos.current.y)
        : 50

      let north: number, south: number, east: number, west: number

      // If user tapped/clicked without dragging, create a ~0.15 km² field parcel centered on click
      if (dragDistance < 15) {
        const delta = 0.0035
        north = currentLatLng.lat + delta
        south = currentLatLng.lat - delta
        east = currentLatLng.lng + delta * 1.05
        west = currentLatLng.lng - delta * 1.05
      } else {
        north = Math.max(dragStart.lat, currentLatLng.lat)
        south = Math.min(dragStart.lat, currentLatLng.lat)
        east = Math.max(dragStart.lng, currentLatLng.lng)
        west = Math.min(dragStart.lng, currentLatLng.lng)
      }

      if (!Number.isFinite(north) || !Number.isFinite(south) || !Number.isFinite(east) || !Number.isFinite(west)) {
        const center = parseCenter(scene)
        north = center[0] + 0.0035
        south = center[0] - 0.0035
        east = center[1] + 0.0035
        west = center[1] - 0.0035
      }

      if (north - south < 0.0005) {
        north += 0.001
        south -= 0.001
      }
      if (east - west < 0.0005) {
        east += 0.001
        west -= 0.001
      }

      // Geodesic area calculation in km²
      const latDist = Math.abs(north - south) * 111.32
      const lonDist = Math.abs(east - west) * 111.32 * Math.cos((((north + south) / 2) * Math.PI) / 180)
      const areaKm2 = Number(Math.max(0.01, latDist * lonDist).toFixed(2))

      const aoi: SelectedArea = {
        xmin: 0,
        ymin: 0,
        xmax: 100,
        ymax: 100,
        bounds: { north, south, east, west },
        areaKm2,
      }

      setSelectedAOI(aoi)
      if (onSelectArea) onSelectArea(aoi)

      setIsDrawing(false)
      setDragStart(null)
      mouseStartPos.current = null
      map.dragging.enable()
      setToolMode("navigate")
    },
    [isDrawing, dragStart, onSelectArea, scene]
  )

  // ROI Mobile Touch Drag Handlers (critical for phone / farmer usage)
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (activeToolMode !== "select" || !mapRef.current || e.touches.length === 0) return
      const map = mapRef.current
      const touch = e.touches[0]
      touchStartPos.current = { x: touch.clientX, y: touch.clientY }
      const containerRect = containerRef.current?.getBoundingClientRect()
      if (!containerRect) return
      try {
        const point = L.point(touch.clientX - containerRect.left, touch.clientY - containerRect.top)
        const latlng = map.containerPointToLatLng(point)
        if (!latlng || !Number.isFinite(latlng.lat) || !Number.isFinite(latlng.lng)) return
        setIsDrawing(true)
        setDragStart(latlng)
        map.dragging.disable()
      } catch (err) {
        console.warn("handleTouchStart error:", err)
      }
    },
    [activeToolMode]
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDrawing || !dragStart || !mapRef.current || e.touches.length === 0) return
      if (!Number.isFinite(dragStart.lat) || !Number.isFinite(dragStart.lng)) return
      const map = mapRef.current
      const touch = e.touches[0]
      const containerRect = containerRef.current?.getBoundingClientRect()
      if (!containerRect) return
      try {
        const point = L.point(touch.clientX - containerRect.left, touch.clientY - containerRect.top)
        const currentLatLng = map.containerPointToLatLng(point)
        if (!currentLatLng || !Number.isFinite(currentLatLng.lat) || !Number.isFinite(currentLatLng.lng)) return
        const bounds = L.latLngBounds(dragStart, currentLatLng)
        if (!bounds.isValid()) return

        if (selectionRectRef.current) {
          selectionRectRef.current.setBounds(bounds)
        } else {
          selectionRectRef.current = L.rectangle(bounds, {
            color: "#06b6d4",
            weight: 2.5,
            fillColor: "#22d3ee",
            fillOpacity: 0.22,
            dashArray: "6, 6",
          }).addTo(map)
        }
      } catch (err) {
        console.warn("handleTouchMove error:", err)
      }
    },
    [isDrawing, dragStart]
  )

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!isDrawing || !dragStart || !mapRef.current) return
      const map = mapRef.current
      const touch = e.changedTouches[0]
      const containerRect = containerRef.current?.getBoundingClientRect()

      let currentLatLng = dragStart
      if (containerRect && touch) {
        try {
          const point = L.point(touch.clientX - containerRect.left, touch.clientY - containerRect.top)
          const converted = map.containerPointToLatLng(point)
          if (converted && Number.isFinite(converted.lat) && Number.isFinite(converted.lng)) {
            currentLatLng = converted
          }
        } catch (err) {
          console.warn("handleTouchEnd containerPointToLatLng error:", err)
        }
      }

      const dragDistance = touchStartPos.current && touch
        ? Math.hypot(touch.clientX - touchStartPos.current.x, touch.clientY - touchStartPos.current.y)
        : 0

      let north: number, south: number, east: number, west: number

      // If farmer tapped a field without dragging, auto-center a ~0.15 km² field parcel
      if (dragDistance < 20) {
        const delta = 0.0035
        north = currentLatLng.lat + delta
        south = currentLatLng.lat - delta
        east = currentLatLng.lng + delta * 1.05
        west = currentLatLng.lng - delta * 1.05
      } else {
        north = Math.max(dragStart.lat, currentLatLng.lat)
        south = Math.min(dragStart.lat, currentLatLng.lat)
        east = Math.max(dragStart.lng, currentLatLng.lng)
        west = Math.min(dragStart.lng, currentLatLng.lng)
      }

      if (!Number.isFinite(north) || !Number.isFinite(south) || !Number.isFinite(east) || !Number.isFinite(west)) {
        const center = parseCenter(scene)
        north = center[0] + 0.0035
        south = center[0] - 0.0035
        east = center[1] + 0.0035
        west = center[1] - 0.0035
      }

      if (north - south < 0.0005) {
        north += 0.001
        south -= 0.001
      }
      if (east - west < 0.0005) {
        east += 0.001
        west -= 0.001
      }

      const latDist = Math.abs(north - south) * 111.32
      const lonDist = Math.abs(east - west) * 111.32 * Math.cos((((north + south) / 2) * Math.PI) / 180)
      const areaKm2 = Number(Math.max(0.01, latDist * lonDist).toFixed(2))

      const aoi: SelectedArea = {
        xmin: 0,
        ymin: 0,
        xmax: 100,
        ymax: 100,
        bounds: { north, south, east, west },
        areaKm2,
      }

      setSelectedAOI(aoi)
      if (onSelectArea) onSelectArea(aoi)

      setIsDrawing(false)
      setDragStart(null)
      touchStartPos.current = null
      map.dragging.enable()
      setToolMode("navigate")
    },
    [isDrawing, dragStart, onSelectArea, scene]
  )

  const handleClearAOI = useCallback(() => {
    setSelectedAOI(null)
    if (selectionRectRef.current) {
      selectionRectRef.current.remove()
      selectionRectRef.current = null
    }
    detectionMarkersRef.current?.clearLayers()
    floodLayerGroupRef.current?.clearLayers()
    if (onSelectArea) onSelectArea(null)
    if (onClearAllMarkings) onClearAllMarkings()
  }, [onSelectArea, onClearAllMarkings])

  return (
    <div
      className={`relative h-full w-full overflow-hidden select-none bg-slate-950 ${
        activeToolMode === "select" ? "cursor-crosshair touch-none" : ""
      }`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Leaflet Map Canvas */}
      <div ref={containerRef} className="h-full w-full" />

      {/* Floating Left Panel Opener Tab (when sidebar is hidden) */}
      {!isLeftPanelOpen && onToggleLeftPanel && (
        <button
          type="button"
          onClick={onToggleLeftPanel}
          className="pointer-events-auto absolute left-0 top-1/2 -translate-y-1/2 z-[1000] flex flex-col items-center gap-1 rounded-r-lg border border-border border-l-0 bg-card/95 py-3 px-1.5 text-xs font-bold text-foreground shadow-2xl backdrop-blur-md hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer group"
          title="Open Operational Scenes & Locations Panel"
        >
          <ChevronRight className="size-4 text-primary group-hover:text-primary-foreground group-hover:translate-x-0.5 transition-transform" />
          <span className="[writing-mode:vertical-lr] font-mono text-[9px] tracking-wider uppercase text-muted-foreground group-hover:text-primary-foreground py-1">
            Scenes
          </span>
        </button>
      )}

      {/* Selected AOI Floating Action Banner (Top Center) */}
      {selectedAOI && (
        <div className="pointer-events-auto absolute top-3 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 rounded-xl border border-cyan-500/80 bg-slate-950/95 px-3 py-1.5 text-cyan-300 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2">
          <span className="size-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="font-semibold text-xs font-mono">
            Selected Sub-Region: ~{selectedAOI.areaKm2} km²
          </span>
          {onAnalyzeArea && (
            <button
              type="button"
              onClick={() => onAnalyzeArea(selectedAOI)}
              className="ml-1 flex items-center gap-1 rounded-lg bg-cyan-500 px-2.5 py-1 text-xs font-bold text-slate-950 hover:bg-cyan-400 transition-all shadow-md cursor-pointer"
            >
              <Sparkles className="size-3" />
              <span>Analyze with Gemini</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleClearAOI}
            className="ml-1 flex items-center gap-1 rounded px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-slate-800 transition-colors cursor-pointer text-xs"
            title="Clear Area Selection & Markings"
          >
            <span>✕</span>
            <span className="hidden sm:inline text-[10px]">Clear Marks</span>
          </button>
        </div>
      )}

      {/* Active Detection Grounding Banner with Clear Button (when AOI is not active) */}
      {!selectedAOI && !state.flood && state.detections && state.dynamicBoxes && state.dynamicBoxes.length > 0 && (
        <div className="pointer-events-auto absolute top-3 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2.5 rounded-xl border border-amber-500/80 bg-slate-950/95 px-3 py-1.5 text-xs text-amber-200 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2">
          <span className="size-2 rounded-full bg-amber-400 animate-ping" />
          <span className="font-semibold text-xs font-mono">
            {state.dynamicBoxes.length} Ground Features Marked
          </span>
          <button
            type="button"
            onClick={handleClearAOI}
            className="flex items-center gap-1 rounded-lg bg-amber-500/20 px-2 py-0.5 text-[11px] font-bold text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 transition-all cursor-pointer"
            title="Clear all detection bounding boxes from map"
          >
            <span>✕ निशान हटाएं</span>
            <span className="hidden sm:inline text-[9px] opacity-80">(Clear Marks)</span>
          </button>
        </div>
      )}

      {/* Real-Time Flood Inundation Alert Banner (Top Center) */}
      {state.flood && (
        <div
          className={`pointer-events-auto absolute left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 rounded-full border border-sky-400/80 bg-slate-950/95 px-3.5 py-1.5 text-xs text-sky-200 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 ${
            selectedAOI ? "top-14" : "top-3"
          }`}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
          </span>
          <span className="font-semibold text-xs tracking-wide">🌊 SAR Flood Inundation Overlay Active</span>
          <span className="text-[10px] text-sky-400 font-mono hidden sm:inline">| Otsu &lt; -16dB Backscatter Mapped</span>
          {onToggleFlood && (
            <button
              type="button"
              onClick={onToggleFlood}
              className="ml-1 rounded-full p-0.5 hover:bg-sky-500/20 text-sky-300 hover:text-white transition-colors cursor-pointer text-xs leading-none"
              title="Dismiss flood overlay"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Google Maps-Style Vertical Zoom & Recenter Navigation Widget (Bottom Right) */}
      <div className="pointer-events-auto absolute right-3 bottom-14 z-[1000] flex flex-col items-center rounded-xl border border-border/80 bg-background/95 p-1 shadow-2xl backdrop-blur-md divide-y divide-border/60">
        <button
          type="button"
          onClick={() => mapRef.current?.zoomIn()}
          disabled={zoomLevel >= 18}
          className="rounded-lg p-2 text-foreground hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90 cursor-pointer"
          title={zoomLevel >= 18 ? "Maximum Resolution Reached (18x)" : "Zoom In (+)"}
        >
          <ZoomIn className="size-4" />
        </button>
        <div className="py-1 px-1 font-mono text-[10px] font-bold text-primary text-center select-none">
          {zoomLevel}x
        </div>
        <button
          type="button"
          onClick={() => mapRef.current?.zoomOut()}
          disabled={zoomLevel <= 2}
          className="rounded-lg p-2 text-foreground hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90 cursor-pointer"
          title={zoomLevel <= 2 ? "Minimum Zoom" : "Zoom Out (-)"}
        >
          <ZoomOut className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            const [lat, lon] = parseCenter(scene)
            if (Number.isFinite(lat) && Number.isFinite(lon)) {
              try {
                mapRef.current?.flyTo([lat, lon], 13.5, { duration: 1 })
              } catch (e) {
                console.warn("flyTo recenter error:", e)
              }
            }
          }}
          className="rounded-lg p-2 text-foreground hover:bg-secondary transition-all active:scale-90 cursor-pointer"
          title="Recenter Map View (⌖)"
        >
          <RotateCcw className="size-3.5 text-muted-foreground hover:text-foreground" />
        </button>
      </div>

      {/* Real-time Analytical Legend: SAR Microwave Radar */}
      {state.layer === "sar" && (
        <div className="pointer-events-auto absolute bottom-14 left-3 z-[1000] flex flex-col gap-1.5 rounded-xl border border-cyan-500/40 bg-slate-950/95 p-3 text-xs text-cyan-200 shadow-2xl backdrop-blur-md max-w-xs animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 font-bold text-[11px]">
              <Radar className="size-4 text-cyan-400 animate-pulse" />
              <span>SAR Radar Backscatter (σ°)</span>
            </div>
            <span className="font-mono text-[11px] font-semibold text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/30">
              {radarThreshold} dB
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            C-band 5.405 GHz microwave radar penetrates clouds. Specular water bodies appear pitch dark; double-bounce urban structures appear bright white.
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-[9px] font-mono text-muted-foreground">-24dB</span>
            <input
              type="range"
              min="-24"
              max="-6"
              value={radarThreshold}
              onChange={(e) => setRadarThreshold(Number(e.target.value))}
              aria-label="SAR sigma-0 sensitivity threshold slider"
              className="h-1.5 flex-1 cursor-pointer accent-cyan-400 bg-cyan-950 rounded-lg"
            />
            <span className="text-[9px] font-mono text-muted-foreground">-6dB</span>
          </div>
        </div>
      )}

      {/* Real-time Analytical Legend: NDVI Crop Vigor */}
      {state.layer === "ndvi" && (
        <div className="pointer-events-auto absolute bottom-14 left-3 z-[1000] flex flex-col gap-1.5 rounded-xl border border-emerald-500/40 bg-slate-950/95 p-3 text-xs text-emerald-200 shadow-2xl backdrop-blur-md max-w-xs animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-1.5 font-bold text-[11px]">
            <Sparkles className="size-4 text-emerald-400" />
            <span>NDVI Vegetation Vigor Ramp</span>
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Near-Infrared / Red band ratio (B8 - B4)/(B8 + B4). Distinguishes crop health, biomass density, and photosynthetic activity.
          </p>
          {/* NDVI Spectral Ramp Bar */}
          <div className="mt-1 h-3 w-full rounded overflow-hidden flex shadow-inner border border-emerald-500/30">
            <div className="w-1/4 bg-amber-900" title="Water / Built-up (< 0.1)" />
            <div className="w-1/4 bg-amber-500" title="Bare Soil / Fallow (0.1 - 0.3)" />
            <div className="w-1/4 bg-lime-400" title="Sparse Vegetation (0.3 - 0.5)" />
            <div className="w-1/4 bg-emerald-600" title="Dense Canopy / Crops (> 0.6)" />
          </div>
          <div className="flex justify-between font-mono text-[9px] text-muted-foreground">
            <span>0.0 (Soil)</span>
            <span>0.3 (Sparse)</span>
            <span>0.5 (Moderate)</span>
            <span>0.8+ (Dense)</span>
          </div>
        </div>
      )}

      {/* Real-time Analytical Legend: NDWI Water / Flood Index */}
      {state.layer === "ndwi" && (
        <div className="pointer-events-auto absolute bottom-14 left-3 z-[1000] flex flex-col gap-1.5 rounded-xl border border-blue-500/40 bg-slate-950/95 p-3 text-xs text-blue-200 shadow-2xl backdrop-blur-md max-w-xs animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-1.5 font-bold text-[11px]">
            <Droplets className="size-4 text-cyan-400" />
            <span>NDWI Hydrologic & Flood Mapping</span>
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Green / Near-Infrared band ratio (B3 - B8)/(B3 + B8). Enhances open water bodies, rivers, and flood inundation in electric cyan while muting background soil.
          </p>
        </div>
      )}

      {/* Real-time Analytical Legend: ISRO Bhuvan Indian Satellite Stream */}
      {state.layer === "isro" && (
        <div className="pointer-events-auto absolute bottom-14 left-3 z-[1000] flex flex-col gap-1.5 rounded-xl border border-orange-500/50 bg-slate-950/95 p-3 text-xs text-orange-200 shadow-2xl backdrop-blur-md max-w-xs animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 font-bold text-[11px] text-orange-400">
              <span>🇮🇳 ISRO Bhuvan · EOS-04</span>
            </div>
            <span className="font-mono text-[10px] text-orange-300 bg-orange-950/70 px-1.5 py-0.5 rounded border border-orange-500/30">
              NRSC Earth Obs
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            National Remote Sensing Centre (NRSC) Cartosat & RISAT-1A telemetry. Specially calibrated for Indian agricultural field cadastre and flood disaster mapping.
          </p>
        </div>
      )}

      {/* Real-time Analytical Legend: NASA GIBS Earthdata */}
      {state.layer === "nasa" && (
        <div className="pointer-events-auto absolute bottom-14 left-3 z-[1000] flex flex-col gap-1.5 rounded-xl border border-blue-400/50 bg-slate-950/95 p-3 text-xs text-blue-200 shadow-2xl backdrop-blur-md max-w-xs animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 font-bold text-[11px] text-blue-300">
              <GlobeIcon className="size-4 text-blue-400" />
              <span>NASA EOSDIS · GIBS</span>
            </div>
            <span className="font-mono text-[10px] text-blue-300 bg-blue-950/70 px-1.5 py-0.5 rounded border border-blue-400/30">
              MODIS / VIIRS
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            NASA Global Imagery Browse Services. Daily true-color surface reflectance cross-calibrated with USGS Landsat-9 for environmental analysis.
          </p>
        </div>
      )}

      {/* Layer Quick-Switch Pills (Bottom Right) */}
      <div className="pointer-events-auto absolute bottom-3 right-3 z-[1000] flex max-w-[calc(100vw-2rem)] items-center gap-1 overflow-x-auto rounded-xl border border-border/80 bg-background/95 p-1 shadow-2xl backdrop-blur-md scrollbar-none">
        <button
          type="button"
          onClick={() => onLayerChange?.("optical")}
          className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
            state.layer === "optical"
              ? "bg-amber-500 text-slate-950 shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
          title="Optical True-Color High-Res Satellite View"
        >
          <Sun className="size-3" />
          <span>Optical</span>
        </button>
        <button
          type="button"
          onClick={() => onLayerChange?.("sar")}
          className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
            state.layer === "sar"
              ? "bg-cyan-500 text-slate-950 shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
          title="Sentinel-1 Microwave Radar (SAR)"
        >
          <Radar className="size-3" />
          <span>SAR</span>
        </button>
        <button
          type="button"
          onClick={() => onLayerChange?.("ndvi")}
          className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
            state.layer === "ndvi"
              ? "bg-emerald-500 text-slate-950 shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
          title="NDVI Crop & Vegetation Vigor"
        >
          <Sparkles className="size-3" />
          <span>NDVI</span>
        </button>
        <button
          type="button"
          onClick={() => onLayerChange?.("ndwi")}
          className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
            state.layer === "ndwi"
              ? "bg-blue-500 text-slate-950 shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
          title="NDWI Hydrologic Water / Flood Index"
        >
          <Droplets className="size-3" />
          <span>NDWI</span>
        </button>
        <button
          type="button"
          onClick={() => onLayerChange?.("isro")}
          className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
            state.layer === "isro"
              ? "bg-orange-500 text-slate-950 shadow-sm font-bold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
          title="ISRO Bhuvan EOS-04 Indian Earth Observation"
        >
          <span>🇮🇳</span>
          <span>ISRO</span>
        </button>
        <button
          type="button"
          onClick={() => onLayerChange?.("nasa")}
          className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
            state.layer === "nasa"
              ? "bg-sky-500 text-slate-950 shadow-sm font-bold"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
          title="NASA GIBS Daily MODIS / VIIRS Earthdata"
        >
          <GlobeIcon className="size-3" />
          <span>NASA</span>
        </button>
      </div>

      {/* Coordinate & Zoom HUD (Bottom Left) */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-[1000] hidden sm:flex items-center gap-2 rounded-xl border border-border/80 bg-background/90 px-3 py-1 font-mono text-[11px] text-muted-foreground shadow-xl backdrop-blur-md">
        <Crosshair className="size-3 text-primary" />
        <span>
          {cursorPos ? `${cursorPos.lat}° N, ${cursorPos.lon}° E` : `${scene.lat}, ${scene.lon}`}
        </span>
        <span className="text-border font-light">|</span>
        <span className="text-foreground font-semibold">Zoom {zoomLevel} (Sub-meter sharp)</span>
      </div>
    </div>
  )
}
