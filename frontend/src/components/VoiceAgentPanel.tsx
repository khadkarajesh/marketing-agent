import { useCallback, useMemo } from 'react'
import { useElevenLabsConversation } from '../hooks/useElevenLabsConversation'
import type { ConversationTurn } from '../types'

const problemKeywords = ['problem', 'pain', 'issue', 'challenge', 'struggle']
const solutionKeywords = ['solution', 'product', 'service', 'platform', 'tool', 'app']

const extractHints = (turns: ConversationTurn[]) => {
  let problemHint: string | undefined
  let solutionHint: string | undefined

  for (let i = turns.length - 1; i >= 0; i -= 1) {
    const turn = turns[i]
    if (turn.role !== 'user') continue
    const normalized = turn.text.toLowerCase()

    if (!problemHint && problemKeywords.some((keyword) => normalized.includes(keyword))) {
      problemHint = turn.text
    }

    if (!solutionHint && solutionKeywords.some((keyword) => normalized.includes(keyword))) {
      solutionHint = turn.text
    }

    if (problemHint && solutionHint) break
  }

  return { problemHint, solutionHint }
}

const roleStyles: Record<
  ConversationTurn['role'],
  { label: string; bubble: string; accent: string }
> = {
  agent: {
    label: 'Agent',
    bubble:
      'bg-emerald-500/10 border border-emerald-400/30 text-emerald-50 shadow-[0_0_25px_rgba(16,185,129,0.15)]',
    accent: 'text-emerald-300',
  },
  user: {
    label: 'Founder',
    bubble:
      'bg-sky-500/5 border border-sky-400/30 text-slate-100 shadow-[0_0_25px_rgba(14,165,233,0.12)]',
    accent: 'text-sky-300',
  },
}

const buildTranscript = (turns: ConversationTurn[]) =>
  turns.map((turn) => `${roleStyles[turn.role].label}: ${turn.text}`).join('\n')

export function VoiceAgentPanel() {
  const { isActive, turns, error, startSession, stopSession } = useElevenLabsConversation()

  const transcript = useMemo(() => buildTranscript(turns), [turns])
  const { problemHint, solutionHint } = useMemo(() => extractHints(turns), [turns])

  const handleStart = useCallback(async () => {
    try {
      await startSession()
    } catch (startError) {
      console.error('Unable to start conversation', startError)
    }
  }, [startSession])

  const handleStop = useCallback(() => {
    stopSession()
  }, [stopSession])

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl transition">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-300/80">Voice Agent</p>
          <h2 className="text-2xl font-semibold text-white">Founder discovery conversation</h2>
          <p className="text-sm text-slate-400">
            Kick off an ElevenLabs session, interview the founder, and capture a full transcript.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 pt-2 sm:pt-0">
          <button
            type="button"
            onClick={handleStart}
            disabled={isActive}
            className="inline-flex items-center rounded-full bg-emerald-400/90 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:cursor-not-allowed disabled:bg-emerald-400/40"
          >
            Start Conversation
          </button>
          <button
            type="button"
            onClick={handleStop}
            disabled={!isActive}
            className="inline-flex items-center rounded-full border border-red-500/40 px-5 py-2.5 text-sm font-semibold text-red-100 transition hover:bg-red-500/10 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:cursor-not-allowed disabled:border-red-500/20 disabled:text-red-300/60"
          >
            Stop
          </button>
        </div>
      </header>

      <div className="mt-4 flex items-center gap-3 text-sm">
        <span className={`inline-flex h-2.5 w-2.5 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
        <p className="text-slate-300">{isActive ? 'Listening… mic streaming to ElevenLabs' : 'Idle'}</p>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-2xl border border-white/5 bg-slate-950/30 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-200">Live transcript</p>
            <p className="text-xs text-slate-500">
              {turns.length ? `${turns.length} turns` : 'waiting for audio…'}
            </p>
          </div>
          <div className="mt-4 h-72 overflow-y-auto space-y-3 pr-2">
            {turns.length === 0 && (
              <p className="text-sm text-slate-500">
                Start the conversation to see transcript updates in real time.
              </p>
            )}
            {turns.map((turn) => (
              <article
                key={`${turn.timestamp}-${turn.role}-${turn.text}`}
                className={`rounded-2xl border px-4 py-3 text-sm leading-relaxed ${roleStyles[turn.role].bubble}`}
              >
                <p className={`text-xs uppercase tracking-widest ${roleStyles[turn.role].accent}`}>
                  {roleStyles[turn.role].label}
                </p>
                <p className="mt-2 text-sm text-slate-100">{turn.text}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/5 bg-slate-950/30 p-4">
            <p className="text-sm font-medium text-slate-200">Problem / Solution hints</p>
            <dl className="mt-3 space-y-3 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-widest text-slate-500">Problem hint</dt>
                <dd className="mt-1 text-slate-100">
                  {problemHint ?? 'No strong problem signal detected yet.'}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-widest text-slate-500">Solution hint</dt>
                <dd className="mt-1 text-slate-100">
                  {solutionHint ?? 'Keep asking about the product or service.'}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-white/5 bg-slate-950/30 p-4">
            <p className="text-sm font-medium text-slate-200">Conversation transcript</p>
            <textarea
              readOnly
              value={transcript}
              rows={8}
              className="mt-3 w-full rounded-xl border border-white/10 bg-slate-900/60 p-3 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-emerald-400"
              placeholder="Conversation transcript will appear once turns are captured."
            />
          </div>
        </div>
      </div>
    </section>
  )
}

export default VoiceAgentPanel
