import { useMemo, useState } from 'react'
import VoiceAgentPanel from './components/VoiceAgentPanel'
import PdfUploadPanel from './components/PdfUploadPanel'
import type { PdfPageText } from './types'

function App() {
  const [pdfPages, setPdfPages] = useState<PdfPageText[]>([])

  const firstPage = useMemo(() => pdfPages[0], [pdfPages])

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
        <PdfUploadPanel onDocumentsChange={setPdfPages} />

        <section className="rounded-3xl border border-white/10 bg-slate-900/40 p-6 shadow-2xl shadow-black/40">
          <h3 className="text-lg font-semibold text-white">Document text snapshot</h3>
          <p className="text-sm text-slate-400">
            {pdfPages.length
              ? `Ready to send ${pdfPages.length} PDF page transcripts to Client Search.`
              : 'Once PDFs are parsed, the first page preview will show up here.'}
          </p>
          {firstPage && (
            <article className="mt-4 rounded-2xl border border-white/5 bg-slate-950/40 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                {firstPage.filename} — page {firstPage.pageNumber}
              </p>
              <p className="mt-2 text-sm text-slate-200">{firstPage.text || 'No text detected.'}</p>
            </article>
          )}
        </section>
      </div>
    </main>
  )
}

export default App
