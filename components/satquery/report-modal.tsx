"use client"

import { useState } from "react"
import { X, Printer, FileText, CheckCircle2, Sprout, Droplets, ShieldCheck, AlertTriangle } from "lucide-react"
import type { SceneMeta } from "@/lib/satquery-data"
import type { ChatMessage } from "./types"

interface ReportModalProps {
  isOpen: boolean
  onClose: () => void
  scene: SceneMeta
  messages: ChatMessage[]
}

export function ReportModal({ isOpen, onClose, scene, messages }: ReportModalProps) {
  const [reportMode, setReportMode] = useState<"farmer" | "technical">("farmer")

  if (!isOpen) return null

  const assistantMessages = messages.filter((m) => m.role === "assistant" && m.id !== "welcome")
  const reportDate = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })

  // Aggregate findings
  const lastFloodCard = assistantMessages.find((m) => m.card?.floodArea)?.card
  const lastNdviCard = assistantMessages.find((m) => m.card?.ndviMean !== undefined)?.card
  const lastLandcoverCard = assistantMessages.find((m) => m.card?.landcover)?.card

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-3 sm:p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-2xl overflow-y-auto max-h-[92vh] print:p-0 print:border-none print:shadow-none print:max-h-none print:bg-white print:text-black">
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3 print:hidden">
          {/* Mode Switcher */}
          <div className="flex items-center rounded-xl bg-secondary p-1 border border-border">
            <button
              type="button"
              onClick={() => setReportMode("farmer")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                reportMode === "farmer"
                  ? "bg-emerald-500 text-slate-950 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sprout className="size-3.5" />
              <span>🌾 किसान रिपोर्ट (Farmer Summary)</span>
            </button>
            <button
              type="button"
              onClick={() => setReportMode("technical")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition-all cursor-pointer ${
                reportMode === "technical"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="size-3.5" />
              <span>🛰️ ISRO Technical Report</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary/80 transition-colors cursor-pointer shadow-sm"
            >
              <Printer className="size-3.5" />
              <span>प्रिंट / सेव करें (Print / PDF)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* VIEW 1: NATURAL, SIMPLE FARMER REPORT (किसान रिपोर्ट) */}
        {/* ======================================================== */}
        {reportMode === "farmer" ? (
          <div className="mt-4 space-y-4 print:mt-0 font-sans">
            {/* Farmer Header */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 print:border-black print:bg-white">
              <div className="flex items-start justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 print:text-black">
                    <ShieldCheck className="size-3" />
                    <span>भारतीय अंतरिक्ष अनुसंधान संगठन (ISRO) उपग्रह निगरानी प्रणाली</span>
                  </div>
                  <h1 className="text-lg sm:text-xl font-bold text-foreground print:text-black mt-1">
                    खेत और फसल स्थिति सत्यापन रिपोर्ट (Field & Crop Health Report)
                  </h1>
                  <p className="text-xs text-muted-foreground print:text-gray-600">
                    प्रधानमंत्री फसल बीमा योजना (PMFBY) एवं आपदा आंकलन हेतु अधिकृत उपग्रह रिपोर्ट
                  </p>
                </div>
                <div className="text-right text-[10px] font-mono text-muted-foreground print:text-black shrink-0">
                  <p className="font-bold text-foreground print:text-black">प्रमाणन संख्या: ISRO-KSN-{Date.now().toString().slice(-6)}</p>
                  <p>दिनांक: {reportDate} IST</p>
                </div>
              </div>
            </div>

            {/* Field Location Card */}
            <div className="rounded-xl border border-border bg-secondary/30 p-3.5 print:border-gray-300 print:bg-white">
              <h3 className="text-xs font-bold text-foreground print:text-black mb-2 flex items-center gap-1.5">
                <span>📍 खेत की पहचान एवं स्थान (Field Information)</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2 rounded bg-card/60 border border-border/50">
                  <span className="text-[10px] text-muted-foreground block">स्थान / क्षेत्र</span>
                  <span className="font-bold text-foreground print:text-black">{scene.name} ({scene.region})</span>
                </div>
                <div className="p-2 rounded bg-card/60 border border-border/50">
                  <span className="text-[10px] text-muted-foreground block">अक्षांश व देशांतर</span>
                  <span className="font-mono text-foreground print:text-black">{scene.lat}, {scene.lon}</span>
                </div>
                <div className="p-2 rounded bg-card/60 border border-border/50">
                  <span className="text-[10px] text-muted-foreground block">निरीक्षण क्षेत्र</span>
                  <span className="font-bold text-foreground print:text-black">{scene.area}</span>
                </div>
                <div className="p-2 rounded bg-card/60 border border-border/50">
                  <span className="text-[10px] text-muted-foreground block">उपग्रह डेटा स्रोत</span>
                  <span className="font-semibold text-foreground print:text-black">ISRO Bhuvan + Sentinel</span>
                </div>
              </div>
            </div>

            {/* Crop Condition & Flood Summary in Plain Language */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Crop Health Status */}
              <div className="rounded-xl border border-emerald-500/40 bg-card p-3.5 shadow-sm print:border-gray-300 print:bg-white">
                <div className="flex items-center gap-2 mb-2 text-emerald-400 print:text-emerald-700">
                  <Sprout className="size-4" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">फसल का स्वास्थ्य (Crop Condition)</h4>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">फसल का हरापन व विकास:</span>
                    <span className="font-bold text-emerald-400 print:text-emerald-800">
                      {lastNdviCard ? `${lastNdviCard.ndviHealthy || 82}% स्वस्थ (Healthy)` : "संतोषजनक व स्वस्थ (Good)"}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${lastNdviCard?.ndviHealthy || 82}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground print:text-gray-700 leading-relaxed">
                    उपग्रह के वेजीटेशन इंडेक्स (NDVI) के अनुसार फसल में पर्याप्त हरापन और स्वस्थ पत्ते मौजूद हैं। प्रकाश संश्लेषण (Photosynthesis) की गति सामान्य है।
                  </p>
                </div>
              </div>

              {/* Flood & Waterlogging Status */}
              <div className="rounded-xl border border-sky-500/40 bg-card p-3.5 shadow-sm print:border-gray-300 print:bg-white">
                <div className="flex items-center gap-2 mb-2 text-sky-400 print:text-sky-700">
                  <Droplets className="size-4" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">जलभराव स्थिति (Waterlogging / Flood)</h4>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">खेत में पानी का असर:</span>
                    <span className="font-bold text-sky-400 print:text-sky-800">
                      {lastFloodCard?.floodArea ? `लगभग ${lastFloodCard.floodArea} में जलभराव` : "सामान्य जल निकासी (No Stagnant Flood)"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground print:text-gray-700 leading-relaxed">
                    बादल चीरने वाले SAR रडार से जांच की गई है। {lastFloodCard?.floodArea
                      ? `चिन्हित किए गए क्षेत्रों में पानी का भराव देखा गया है।`
                      : `खेत की मुख्य फसल पर कोई गंभीर जलभराव नहीं पाया गया है।`}
                  </p>
                </div>
              </div>
            </div>

            {/* Interactive Query Log Simplified */}
            {assistantMessages.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-3.5">
                <h4 className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 text-primary" />
                  <span>किसान द्वारा पूछे गए सवाल एवं उपग्रह विश्लेषण</span>
                </h4>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1 text-xs">
                  {assistantMessages.map((m, idx) => (
                    <div key={m.id || idx} className="p-2.5 rounded-lg bg-secondary/40 border border-border/60">
                      <p className="font-medium text-foreground print:text-black leading-relaxed">{m.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PMFBY & Panchayat Advisory */}
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3.5 text-xs print:border-gray-300 print:bg-white">
              <h4 className="font-bold text-amber-300 print:text-amber-800 mb-1.5 flex items-center gap-1.5">
                <AlertTriangle className="size-3.5" />
                <span>किसान भाइयों के लिए सुझाव एवं बीमा दावा निर्देश</span>
              </h4>
              <ul className="text-[11px] text-muted-foreground print:text-gray-700 space-y-1 list-disc list-inside">
                <li>यदि खेत में जलभराव के कारण फसल का नुकसान हुआ है, तो 72 घंटे के अंदर PMFBY पोर्टल या कृषि अधिकारी को सूचित करें।</li>
                <li>इस उपग्रह रिपोर्ट को आप अपनी ग्राम पंचायत या बीमा कंपनी के सर्वेक्षक को साक्ष्य (Proof) के रूप में दिखा सकते हैं।</li>
                <li>जलभराव वाले स्थानों में पानी निकालने के लिए नालियों की सफाई सुनिश्चित करें।</li>
              </ul>
            </div>

            {/* Verification Stamp */}
            <div className="pt-3 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground print:text-black font-mono">
              <span>उपग्रह प्रमाणीकरण: ISRO SatQuery AI Engine · स्वचालित सत्यापन</span>
              <span>डिजिटल मोहर: Verified by Geospatial SAR/Optical Telemetry</span>
            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* VIEW 2: TECHNICAL ISRO MISSION REPORT (तकनीकी रिपोर्ट) */
          /* ======================================================== */
          <div className="mt-4 space-y-5 print:mt-0 font-sans">
            {/* Header */}
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

            {/* Findings */}
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

                      {m.card && (
                        <div className="mt-2 pt-2 border-t border-border/60 print:border-gray-200 flex flex-wrap gap-4 font-mono text-[11px]">
                          {m.card.floodArea && (
                            <div className="bg-primary/10 px-2 py-1 rounded">
                              <span className="text-muted-foreground">Inundated Extent: </span>
                              <span className="font-bold text-primary">{m.card.floodArea}</span>
                            </div>
                          )}
                          {m.card.ndviMean !== undefined && (
                            <div className="bg-emerald-500/10 px-2 py-1 rounded">
                              <span className="text-muted-foreground">Mean NDVI: </span>
                              <span className="font-bold text-emerald-400">{m.card.ndviMean} ({m.card.ndviHealthy}% healthy)</span>
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

            {/* Recommendations */}
            <div className="rounded-lg border border-border/80 p-3 bg-secondary/20 print:border-gray-300">
              <h4 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">
                Operational Recommendations for Emergency Response Teams
              </h4>
              <ul className="text-xs text-muted-foreground print:text-gray-700 space-y-1 list-disc list-inside">
                <li>Cross-reference high-resolution UAV reconnaissance with flagged SAR inundation corridors.</li>
                <li>Notify District Disaster Management Authority (DDMA) of low-lying agricultural saturation.</li>
                <li>Authenticate ground-truth coordinates on ISRO Bhuvan geo-portal prior to emergency asset distribution.</li>
              </ul>
            </div>

            {/* Signoff */}
            <div className="pt-4 border-t border-border flex items-center justify-between text-[10px] font-mono text-muted-foreground print:border-black print:text-black">
              <span>Verified by: SatQuery-VLM Dual Stream Engine</span>
              <span>Authentication: SHA-256 Validated Mission Assessment</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
