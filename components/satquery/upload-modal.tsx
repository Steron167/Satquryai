"use client"

import { useState } from "react"
import { X, UploadCloud, CheckCircle2, Image as ImageIcon } from "lucide-react"
import type { SceneMeta } from "@/lib/satquery-data"

interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  onUploadSuccess: (scene: SceneMeta, opticalDataUrl: string, sarDataUrl?: string) => void
}

export function UploadModal({ isOpen, onClose, onUploadSuccess }: UploadModalProps) {
  const [sceneName, setSceneName] = useState("Custom Disaster AOI")
  const [region, setRegion] = useState("Odisha Coastal Belt, India")
  const [lat, setLat] = useState("19.8135° N")
  const [lon, setLon] = useState("85.8312° E")
  const [opticalFile, setOpticalFile] = useState<File | null>(null)
  const [opticalPreview, setOpticalPreview] = useState<string | null>(null)
  const [sarFile, setSarFile] = useState<File | null>(null)
  const [sarPreview, setSarPreview] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  if (!isOpen) return null

  const handleOpticalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setOpticalFile(file)
      const reader = new FileReader()
      reader.onload = (event) => setOpticalPreview(event.target?.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleSarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSarFile(file)
      const reader = new FileReader()
      reader.onload = (event) => setSarPreview(event.target?.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleApply = () => {
    if (!opticalPreview) return
    setIsProcessing(true)

    const customScene: SceneMeta = {
      id: "custom",
      name: sceneName,
      region,
      lat,
      lon,
      area: "350.0 km²",
      acquired: new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC",
      cloud: "User Uploaded",
      resolution: "10 m / px",
      bounds: { north: 20.0, south: 19.6, east: 86.0, west: 85.6 },
      description: `User-provided co-registered multimodal imagery for ${sceneName}. Ready for text queries and remote sensing visual reasoning.`,
      summary: "Custom user-provided satellite scene loaded for live vision-language analysis.",
      hotspots: ["Custom AOI Target", "User Region of Interest"],
    }

    setTimeout(() => {
      setIsProcessing(false)
      onUploadSuccess(customScene, opticalPreview, sarPreview || undefined)
      onClose()
    }, 400)
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-xl border border-border bg-card p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <UploadCloud className="size-5 text-primary" />
            <div>
              <h2 className="text-sm font-semibold">Upload Custom Satellite Scene</h2>
              <p className="font-mono text-[10px] text-muted-foreground">
                Sentinel-1 SAR + Sentinel-2 Optical Pair (PNG / JPEG / GeoTIFF export)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-4">
          {/* Metadata inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-mono text-[10px] uppercase text-muted-foreground mb-1">
                Scene / AOI Name
              </label>
              <input
                type="text"
                value={sceneName}
                onChange={(e) => setSceneName(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase text-muted-foreground mb-1">
                Region / State
              </label>
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-mono text-[10px] uppercase text-muted-foreground mb-1">
                Latitude Center
              </label>
              <input
                type="text"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] uppercase text-muted-foreground mb-1">
                Longitude Center
              </label>
              <input
                type="text"
                value={lon}
                onChange={(e) => setLon(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Image Upload Dropzones */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            {/* Optical Upload */}
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-secondary/30 p-4 text-center hover:border-primary/50 transition-colors relative overflow-hidden">
              {opticalPreview ? (
                <div className="relative w-full h-24 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={opticalPreview} alt="Optical Preview" className="h-full w-full object-cover rounded" />
                  <span className="absolute bottom-1 right-1 bg-black/80 font-mono text-[9px] text-emerald-400 px-1 rounded flex items-center gap-0.5">
                    <CheckCircle2 className="size-2.5" /> Optical Ready
                  </span>
                </div>
              ) : (
                <>
                  <ImageIcon className="size-6 text-muted-foreground mb-2" />
                  <p className="text-xs font-medium">Optical (Sentinel-2)</p>
                  <p className="text-[10px] text-muted-foreground">RGB True Color</p>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleOpticalChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>

            {/* SAR Upload */}
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-secondary/30 p-4 text-center hover:border-primary/50 transition-colors relative overflow-hidden">
              {sarPreview ? (
                <div className="relative w-full h-24 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={sarPreview} alt="SAR Preview" className="h-full w-full object-cover rounded" />
                  <span className="absolute bottom-1 right-1 bg-black/80 font-mono text-[9px] text-emerald-400 px-1 rounded flex items-center gap-0.5">
                    <CheckCircle2 className="size-2.5" /> SAR Ready
                  </span>
                </div>
              ) : (
                <>
                  <UploadCloud className="size-6 text-muted-foreground mb-2" />
                  <p className="text-xs font-medium">SAR (Sentinel-1)</p>
                  <p className="text-[10px] text-muted-foreground">C-band VV/VH Radar</p>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleSarChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-end gap-2 border-t border-border pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!opticalPreview || isProcessing}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
          >
            {isProcessing ? "Ingesting AOI..." : "Load into SatQuery AI"}
          </button>
        </div>
      </div>
    </div>
  )
}
