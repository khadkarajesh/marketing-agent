import { useCallback, useEffect, useRef, useState } from 'react'

interface UseSpeechToTextOptions {
  onTranscriptUpdate?: (transcript: string) => void
  onFinalTranscript?: (transcript: string) => void
}

export const useSpeechToText = (options?: UseSpeechToTextOptions) => {
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const isRecordingRef = useRef(false)
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string>()
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    // Check if browser supports Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      setIsSupported(true)

      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onstart = () => {
        isRecordingRef.current = true
        setIsRecording(true)
        setError(undefined)
      }

      recognition.onresult = (event) => {
        // Don't process results if recording has been stopped
        if (!isRecordingRef.current) {
          return
        }

        let interimTranscript = ''
        let finalTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i]
          if (result.isFinal) {
            finalTranscript += result[0].transcript
          } else {
            interimTranscript += result[0].transcript
          }
        }

        const fullTranscript = transcript + finalTranscript
        const currentTranscript = fullTranscript + interimTranscript

        setTranscript(fullTranscript)
        options?.onTranscriptUpdate?.(currentTranscript)

        if (finalTranscript) {
          options?.onFinalTranscript?.(fullTranscript)
        }
      }

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        setError(`Speech recognition error: ${event.error}`)
        setIsRecording(false)
      }

      recognition.onend = () => {
        isRecordingRef.current = false
        setIsRecording(false)
      }

      recognitionRef.current = recognition
    } else {
      setError('Speech recognition is not supported in this browser')
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [options, transcript])

  const startRecording = useCallback(() => {
    if (!recognitionRef.current || !isSupported) {
      setError('Speech recognition not available')
      return
    }

    try {
      setTranscript('')
      recognitionRef.current.start()
    } catch (err) {
      console.error('Failed to start recording:', err)
      setError('Failed to start recording')
    }
  }, [isSupported])

  const stopRecording = useCallback(() => {
    if (!recognitionRef.current) {
      return
    }

    try {
      // Immediately set recording to false to prevent further transcript updates
      isRecordingRef.current = false
      setIsRecording(false)

      // Stop the recognition
      recognitionRef.current.stop()

      // Also abort if stop doesn't work immediately
      if (recognitionRef.current.abort) {
        recognitionRef.current.abort()
      }
    } catch (err) {
      console.error('Failed to stop recording:', err)
      isRecordingRef.current = false
      setIsRecording(false)
    }
  }, [])

  const clearTranscript = useCallback(() => {
    setTranscript('')
  }, [])

  return {
    isRecording,
    transcript,
    error,
    isSupported,
    startRecording,
    stopRecording,
    clearTranscript,
  }
}

// Type declarations for browsers that don't have these in their TypeScript definitions
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}