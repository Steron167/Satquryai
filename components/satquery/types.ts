import type { ResponseCard, LayerId, DetectionBox } from "@/lib/satquery-data"

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  text: string
  card?: ResponseCard
  sources?: string[]
  boundingBoxes?: DetectionBox[]
  recommendedLayer?: LayerId
  timestamp?: string
  aoi?: SelectedArea | null
}

export interface SelectedArea {
  xmin: number // 0-100%
  ymin: number // 0-100%
  xmax: number // 0-100%
  ymax: number // 0-100%
  bounds: {
    north: number
    south: number
    east: number
    west: number
  }
  areaKm2: number
  croppedBase64?: string
}

export interface ViewerState {
  layer: LayerId
  detections: boolean
  flood: boolean
  compare: boolean
  zoom: number
  pan: { x: number; y: number }
  dynamicBoxes: DetectionBox[]
  selectedAOI?: SelectedArea | null
}

