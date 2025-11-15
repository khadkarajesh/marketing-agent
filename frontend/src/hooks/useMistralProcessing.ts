import { useCallback, useState } from 'react'
import type { PdfPageText, ProcessedCompanyData, ClientSearchPayload } from '../types'

const MISTRAL_API_KEY = import.meta.env.VITE_MISTRAL_API_KEY || ''
const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions'

export const useMistralProcessing = () => {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string>()
  const [processedData, setProcessedData] = useState<ProcessedCompanyData>()

  const processWithMistral = useCallback(async (transcript: string, pdfPages: PdfPageText[]) => {
    if (!MISTRAL_API_KEY) {
      setError('Mistral API key not configured')
      return null
    }

    if (!transcript.trim() && pdfPages.length === 0) {
      setError('No transcript or PDF content to process')
      return null
    }

    setIsProcessing(true)
    setError(undefined)

    try {
      // Build content for Mistral with clear priority instructions
      let content = `You are analyzing a startup based on the founder's voice interview. The voice transcript is the PRIMARY SOURCE and should be used for extracting the problem and solution.

**PRIMARY SOURCE - VOICE TRANSCRIPT FROM FOUNDER:**
${transcript || 'No voice transcript provided.'}

**SECONDARY SOURCE - SUPPORTING DOCUMENTS (for context only):**
`

      if (pdfPages.length > 0) {
        pdfPages.forEach((page, index) => {
          content += `Document ${page.filename}, Page ${page.pageNumber}:
${page.text || 'No text found on this page.'}

`
        })
      } else {
        content += 'No document content provided.\n'
      }

      content += `
**CRITICAL INSTRUCTIONS:**
1. **PRIORITIZE THE VOICE TRANSCRIPT**: Extract the problem and solution PRIMARILY from what the founder said in their voice recording.
2. **Use documents only as supporting context**: Only use PDF content if the voice transcript is missing or unclear.
3. **Focus on the founder's current company**: Extract the problem and solution for the company the founder is describing in their voice.

Based on the VOICE TRANSCRIPT above (not the documents), you need to provide THREE things:

1. PROBLEM: What specific problem does the founder's company solve? (1-3 sentences)
2. SOLUTION: What is the founder's solution/product/service? (1-3 sentences)
3. FORMATTED TRANSCRIPT: Convert the voice transcript into a professional conversation format

For the formatted transcript, structure it as a dialogue between an AI interviewer and the founder:
- Start with AI asking discovery questions
- Show the founder's responses based on their actual transcript content
- Format as: "AI: [question]\\nFounder: [response from transcript]\\n"
- Make it flow naturally like a professional startup interview
- Include 4-6 exchanges total

EXAMPLE FORMAT:
"AI: Hi! To help you find the best online communities, I first need to understand your company. What problem are you solving?\\nFounder: [founder's actual description]\\nAI: [follow-up question based on their response]\\nFounder: [more from their transcript]\\n..."

If the voice transcript mentions a different company than the documents, USE THE VOICE TRANSCRIPT.

Please respond ONLY with valid JSON in this exact format:
{
  "problem": "Problem description based on founder's voice transcript",
  "solution": "Solution description based on founder's voice transcript",
  "formattedTranscript": "AI: Hi! To help you find...\\nFounder: ...\\nAI: ...\\nFounder: ..."
}

Do not include any other text, explanations, or markdown formatting. Just the JSON object.`

      // console.log('🤖 Sending to Mistral:', { content: content.substring(0, 200) + '...' })

      const response = await fetch(MISTRAL_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MISTRAL_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'mistral-small-latest',
          messages: [
            {
              role: 'user',
              content: content,
            },
          ],
          temperature: 0.1,
          max_tokens: 500,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Mistral API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      const aiResponse = data.choices?.[0]?.message?.content

      if (!aiResponse) {
        throw new Error('No response from Mistral API')
      }

      console.log('🤖 Mistral response:', aiResponse)

      // Parse the JSON response
      let parsed: ProcessedCompanyData
      try {
        // Clean the response in case there's extra text
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
        const jsonStr = jsonMatch ? jsonMatch[0] : aiResponse
        parsed = JSON.parse(jsonStr)
      } catch (parseError) {
        console.error('Failed to parse Mistral response as JSON:', aiResponse)
        throw new Error('Invalid JSON response from Mistral API')
      }

      // Validate the response structure
      if (!parsed.problem || !parsed.solution || !parsed.formattedTranscript) {
        throw new Error('Incomplete response from Mistral - missing problem, solution, or formattedTranscript')
      }

      console.log('✅ Processed company data:', parsed)
      setProcessedData(parsed)
      return parsed
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      console.error('❌ Mistral processing error:', err)
      setError(errorMessage)
      return null
    } finally {
      setIsProcessing(false)
    }
  }, [])

  const buildClientSearchPayload = useCallback((
    transcript: string,
    pdfPages: PdfPageText[],
    processedData?: ProcessedCompanyData,
    productName?: string
  ): ClientSearchPayload => {
    return {
      conversationTranscript: processedData?.formattedTranscript || transcript,
      conversationProblemHint: processedData?.problem,
      conversationSolutionHint: processedData?.solution,
      productName: productName || 'Unknown Product',
      pdfPages: pdfPages,
    }
  }, [])

  return {
    isProcessing,
    error,
    processedData,
    processWithMistral,
    buildClientSearchPayload,
  }
}