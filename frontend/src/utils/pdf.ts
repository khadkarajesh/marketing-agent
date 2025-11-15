import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { PdfPageText } from '../types'

GlobalWorkerOptions.workerSrc = workerSrc

export async function pdfToPageText(file: File): Promise<PdfPageText[]> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await getDocument({ data: arrayBuffer }).promise
  const results: PdfPageText[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const textContent = await page.getTextContent()
    const text = textContent.items
      .map((item) => {
        if ('str' in item && typeof item.str === 'string') {
          return item.str
        }
        return ''
      })
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()

    results.push({
      filename: file.name,
      pageNumber,
      text,
    })
  }

  return results
}
