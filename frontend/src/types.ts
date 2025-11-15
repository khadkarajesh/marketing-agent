export type Role = 'agent' | 'user'

export interface ConversationTurn {
  role: Role
  text: string
  timestamp?: number
}

export interface PdfPageText {
  filename: string
  pageNumber: number
  text: string
}

export interface ClientSearchPayload {
  conversationTranscript: string
  conversationProblemHint?: string
  productName: string
  conversationSolutionHint?: string
  pdfPages: PdfPageText[]
}

export interface ProcessedCompanyData {
  problem: string
  solution: string
  formattedTranscript: string
}

export interface MistralProcessingRequest {
  transcript: string
  pdfContent: PdfPageText[]
}

export interface RedditOpportunity {
  problem: {
    similarity_score: number
    title: string
    subreddit: string
    user_id: string
    url: string
    summary: string
  }
  marketing: string
}

export type MockResponse = RedditOpportunity[]
