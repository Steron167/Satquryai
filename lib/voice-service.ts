"use client"

// Types for Web Speech API
type SpeechRecognitionType = any

export class VoiceService {
  private static recognitionInstance: SpeechRecognitionType | null = null
  private static currentUtterance: SpeechSynthesisUtterance | null = null

  /**
   * Check if browser supports speech recognition
   */
  static isRecognitionSupported(): boolean {
    if (typeof window === "undefined") return false
    return "SpeechRecognition" in window || "webkitSpeechRecognition" in window
  }

  /**
   * Check if browser supports speech synthesis (TTS)
   */
  static isSynthesisSupported(): boolean {
    if (typeof window === "undefined") return false
    return "speechSynthesis" in window
  }

  /**
   * Start listening for speech
   * @param lang 'hi-IN' | 'en-IN' | 'en-US'
   * @param onResult callback with transcribed text
   * @param onError callback with error
   * @param onEnd callback when recognition stops
   */
  static startListening({
    lang = "hi-IN",
    onResult,
    onError,
    onEnd,
  }: {
    lang?: string
    onResult: (text: string, isFinal: boolean) => void
    onError: (err: string) => void
    onEnd: () => void
  }): () => void {
    if (!this.isRecognitionSupported()) {
      onError("Voice recognition is not supported in this browser. Please use Chrome, Edge, or Safari.")
      onEnd()
      return () => {}
    }

    try {
      this.stopListening()

      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      const recognition = new SpeechRecognition()
      this.recognitionInstance = recognition

      recognition.lang = lang
      recognition.continuous = false
      recognition.interimResults = true
      recognition.maxAlternatives = 1

      recognition.onresult = (event: any) => {
        let interimText = ""
        let finalText = ""

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalText += transcript
          } else {
            interimText += transcript
          }
        }

        if (finalText) {
          onResult(finalText, true)
        } else if (interimText) {
          onResult(interimText, false)
        }
      }

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error)
        let errorMsg = "Could not hear audio."
        if (event.error === "not-allowed" || event.error === "permission-denied") {
          errorMsg = "Microphone access denied. Please allow microphone permission in your browser."
        } else if (event.error === "no-speech") {
          errorMsg = "No speech detected. Please speak clearly into the microphone."
        }
        onError(errorMsg)
      }

      recognition.onend = () => {
        this.recognitionInstance = null
        onEnd()
      }

      recognition.start()

      return () => {
        try {
          recognition.abort()
        } catch {}
        this.recognitionInstance = null
      }
    } catch (e: any) {
      console.error("Failed to start voice recognition:", e)
      onError(e?.message || "Failed to start speech recognition")
      onEnd()
      return () => {}
    }
  }

  /**
   * Stop active speech recognition
   */
  static stopListening() {
    if (this.recognitionInstance) {
      try {
        this.recognitionInstance.stop()
      } catch {}
      this.recognitionInstance = null
    }
  }

  /**
   * Speak text out loud using browser TTS
   * Automatically detects Hindi vs English
   */
  static speak(
    rawText: string,
    onStart?: () => void,
    onEnd?: () => void
  ): boolean {
    if (!this.isSynthesisSupported()) return false

    this.stopSpeaking()

    // Clean up markdown formatting so it speaks smoothly
    const cleanText = rawText
      .replace(/(\*\*|\*|__|#|>|`|\[|\]|\(|\))/g, "")
      .replace(/•/g, "")
      .replace(/https?:\/\/\S+/g, "")
      .replace(/\s+/g, " ")
      .trim()

    if (!cleanText) return false

    // Check if text contains Devanagari (Hindi / Marathi) characters
    const hasDevanagari = /[\u0900-\u097F]/.test(cleanText)
    const targetLang = hasDevanagari ? "hi-IN" : "en-IN"

    const utterance = new SpeechSynthesisUtterance(cleanText)
    this.currentUtterance = utterance

    utterance.lang = targetLang
    utterance.rate = 0.95 // Slightly slower and clearer for farmers
    utterance.pitch = 1.0

    // Try to pick a native voice matching the language
    const voices = window.speechSynthesis.getVoices()
    if (voices && voices.length > 0) {
      const matchedVoice =
        voices.find((v) => v.lang === targetLang) ||
        voices.find((v) => v.lang.startsWith(targetLang.slice(0, 2)))
      if (matchedVoice) {
        utterance.voice = matchedVoice
      }
    }

    if (onStart) utterance.onstart = onStart
    utterance.onend = () => {
      this.currentUtterance = null
      if (onEnd) onEnd()
    }
    utterance.onerror = () => {
      this.currentUtterance = null
      if (onEnd) onEnd()
    }

    window.speechSynthesis.speak(utterance)
    return true
  }

  /**
   * Stop any active speech synthesis
   */
  static stopSpeaking() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel()
      } catch {}
    }
    this.currentUtterance = null
  }

  /**
   * Check if currently speaking
   */
  static isSpeaking(): boolean {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return false
    return window.speechSynthesis.speaking
  }
}
