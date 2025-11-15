import { useCallback, useEffect, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import {
  CLIENT_SEARCH_URL,
  ELEVENLABS_AGENT_ID,
  ELEVENLABS_AGENT_PROMPT,
  ELEVENLABS_API_KEY,
} from '../config'
import type { ConversationTurn, Role } from '../types'

interface UseElevenLabsConversationOptions {
  onAgentMessage?: (message: string) => void
  onUserTranscriptUpdate?: (transcript: string) => void
}

interface StartSessionOptions {
  signedUrl?: string
}

type ElevenLabsEvent =
  | {
      type: 'ping'
      ping_event: { event_id: string; ping_ms: number }
    }
  | {
      type: 'user_transcript'
      user_transcription_event: { user_transcript: string }
    }
  | {
      type: 'agent_response'
      agent_response_event: { agent_response: string }
    }
  | {
      type: 'agent_response_correction'
      agent_response_correction_event: {
        original_agent_response: string
        corrected_agent_response: string
      }
    }
  | {
      type: 'audio'
      audio_event: { audio_base_64: string }
    }
  | {
      type: 'conversation_initiation_metadata'
      conversation_initiation_metadata_event: {
        conversation_id: string
        agent_output_audio_format: string
        user_input_audio_format: string
      }
    }
  | {
      type: string
      [key: string]: unknown
    }

const ELEVENLABS_WS_URL = 'wss://api.elevenlabs.io/v1/convai/conversation'

const isPingEvent = (
  event: ElevenLabsEvent,
): event is Extract<ElevenLabsEvent, { type: 'ping' }> => event.type === 'ping'

const isUserTranscriptEvent = (
  event: ElevenLabsEvent,
): event is Extract<ElevenLabsEvent, { type: 'user_transcript' }> =>
  event.type === 'user_transcript'

const isAgentResponseEvent = (
  event: ElevenLabsEvent,
): event is Extract<ElevenLabsEvent, { type: 'agent_response' }> =>
  event.type === 'agent_response'

const isAgentResponseCorrectionEvent = (
  event: ElevenLabsEvent,
): event is Extract<ElevenLabsEvent, { type: 'agent_response_correction' }> =>
  event.type === 'agent_response_correction'

const appendTurn = (
  setTurns: Dispatch<SetStateAction<ConversationTurn[]>>,
  role: Role,
  text: string,
  { replaceLast = false }: { replaceLast?: boolean } = {},
) => {
  if (!text.trim()) return
  setTurns((prev) => {
    if (replaceLast && prev.length && prev[prev.length - 1].role === role) {
      const updated = [...prev]
      updated[updated.length - 1] = {
        ...updated[updated.length - 1],
        text,
        timestamp: Date.now(),
      }
      return updated
    }

    return [
      ...prev,
      {
        role,
        text,
        timestamp: Date.now(),
      },
    ]
  })
}

const blobToBase64 = async (chunk: Blob) => {
  const buffer = await chunk.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const blockSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += blockSize) {
    const slice = bytes.subarray(offset, offset + blockSize)
    binary += String.fromCharCode(...slice)
  }
  return btoa(binary)
}

const stopMediaStream = (stream?: MediaStream | null) => {
  stream?.getTracks().forEach((track) => track.stop())
}

