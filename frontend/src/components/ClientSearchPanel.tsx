import { useCallback, useState } from 'react'
import { useMistralProcessing } from '../hooks/useMistralProcessing'
import type { PdfPageText, ClientSearchPayload } from '../types'

interface ClientSearchPanelProps {
  transcript: string
  pdfPages: PdfPageText[]
  productName: string
  onPayloadReady?: (payload: ClientSearchPayload) => void
}

export function ClientSearchPanel({ transcript, pdfPages, productName, onPayloadReady }: ClientSearchPanelProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string>()
  const [success, setSuccess] = useState(false)

  const { processWithMistral, buildClientSearchPayload } = useMistralProcessing()

  const hasContent = transcript.trim().length > 0 || pdfPages.length > 0
  const canSubmit = hasContent && productName.trim() && !isProcessing

  const handleGetMagic = useCallback(async () => {
    if (!canSubmit) return

    setIsProcessing(true)
    setError(undefined)
    setSuccess(false)

    try {
      console.log('🪄 Starting the magic...')

      // Step 1: Process with Mistral AI
      const processedData = await processWithMistral(transcript, pdfPages)
      if (!processedData) {
        throw new Error('Failed to process with Mistral AI')
      }

      // Step 2: Build payload and submit to backend
      const payload = buildClientSearchPayload(transcript, pdfPages, processedData, productName)
      console.log('📤 Submitting to backend:', payload)

      onPayloadReady?.(payload)

      // Submit to backend
      const CLIENT_SEARCH_URL = import.meta.env.VITE_CLIENT_SEARCH_URL || '/client-search'

      const response = await fetch(CLIENT_SEARCH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      console.log('✅ Magic complete! Backend response:', result)
      setSuccess(true)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      console.error('❌ Magic failed:', err)
      setError(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }, [canSubmit, processWithMistral, transcript, pdfPages, buildClientSearchPayload, productName, onPayloadReady])

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl transition">
      <div className="text-center">
        <button
          type="button"
          onClick={handleGetMagic}
          disabled={!canSubmit}
          className="inline-flex items-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-4 text-lg font-bold text-white shadow-2xl shadow-purple-500/30 transition-all hover:from-purple-400 hover:to-pink-400 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-300 disabled:cursor-not-allowed disabled:opacity-50 disabled:scale-100"
        >
          {isProcessing ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Working Magic...
            </>
          ) : (
            <>
              ✨ Get the Magic
            </>
          )}
        </button>

        {!hasContent && (
          <p className="mt-4 text-sm text-slate-400">
            Record your pitch and upload documents to get started
          </p>
        )}

        {hasContent && !productName.trim() && (
          <p className="mt-4 text-sm text-slate-400">
            Enter your company name above to continue
          </p>
        )}
      </div>

      {error && (
        <div className="mt-6 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100 text-center">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-6 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100 text-center">
          ✅ Magic complete! Your data has been processed and submitted successfully.
        </div>
      )}
    </section>
  )
}

export default ClientSearchPanel