import { useCallback, useMemo, useState } from 'react'
import { useSpeechToText } from '../hooks/useSpeechToText'

const problemKeywords = ['problem', 'pain', 'issue', 'challenge', 'struggle']
const solutionKeywords = ['solution', 'product', 'service', 'platform', 'tool', 'app']

const extractHints = (transcript: string) => {
  const normalized = transcript.toLowerCase()

  let problemHint: string | undefined
  let solutionHint: string | undefined

  // Look for sentences containing problem keywords
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim())

  for (const sentence of sentences) {
    const sentenceNorm = sentence.toLowerCase()

    if (!problemHint && problemKeywords.some(keyword => sentenceNorm.includes(keyword))) {
      problemHint = sentence.trim()
    }

    if (!solutionHint && solutionKeywords.some(keyword => sentenceNorm.includes(keyword))) {
      solutionHint = sentence.trim()
    }

    if (problemHint && solutionHint) break
  }

  return { problemHint, solutionHint }
}

interface VoiceAgentPanelProps {
  onTranscriptChange?: (transcript: string, problemHint?: string, solutionHint?: string) => void
  productName: string
  onProductNameChange: (name: string) => void
}

export function VoiceAgentPanel({ onTranscriptChange, productName, onProductNameChange }: VoiceAgentPanelProps) {
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [finalTranscript, setFinalTranscript] = useState('')

  const { isRecording, transcript, error, isSupported, startRecording, stopRecording, clearTranscript } = useSpeechToText({
    onTranscriptUpdate: (transcript) => {
      setCurrentTranscript(transcript)
    },
    onFinalTranscript: (transcript) => {
      setFinalTranscript(transcript)
      const { problemHint, solutionHint } = extractHints(transcript)
      onTranscriptChange?.(transcript, problemHint, solutionHint)
    }
  })

  const displayTranscript = currentTranscript || finalTranscript
  const { problemHint, solutionHint } = useMemo(() => extractHints(displayTranscript), [displayTranscript])

  const handleStart = useCallback(() => {
    clearTranscript()
    setCurrentTranscript('')
    setFinalTranscript('')
    startRecording()
  }, [startRecording, clearTranscript])

  const handleStop = useCallback(() => {
    stopRecording()
  }, [stopRecording])

  if (!isSupported) {
    return (
      <section className="rounded-3xl border border-red-500/40 bg-red-500/10 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl">
        <div className="text-center">
          <p className="text-lg font-semibold text-red-100">Speech Recognition Not Supported</p>
          <p className="mt-2 text-sm text-red-200">
            Your browser doesn't support speech recognition. Please use Chrome, Edge, or Safari.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl transition">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-300/80">Voice Recording</p>
          <h2 className="text-2xl font-semibold text-white">Startup Discovery Interview</h2>
          <p className="text-sm text-slate-400">
            Record your answers to all questions in one continuous recording using speech-to-text.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 pt-2 sm:pt-0">
          <button
            type="button"
            onClick={handleStart}
            disabled={isRecording}
            className="inline-flex items-center rounded-full bg-emerald-400/90 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:cursor-not-allowed disabled:bg-emerald-400/40"
          >
            {isRecording ? 'Recording...' : 'Start Recording'}
          </button>
          <button
            type="button"
            onClick={handleStop}
            disabled={!isRecording}
            className="inline-flex items-center rounded-full border border-red-500/40 px-5 py-2.5 text-sm font-semibold text-red-100 transition hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:cursor-not-allowed disabled:border-red-500/20 disabled:text-red-300/60"
          >
            Stop Recording
          </button>
        </div>
      </header>

      <div className="mt-4 flex items-center gap-3 text-sm">
        <span className={`inline-flex h-2.5 w-2.5 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-slate-500'}`} />
        <p className="text-slate-300">{isRecording ? 'Recording... speak clearly into your microphone' : 'Ready to record'}</p>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      )}

      {/* Question Prompts */}
      <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
        <h3 className="text-lg font-semibold text-emerald-100 mb-4">Please answer these questions in your recording:</h3>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/20 text-xs font-semibold text-emerald-300">1</span>
            <div>
              <p className="font-medium text-emerald-100">What does your company do?</p>
              <p className="text-sm text-emerald-200/80">Describe your business in 1-2 sentences.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/20 text-xs font-semibold text-emerald-300">2</span>
            <div>
              <p className="font-medium text-emerald-100">What problem are you solving?</p>
              <p className="text-sm text-emerald-200/80">What main problem or pain point does your company address? Who has this problem?</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/20 text-xs font-semibold text-emerald-300">3</span>
            <div>
              <p className="font-medium text-emerald-100">What is your solution?</p>
              <p className="text-sm text-emerald-200/80">What product or service do you provide? How does it solve the problem better than existing options?</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/20 text-xs font-semibold text-emerald-300">4</span>
            <div>
              <p className="font-medium text-emerald-100">How does it work?</p>
              <p className="text-sm text-emerald-200/80">Explain how your solution works in practice and what makes it unique.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-2xl border border-white/5 bg-slate-950/30 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-200">Live transcript</p>
            <p className="text-xs text-slate-500">
              {isRecording ? 'Recording...' : displayTranscript ? 'Recording complete' : 'Press start to begin'}
            </p>
          </div>
          <div className="mt-4 h-72 overflow-y-auto pr-2">
            {!displayTranscript ? (
              <p className="text-sm text-slate-500">
                Click "Start Recording" and answer all the questions above in one continuous recording.
              </p>
            ) : (
              <div className="rounded-2xl border border-sky-400/30 bg-sky-500/5 px-4 py-3 text-sm leading-relaxed text-slate-100 shadow-[0_0_25px_rgba(14,165,233,0.12)]">
                <p className="text-xs uppercase tracking-widest text-sky-300 mb-2">Your Recording</p>
                <p>{displayTranscript}</p>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-slate-950/30 p-4">
          <p className="text-sm font-medium text-slate-200 mb-4">Company Name</p>
          <input
            type="text"
            value={productName}
            onChange={(e) => onProductNameChange(e.target.value)}
            placeholder="Enter your company name"
            className="w-full rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-slate-200 placeholder-slate-500 outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
      </div>
    </section>
  )
}

export default VoiceAgentPanel