export const useElevenLabsConversation = (
  options?: UseElevenLabsConversationOptions,
) => {
  const websocketRef = useRef<WebSocket | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const callbacksRef = useRef(options)

  const [isActive, setIsActive] = useState(false)
  const [turns, setTurns] = useState<ConversationTurn[]>([])
  const [error, setError] = useState<string>()

  useEffect(() => {
    callbacksRef.current = options
  }, [options])

  const resetSessionState = useCallback(() => {
    setIsActive(false)
    setError(undefined)
    websocketRef.current = null
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop()
    }
    mediaRecorderRef.current = null
    stopMediaStream(mediaStreamRef.current)
    mediaStreamRef.current = null
  }, [])

  const sendJson = useCallback((payload: Record<string, unknown>) => {
    const socket = websocketRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN) return
    socket.send(JSON.stringify(payload))
  }, [])

  const handleIncomingEvent = useCallback(
    (rawEvent: MessageEvent<string>) => {
      try {
        const data: ElevenLabsEvent = JSON.parse(rawEvent.data)
        console.log('📥 ElevenLabs event received:', data.type, data)

        if (isPingEvent(data)) {
          setTimeout(() => {
            sendJson({
              type: 'pong',
              event_id: data.ping_event.event_id,
            })
          }, data.ping_event.ping_ms)
          return
        }

        if (isUserTranscriptEvent(data)) {
          const transcript = data.user_transcription_event.user_transcript
          console.log('🗣️ User transcript received:', JSON.stringify(transcript), 'length:', transcript.length)

          // Only append non-empty transcripts to avoid "..." placeholder issues
          if (transcript && transcript.trim() && transcript !== '...') {
            appendTurn(setTurns, 'user', transcript, { replaceLast: true })
            callbacksRef.current?.onUserTranscriptUpdate?.(transcript)
          }
          return
        }

        if (isAgentResponseEvent(data)) {
          const message = data.agent_response_event.agent_response
          appendTurn(setTurns, 'agent', message)
          callbacksRef.current?.onAgentMessage?.(message)
          return
        }

        if (isAgentResponseCorrectionEvent(data)) {
          const corrected = data.agent_response_correction_event.corrected_agent_response
          appendTurn(setTurns, 'agent', corrected, { replaceLast: true })
          callbacksRef.current?.onAgentMessage?.(corrected)
          return
        }

        if (data.type === 'audio') {
          // TODO: Implement queued playback for audio_event.audio_base_64 if needed.
          return
        }
      } catch (incomingError) {
        console.error('Failed to parse ElevenLabs event', incomingError)
      }
    },
    [sendJson],
  )

  const startMediaRecorder = useCallback(
    (stream: MediaStream) => {
      if (typeof MediaRecorder === 'undefined') {
        throw new Error('MediaRecorder API is unavailable in this browser.')
      }

      console.log('🎤 Starting MediaRecorder with stream:', stream.getAudioTracks().length, 'audio tracks')

      // Check supported MIME types
      const preferredTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/wav'
      ]

      let selectedType = ''
      for (const type of preferredTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          selectedType = type
          console.log('🎤 Using MIME type:', selectedType)
          break
        }
      }

      const recorder = new MediaRecorder(stream, selectedType ? { mimeType: selectedType } : {})

      console.log('🎤 MediaRecorder created, state:', recorder.state)

      recorder.addEventListener('dataavailable', async (event) => {
        console.log('🎤 Audio data available, size:', event.data.size, 'bytes')
        if (!event.data.size) return
        try {
          const audioChunk = await blobToBase64(event.data)
          console.log('📤 Sending audio chunk to ElevenLabs, length:', audioChunk.length)
          sendJson({
            user_audio_chunk: audioChunk,
          })
        } catch (chunkError) {
          console.error('Failed to encode audio chunk', chunkError)
        }
      })

      recorder.addEventListener('error', (recorderError) => {
        console.error('MediaRecorder error', recorderError)
        setError('Microphone streaming failed. Please retry.')
        sendJson({ type: 'user_activity', status: 'microphone_error' })
        resetSessionState()
      })

      recorder.start(500)
      console.log('🎤 MediaRecorder started, recording every 500ms')
      mediaRecorderRef.current = recorder
    },
    [resetSessionState, sendJson],
  )

  const buildWebSocketUrl = useCallback((signedUrl?: string) => {
    if (signedUrl) {
      return signedUrl
    }
    const params = new URLSearchParams()
    if (ELEVENLABS_AGENT_ID) params.set('agent_id', ELEVENLABS_AGENT_ID)
    if (ELEVENLABS_API_KEY) {
      // TODO: Replace with a signed URL so the API key is never exposed client-side.
      params.set('api_key', ELEVENLABS_API_KEY)
    }
    if (CLIENT_SEARCH_URL) {
      // No-op: placeholder showing this hook can read shared config, even though the
      // Client Search URL is not needed at this stage.
    }
    const suffix = params.toString()
    return suffix ? `${ELEVENLABS_WS_URL}?${suffix}` : ELEVENLABS_WS_URL
  }, [])

  const sendConversationInit = useCallback(() => {
    // Note: Prompt override disabled because this agent doesn't allow prompt overrides
    // The agent should already be configured with the startup discovery prompt
    const initPayload = {
      type: 'conversation_initiation_client_data',
      user_id: crypto.randomUUID?.() ?? undefined,
    }

    console.log('📤 Sending conversation init (no prompt override):', initPayload)
    sendJson(initPayload)
  }, [sendJson])

  const startSession = useCallback(
    async (startOptions?: StartSessionOptions) => {
      if (websocketRef.current || isActive) return
      if (typeof window === 'undefined') {
        setError('ElevenLabs conversations are only available in the browser.')
        return
      }

      try {
        setTurns([])
        setError(undefined)

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        mediaStreamRef.current = stream

        const wsUrl = buildWebSocketUrl(startOptions?.signedUrl)
        console.log('🔗 Connecting to ElevenLabs WebSocket:', wsUrl)
        const websocket = new WebSocket(wsUrl)
        websocketRef.current = websocket

        websocket.addEventListener('open', () => {
          console.log('✅ ElevenLabs WebSocket connected')
          setIsActive(true)
          sendConversationInit()
          startMediaRecorder(stream)
        })

        websocket.addEventListener('message', handleIncomingEvent)

        websocket.addEventListener('close', (closeEvent) => {
          console.log('🔌 ElevenLabs WebSocket closed:', closeEvent.code, closeEvent.reason)
          resetSessionState()
        })

        websocket.addEventListener('error', (wsError) => {
          console.error('❌ ElevenLabs WebSocket error', wsError)
          setError('ElevenLabs connection error. Please retry.')
          resetSessionState()
        })
      } catch (startError) {
        console.error('Failed to start ElevenLabs session', startError)
        setError(
          startError instanceof Error ? startError.message : 'Unable to start ElevenLabs session.',
        )
        stopMediaStream(mediaStreamRef.current)
        mediaStreamRef.current = null
        websocketRef.current?.close()
        websocketRef.current = null
      }
    },
    [
      buildWebSocketUrl,
      handleIncomingEvent,
      isActive,
      resetSessionState,
      sendConversationInit,
      startMediaRecorder,
    ],
  )

  const stopSession = useCallback(() => {
    if (!websocketRef.current && !mediaRecorderRef.current) return
    websocketRef.current?.close()
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    stopMediaStream(mediaStreamRef.current)
    resetSessionState()
  }, [resetSessionState])

  useEffect(() => {
    return () => {
      stopSession()
    }
  }, [stopSession])

  return {
    isActive,
    turns,
    error,
    startSession,
    stopSession,
  }
}
