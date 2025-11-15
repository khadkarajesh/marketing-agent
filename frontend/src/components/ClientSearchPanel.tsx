import { useCallback, useState } from 'react'
import { useMistralProcessing } from '../hooks/useMistralProcessing'
import type { PdfPageText, ClientSearchPayload, MockResponse, RedditOpportunity } from '../types'

interface ClientSearchPanelProps {
  transcript: string
  pdfPages: PdfPageText[]
  productName: string
  onPayloadReady?: (payload: ClientSearchPayload) => void
}

const MOCK_MODE = import.meta.env.VITE_MOCK_MODE === 'true'

const generateMockResponse = (transcript: string, productName: string): MockResponse => {
  return [
    {
      problem: {
        similarity_score: 0.95,
        title: "My dog is so lonely, any advice?",
        subreddit: "r/dogs",
        user_id: "u/DogLover2024",
        url: "https://reddit.com/r/dogs/comments/lonely-dog",
        summary: "User is concerned about their dog's loneliness and looking for ways to help their pet socialize and find companionship."
      },
      marketing: `Hey! I actually built ${productName} to solve exactly this problem. It's like Tinder but for dogs - helps them find compatible playmates and even romantic connections through a swipe-based interface. Would love to get your feedback if you're interested in beta testing!`
    },
    {
      problem: {
        similarity_score: 0.88,
        title: "How to help my shy dog meet other dogs?",
        subreddit: "r/DogAdvice",
        user_id: "u/ShyPupOwner",
        url: "https://reddit.com/r/DogAdvice/comments/shy-dog",
        summary: "Owner of a shy dog seeking advice on how to help their pet become more social and comfortable around other dogs."
      },
      marketing: `This is such a common challenge! ${productName} could be perfect for this - it lets you find other dogs with similar temperaments and energy levels. You can even filter for other shy dogs so they can meet gradually. Want to try it out?`
    },
    {
      problem: {
        similarity_score: 0.92,
        title: "Dog dating apps - do they work?",
        subreddit: "r/petowners",
        user_id: "u/CuriousPetParent",
        url: "https://reddit.com/r/petowners/comments/dog-dating",
        summary: "Pet owner is curious about dog dating applications and whether they're effective for helping pets find companions."
      },
      marketing: `Great question! As someone who built ${productName}, I can tell you they definitely work when done right. The key is matching based on temperament, size, and play style - not just location. Happy to share more about how the matching algorithm works if you're interested!`
    },
    {
      problem: {
        similarity_score: 0.78,
        title: "Puppy needs playmates but I don't know other dog owners",
        subreddit: "r/puppy101",
        user_id: "u/FirstTimePupParent",
        url: "https://reddit.com/r/puppy101/comments/puppy-playmates",
        summary: "New puppy owner struggling to find other dog owners in their area for puppy socialization and playdates."
      },
      marketing: `Welcome to puppy parenthood! This is exactly why I created ${productName} - it connects dog owners in your area and helps set up playdates. Since you have a puppy, you can specifically match with other puppy owners for proper socialization. Want me to send you an invite?`
    }
  ]
}

export function ClientSearchPanel({ transcript, pdfPages, productName, onPayloadReady }: ClientSearchPanelProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string>()
  const [success, setSuccess] = useState(false)
  const [mockResponse, setMockResponse] = useState<MockResponse>()

  const { processWithMistral, buildClientSearchPayload } = useMistralProcessing()

  const hasContent = transcript.trim().length > 0 || pdfPages.length > 0
  const canSubmit = hasContent && productName.trim() && !isProcessing

  const handleGetMagic = useCallback(async () => {
    if (!canSubmit) return

    setIsProcessing(true)
    setError(undefined)
    setSuccess(false)
    setMockResponse(undefined)

    try {
      console.log('🪄 Starting the magic...')

      // Step 1: Process with Mistral AI
      const processedData = await processWithMistral(transcript, pdfPages)
      if (!processedData) {
        throw new Error('Failed to process with Mistral AI')
      }

      // Step 2: Build payload
      const payload = buildClientSearchPayload(transcript, pdfPages, processedData, productName)
      console.log('📤 Payload ready:', payload)

      onPayloadReady?.(payload)

      if (MOCK_MODE) {
        // Mock mode: simulate 5 second delay then show Reddit suggestions
        console.log('🎭 Mock mode: simulating backend processing...')

        await new Promise(resolve => setTimeout(resolve, 5000))

        const mockData = generateMockResponse(transcript, productName)
        setMockResponse(mockData)
        setSuccess(true)

        console.log('🎭 Mock response generated:', mockData)
      } else {
        // Real mode: submit to actual backend
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
        console.log('✅ Real backend response:', result)
        setMockResponse(result)
        setSuccess(true)
      }
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

      {success && !mockResponse && (
        <div className="mt-6 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100 text-center">
          ✅ Magic complete! Your data has been processed and submitted successfully.
        </div>
      )}

      {mockResponse && (
        <div className="mt-6 space-y-6">
          {/* Success Message */}
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100 text-center">
            ✅ Found {mockResponse.length} relevant Reddit opportunities!
          </div>

          {/* Reddit Opportunities */}
          <div className="space-y-4">
            {mockResponse.map((opportunity, index) => (
              <div
                key={index}
                className="rounded-2xl border border-white/10 bg-slate-900/60 p-6"
              >
                {/* Post Info */}
                <div className="mb-4">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-sm font-medium text-orange-300">{opportunity.problem.subreddit}</span>
                    <span className="text-xs text-slate-500">•</span>
                    <span className="text-xs text-slate-400">by {opportunity.problem.user_id}</span>
                    <span className="text-xs text-slate-500">•</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-emerald-300">Match: </span>
                      <span className="text-xs font-medium text-emerald-200">
                        {Math.round(opportunity.problem.similarity_score * 100)}%
                      </span>
                    </div>
                  </div>

                  <h4 className="text-lg font-medium text-white mb-2">{opportunity.problem.title}</h4>
                  <p className="text-sm text-slate-300 mb-3">{opportunity.problem.summary}</p>

                  <a
                    href={opportunity.problem.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-blue-300 hover:text-blue-200 transition-colors"
                  >
                    View Thread →
                  </a>
                </div>

                {/* Marketing Message */}
                <div className="border-t border-white/5 pt-4">
                  <h5 className="text-sm font-medium text-purple-200 mb-3">💬 Suggested Reply</h5>
                  <div className="rounded-xl bg-slate-950/60 p-4 mb-3">
                    <p className="text-slate-200 leading-relaxed text-sm">{opportunity.marketing}</p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => navigator.clipboard.writeText(opportunity.marketing)}
                      className="inline-flex items-center rounded-lg bg-purple-500/20 px-3 py-1.5 text-xs font-medium text-purple-200 hover:bg-purple-500/30 transition-colors"
                    >
                      📋 Copy
                    </button>
                    <button className="inline-flex items-center rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-500/30 transition-colors">
                      🚀 Reply
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

export default ClientSearchPanel