export type Role = 'agent' | 'user'

export interface ConversationTurn {
  role: Role
  text: string
  timestamp?: number
}

export interface PdfImage {
  filename: string
  pageNumber: number
  dataUrl: string
}

export interface ClientSearchPayload {
  conversationTranscript: string
  conversationProblemHint?: string
  productName: string
  conversationSolutionHint?: string
  pdfImages: PdfImage[]
}
