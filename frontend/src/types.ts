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
