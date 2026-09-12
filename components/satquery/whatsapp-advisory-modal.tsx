"use client"

import { useState, useRef, useEffect } from "react"
import {
  X,
  Send,
  Play,
  Pause,
  Volume2,
  CheckCheck,
  Phone,
  Smartphone,
  ExternalLink,
} from "lucide-react"
import { VoiceService } from "@/lib/voice-service"
import type { SceneMeta } from "@/lib/satquery-data"
import type { ChatMessage } from "./types"

interface WhatsappAdvisoryModalProps {
  isOpen: boolean
  onClose: () => void
  scene: SceneMeta
  message?: ChatMessage | null
}

export function WhatsappAdvisoryModal({
  isOpen,
  onClose,
  scene,
  message,
}: WhatsappAdvisoryModalProps) {
  const [phoneNumber, setPhoneNumber] = useState("+91 98310 44821")
  const [farmerName, setFarmerName] = useState("रविन्द्र कुमार मंडल")
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [audioProgress, setAudioProgress] = useState(0)
  const [deliveryStatus, setDeliveryStatus] = useState<"ready" | "sending" | "sent" | "delivered">("delivered")
  const [lang, setLang] = useState<"hi" | "en">("hi")
  const audioIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current)
      VoiceService.stopSpeaking()
    }
  }, [])

  if (!isOpen) return null

  // Extract metrics from message card if available
  const soilMoisture = message?.card?.soilMoisturePct ?? 34
  const ndviMean = message?.card?.ndviMean ?? 0.68
  const currentTime = new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })

  // Natural Hindi Advisory Speech Text
  const hindiSpeech = `नमस्कार किसान भाई ${farmerName} जी। उपग्रह निगरानी प्रणाली द्वारा आपके खेत खसरा नंबर 142/A का विश्लेषण किया गया है। मिट्टी में नमी का स्तर ${soilMoisture} प्रतिशत पाया गया है, जो फसल के लिए अनुकूल है। अगले 72 घंटों तक सिंचाई की आवश्यकता नहीं है। जलभराव की स्थिति में अपने ग्राम सेवक या PMFBY टोल फ्री नंबर 14447 पर संपर्क करें। धन्यवाद, कृषि विज्ञान केंद्र।`

  const englishSpeech = `Greetings Farmer ${farmerName}. Satellite remote sensing analysis for your parcel Khasra 142/A indicates soil moisture at ${soilMoisture}%, which is optimal for crop growth. No irrigation is needed for the next 72 hours. In case of waterlogging, notify your local agriculture officer or call PMFBY toll-free 14447.`

  const toggleVoiceNote = () => {
    if (isPlayingAudio) {
      VoiceService.stopSpeaking()
      setIsPlayingAudio(false)
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current)
      setAudioProgress(0)
    } else {
      setIsPlayingAudio(true)
      const textToSpeak = lang === "hi" ? hindiSpeech : englishSpeech
      const voiceLang = lang === "hi" ? "hi-IN" : "en-IN"

      let progress = 0
      audioIntervalRef.current = setInterval(() => {
        progress += 4
        if (progress >= 100) {
          progress = 100
          if (audioIntervalRef.current) clearInterval(audioIntervalRef.current)
          setIsPlayingAudio(false)
        }
        setAudioProgress(progress)
      }, 350)

      VoiceService.speak(
        textToSpeak,
        () => setIsPlayingAudio(true),
        () => {
          setIsPlayingAudio(false)
          setAudioProgress(100)
        }
      )
    }
  }

  const handleSendExternalWhatsApp = () => {
    const textBody =
      lang === "hi"
        ? `*🌾 किसान कृषि उपग्रह सलाह (Kisan Satellite Advisory)*%0A%0A` +
          `*किसान:* ${farmerName}%0A` +
          `*खसरा नंबर:* #142/A (रकबा: 2.40 हेक्ट.)%0A` +
          `*स्थान:* ${scene.name} (${scene.region})%0A` +
          `*मिट्टी की नमी:* ${soilMoisture}%25 (अनुकूल)%0A` +
          `*फसल स्वास्थ्य (NDVI):* ${ndviMean}%0A%0A` +
          `*महत्वपूर्ण सलाह:*%0A` +
          `1. अगले 3 दिनों तक अतिरिक्त सिंचाई न करें।%0A` +
          `2. निचले खेतों में जलभराव रोकने के लिए नालियां साफ रखें।%0A` +
          `3. PMFBY फसल क्षति सहायता नंबर: 14447%0A%0A` +
          `_सत्यापित: ISRO SatQuery AI Engine_`
        : `*🌾 Kisan Satellite Advisory*%0A%0A` +
          `*Farmer:* ${farmerName}%0A` +
          `*Parcel:* Khasra #142/A (2.40 Ha)%0A` +
          `*Region:* ${scene.name} (${scene.region})%0A` +
          `*Soil Moisture:* ${soilMoisture}%%0A` +
          `*Crop Vigor (NDVI):* ${ndviMean}%0A%0A` +
          `*Advisory:*%0A` +
          `1. Postpone irrigation for next 72 hours.%0A` +
          `2. Clear drainage trenches in low-lying paddy furrows to prevent root rot.%0A` +
          `3. PMFBY Helpline: 14447%0A%0A` +
          `_Verified by ISRO SatQuery AI_`

    const cleanNumber = phoneNumber.replace(/[^0-9]/g, "")
    const url = `https://api.whatsapp.com/send?phone=${cleanNumber}&text=${textBody}`
    window.open(url, "_blank")
  }

  const simulateDispatch = () => {
    setDeliveryStatus("sending")
    setTimeout(() => {
      setDeliveryStatus("sent")
      setTimeout(() => {
        setDeliveryStatus("delivered")
      }, 1000)
    }, 700)
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-3 sm:p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-emerald-500/40 bg-slate-950 p-4 sm:p-6 shadow-2xl overflow-y-auto max-h-[92vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Smartphone className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-1.5">
                <span>ग्रामीण किसान सलाह (WhatsApp & SMS)</span>
              </h2>
              <p className="text-[11px] text-muted-foreground font-mono">
                Multilingual Rural Advisory with Native Voice Note
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Farmer Mobile & Language Configuration */}
        <div className="mb-3 rounded-xl border border-border bg-card/60 p-3 space-y-2 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground font-mono block mb-1">
                किसान का नाम (Farmer Name)
              </label>
              <input
                type="text"
                value={farmerName}
                onChange={(e) => setFarmerName(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-2.5 py-1 text-xs text-foreground outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground font-mono block mb-1">
                मोबाइल नंबर (WhatsApp / SMS)
              </label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-2.5 py-1 text-xs text-foreground font-mono outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">भाषा:</span>
              <button
                type="button"
                onClick={() => setLang("hi")}
                className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                  lang === "hi"
                    ? "bg-emerald-500 text-slate-950 shadow-sm"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                हिंदी (Hindi)
              </button>
              <button
                type="button"
                onClick={() => setLang("en")}
                className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                  lang === "en"
                    ? "bg-emerald-500 text-slate-950 shadow-sm"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                English
              </button>
            </div>

            <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-400">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Aadhaar Kisan Portal Linked</span>
            </div>
          </div>
        </div>

        {/* WhatsApp Mobile Chat Interface Simulation */}
        <div className="rounded-2xl border border-emerald-500/30 overflow-hidden shadow-xl bg-[#0b141a]">
          {/* WhatsApp Chat Top Bar */}
          <div className="bg-[#1f2c34] px-3.5 py-2.5 flex items-center justify-between border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <div className="relative size-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                🌾
                <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-400 border border-[#1f2c34]" />
              </div>
              <div>
                <p className="text-xs font-bold text-white flex items-center gap-1">
                  <span>किसान कृषि उपग्रह सलाह</span>
                  <span className="text-emerald-400 text-[10px]">✓</span>
                </p>
                <p className="text-[10px] text-emerald-300/80 font-mono">
                  Online · MoA&FW AI Service
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-white/70">
              <Phone className="size-4" />
            </div>
          </div>

          {/* WhatsApp Message Body */}
          <div className="p-3.5 space-y-3 bg-[radial-gradient(#1f2c34_1px,transparent_1px)] [background-size:16px_16px]">
            {/* Audio Voice Note Bubble */}
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-[#005c4b] p-3 shadow-md text-white">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleVoiceNote}
                  className="flex size-10 items-center justify-center rounded-full bg-emerald-400 text-slate-950 hover:bg-emerald-300 transition-all cursor-pointer shrink-0 shadow-md active:scale-95"
                >
                  {isPlayingAudio ? (
                    <Pause className="size-5 fill-current" />
                  ) : (
                    <Play className="size-5 fill-current ml-0.5" />
                  )}
                </button>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-emerald-200 font-mono">
                    <span className="flex items-center gap-1">
                      <Volume2 className="size-3 text-emerald-300" />
                      <span>{lang === "hi" ? "आवाज़ संदेश (Voice Note)" : "Audio Advisory"}</span>
                    </span>
                    <span>{isPlayingAudio ? `${Math.round(audioProgress * 0.42)}s / 42s` : "0:42"}</span>
                  </div>

                  {/* Simulated Audio Waveform Bar */}
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-emerald-950/80">
                    <div
                      className="h-full rounded-full bg-emerald-300 transition-all duration-300"
                      style={{ width: `${audioProgress}%` }}
                    />
                  </div>

                  <p className="text-[9px] text-emerald-200/80 italic line-clamp-1">
                    {lang === "hi" ? "सुनें: खेत में नमी एवं सिंचाई सलाह..." : "Listen: Moisture & Irrigation Advisory..."}
                  </p>
                </div>
              </div>
            </div>

            {/* Text Message Bubble */}
            <div className="max-w-[92%] rounded-2xl rounded-tl-sm bg-[#005c4b] p-3.5 shadow-md text-white space-y-2">
              <div className="border-b border-emerald-400/30 pb-1.5">
                <p className="font-bold text-xs text-emerald-200">
                  {lang === "hi"
                    ? `🌾 उपग्रह विश्लेषण रिपोर्ट: खसरा #142/A`
                    : `🌾 Satellite Advisory: Parcel #142/A`}
                </p>
                <p className="text-[10px] text-emerald-300/80 font-mono">
                  {scene.name} ({scene.region})
                </p>
              </div>

              {/* Quick Metrics Badges */}
              <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
                <div className="bg-black/25 px-2 py-1 rounded">
                  <span className="text-emerald-300/80 block text-[9px]">मिट्टी में नमी:</span>
                  <span className="font-bold text-white">{soilMoisture}% (अनुकूल)</span>
                </div>
                <div className="bg-black/25 px-2 py-1 rounded">
                  <span className="text-emerald-300/80 block text-[9px]">फसल स्वास्थ्य (NDVI):</span>
                  <span className="font-bold text-white">{ndviMean} (स्वस्थ)</span>
                </div>
              </div>

              {/* Actionable Advice in Hindi */}
              <div className="text-xs space-y-1 text-emerald-100 leading-relaxed">
                {lang === "hi" ? (
                  <>
                    <p className="font-semibold text-amber-300 text-[11px]">
                      👉 किसान भाइयों के लिए मुख्य निर्देश:
                    </p>
                    <p>• उपग्रह रडार के अनुसार खेत में पर्याप्त नमी है, अतः अगले 3 दिन सिंचाई न करें।</p>
                    <p>• यदि निचली क्यारियों में पानी रुका हुआ है, तो जल निकासी नालियां खोलें।</p>
                    <p>• फसल क्षति होने पर 72 घंटे में PMFBY पोर्टल या 14447 पर दावा दर्ज करें।</p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-amber-300 text-[11px]">
                      👉 Direct Farmer Action Items:
                    </p>
                    <p>• Adequate soil moisture detected by SAR radar; postpone irrigation for 72 hours.</p>
                    <p>• Clear drainage trenches in low-lying paddy furrows to prevent root rot.</p>
                    <p>• For flood crop compensation, lodge claim within 72 hrs on PMFBY helpline 14447.</p>
                  </>
                )}
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-emerald-400/20 text-[9px] font-mono text-emerald-300/70">
                <span>ISRO Bhuvan & PMFBY Validated</span>
                <span className="flex items-center gap-1">
                  <span>{currentTime}</span>
                  <CheckCheck className="size-3.5 text-sky-400" />
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
          <button
            type="button"
            onClick={simulateDispatch}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 px-3 py-1.5 text-xs font-semibold text-foreground transition-all cursor-pointer shadow-sm"
          >
            <Send className="size-3.5 text-emerald-400" />
            <span>
              {deliveryStatus === "sending"
                ? "भेजा जा रहा है..."
                : deliveryStatus === "delivered"
                  ? "✓✓ SMS Delivered"
                  : "Simulate SMS"}
            </span>
          </button>

          <button
            type="button"
            onClick={handleSendExternalWhatsApp}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 text-xs font-bold transition-all shadow-md cursor-pointer active:scale-95"
          >
            <ExternalLink className="size-3.5" />
            <span>Open in WhatsApp (किसान को भेजें)</span>
          </button>
        </div>
      </div>
    </div>
  )
}
