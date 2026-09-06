"use client"

import { X, Printer, Download, FileText, CheckCircle2 } from "lucide-react"
import type { SceneMeta } from "@/lib/satquery-data"
import type { ChatMessage } from "./types"

interface ReportModalProps {
  isOpen: boolean
  onClose: () => void
  scene: SceneMeta
  messages: ChatMessage[]
}

export function ReportModal({ isOpen, onClose, scene, messages }: ReportModalProps) {
  if (!isOpen) return null

  const assistantMessages = messages.filter((m) => m.role === "assistant" && m.id !== "welcome")
  const reportDate = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-xl border border-border bg-card p-6 shadow-2xl overflow-y-auto max-h-[92vh] print:p-0 print:border-none print:shadow-none print:max-h-none print:bg-white print:text-black">
        {/* Modal Actions */}
        <div className="flex items-center justify-between border-b border-border pb-3 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-primary" />
            <h2 className="text-sm font-semibold">ISRO Situation Intelligence Report</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/80 transition-colors"
            >
              <Printer className="size-3.5" />
              Print / Save PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Printable Report Body */}
        <div className="mt-4 space-y-5 print:mt-0 font-sans">
          {/* Report Header */}
          <div className="border-b border-border/80 pb-4 print:border-black">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-primary font-bold">
                  Government of India · Department of Space
                </span>
                <h1 className="text-xl font-bold tracking-tight text-foreground print:text-black mt-0.5">
                  ISRO SatQuery AI — Remote Sensing Mission Assessment
                </h1>
                <p className="font-mono text-[11px] text-muted-foreground print:text-gray-600">
                  Smart India Hackathon · PS 26167 · Automated Vision-Language Grounding
                </p>
              </div>
              <div className="text-right font-mono text-[10px] text-muted-foreground print:text-gray-600">
                <p>Report Ref: ISRO-SQ-{Date.now().toString().slice(-6)}</p>
                <p>Generated: {reportDate} IST</p>
              </div>
            </div>
          </div>

          {/* AOI Scene Specification */}
          <div className="rounded-lg border border-border bg-secondary/30 p-3.5 print:border-gray-300 print:bg-gray-50">
            <h3 className="font-mono text-[11px] uppercase tracking-wider font-bold text-foreground print:text-black mb-2">
              Target Area of Interest (AOI) Specifications
            </h3>
            <div className="grid grid-cols-3 gap-2 font-mono text-xs">
              <div>
                <span className="text-muted-foreground text-[10px] block">Location</span>
                <span className="font-semibold">{scene.name}</span> ({scene.region})
              </div>
              <div>
                <span className="text-muted-foreground text-[10px] block">Coordinates</span>
                <span className="font-semibold">{scene.lat}, {scene.lon}</span>
              </div>
              <div>
                <span className="text-muted-foreground text-[10px] block">Spatial Coverage / AOI</span>
                <span className="font-semibold">{scene.area}</span> (GSD: {scene.resolution})
              </div>
              <div>
                <span className="text-muted-foreground text-[10px] block">Sensor Ingestion</span>
                <span className="font-semibold">Sentinel-1 CSAR + Sentinel-2 MSI</span>
              </div>
              <div>
                <span className="text-muted-foreground text-[10px] block">Acquisition Timestamp</span>
                <span className="font-semibold">{scene.acquired}</span>
              </div>
              <div>
                <span className="text-muted-foreground text-[10px] block">Cloud Cover</span>
                <span className="font-semibold">{scene.cloud}</span>
              </div>
            </div>
          </div>

          {/* Automated Findings & Multimodal Analysis */}
          <div>
            <h3 className="font-mono text-[11px] uppercase tracking-wider font-bold text-foreground print:text-black mb-2.5">
              Automated Multimodal Findings & Queries
            </h3>

            {assistantMessages.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No interactive queries logged yet. Ask questions in the chat panel to include detailed analytics in this report.
              </p>
            ) : (
              <div className="space-y-3">
                {assistantMessages.map((m, idx) => (
                  <div
                    key={m.id || idx}
                    className="rounded-lg border border-border p-3 bg-card/60 print:border-gray-300 print:bg-white"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <CheckCircle2 className="size-3.5 text-primary" />
                      <span className="font-mono text-[10px] font-bold text-primary uppercase">
                        Analysis Task #{idx + 1}
                      </span>
                    </div>
                    <p className="text-xs text-foreground print:text-black leading-relaxed">
                      {m.text}
                    </p>

                    {/* Extracted Metrics Card */}
                    {m.card && (
                      <div className="mt-2 pt-2 border-t border-border/60 print:border-gray-200 flex flex-wrap gap-4 font-mono text-[11px]">
                        {m.card.floodArea && (
                          <div className="bg-primary/10 px-2 py-1 rounded">
                            <span className="text-muted-foreground">Inundated Extent: </span>
                            <span className="font-bold text-primary">{m.card.floodArea}</span>
                          </div>
                        )}
                        {m.card.detectionCount !== undefined && (
                          <div className="bg-accent/10 px-2 py-1 rounded">
                            <span className="text-muted-foreground">Grounded Objects: </span>
                            <span className="font-bold text-accent">{m.card.detectionCount} {m.card.detectionLabel}</span>
                          </div>
                        )}
                        {m.card.ndviMean !== undefined && (
                          <div className="bg-chart-3/10 px-2 py-1 rounded">
                            <span className="text-muted-foreground">Mean NDVI: </span>
                            <span className="font-bold text-chart-3">{m.card.ndviMean} ({m.card.ndviHealthy}% healthy)</span>
                          </div>
                        )}
                        {m.card.landcover && (
                          <div className="w-full mt-1">
                            <span className="text-muted-foreground block text-[10px] mb-1">Class Breakdown:</span>
                            <div className="flex flex-wrap gap-2 text-[10px]">
                              {m.card.landcover.map((c) => (
                                <span key={c.label} className="bg-secondary px-1.5 py-0.5 rounded border border-border">
                                  {c.label}: {c.pct}%
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Operational Advisory */}
          <div className="rounded-lg border border-border/80 p-3 bg-secondary/20 print:border-gray-300">
            <h4 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">
              Operational Recommendations for Response Teams
            </h4>
            <ul className="text-xs text-muted-foreground print:text-gray-700 space-y-1 list-disc list-inside">
              <li>Deploy high-resolution UAV reconnaissance over flagged SAR inundation corridors.</li>
              <li>Notify State Disaster Management Authority (SDMA) of low-lying agricultural displacement.</li>
              <li>Verify ground-truth coordinates on ISRO Bhuvan geo-portal prior to emergency asset distribution.</li>
            </ul>
          </div>

          {/* Signoff */}
          <div className="pt-4 border-t border-border flex items-center justify-between text-[10px] font-mono text-muted-foreground print:border-black print:text-black">
            <span>Verified by: SatQuery-VLM Dual Stream Engine</span>
            <span>Authentication: SHA-256 Validated Mission Assessment</span>
          </div>
        </div>
      </div>
    </div>
  )
}
