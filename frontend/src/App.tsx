import VoiceAgentPanel from './components/VoiceAgentPanel'

function App() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 sm:px-8">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-[0.35em] text-emerald-300/80">Client Search</p>
          <h1 className="text-4xl font-semibold text-white">
            Marketing agent prototype: voice + PDF insights.
          </h1>
          <p className="max-w-3xl text-base text-slate-400">
            Interview founders via ElevenLabs, capture their problem and solution, and prepare the
            payload for the Client Search backend. Upload PDFs next to blend doc intelligence with
            the live conversation.
          </p>
        </header>

        <VoiceAgentPanel />
        {/* Upcoming sections for PDF upload and Client Search payload preview will attach below. */}
      </div>
    </main>
  )
}

export default App
