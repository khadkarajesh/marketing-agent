import { useMemo, useState } from 'react'
import VoiceAgentPanel from './components/VoiceAgentPanel'
import PdfUploadPanel from './components/PdfUploadPanel'
import ClientSearchPanel from './components/ClientSearchPanel'
import type { PdfPageText, ClientSearchPayload } from './types'

function App() {
  const [pdfPages, setPdfPages] = useState<PdfPageText[]>([])
  const [conversationTranscript, setConversationTranscript] = useState('')
  const [problemHint, setProblemHint] = useState<string>()
  const [solutionHint, setSolutionHint] = useState<string>()
  const [productName, setProductName] = useState('')

  const firstPage = useMemo(() => pdfPages[0], [pdfPages])

  const handleTranscriptChange = (transcript: string, problem?: string, solution?: string) => {
    setConversationTranscript(transcript)
    setProblemHint(problem)
    setSolutionHint(solution)
  }

  const handlePayloadReady = (payload: ClientSearchPayload) => {
    console.log('📋 Final payload ready for backend:', payload)
    // Here you could save to state, send to analytics, etc.
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 sm:px-8">

        <VoiceAgentPanel
          onTranscriptChange={handleTranscriptChange}
          productName={productName}
          onProductNameChange={setProductName}
        />
        <PdfUploadPanel onDocumentsChange={setPdfPages} />
        <ClientSearchPanel
          transcript={conversationTranscript}
          pdfPages={pdfPages}
          productName={productName}
          onPayloadReady={handlePayloadReady}
        />

      </div>
    </main>
  )
}

export default App
