import { useCallback, useMemo, useRef, useState } from 'react'
import type { PdfPageText } from '../types'
import { pdfToPageText } from '../utils/pdf'

type UploadStatus = 'pending' | 'processing' | 'done' | 'error'

interface UploadEntry {
  id: string
  filename: string
  status: UploadStatus
  pages: PdfPageText[]
  error?: string
  lastUpdated: number
}

interface PdfUploadPanelProps {
  onDocumentsChange?: (pages: PdfPageText[]) => void
}

const statusStyles: Record<
  UploadStatus,
  {
    label: string
    badge: string
    text: string
  }
> = {
  pending: {
    label: 'Pending',
    badge: 'bg-slate-800 border-slate-700 text-slate-300',
    text: 'text-slate-400',
  },
  processing: {
    label: 'Processing',
    badge: 'bg-amber-500/10 border-amber-400/40 text-amber-200',
    text: 'text-amber-100',
  },
  done: {
    label: 'Parsed',
    badge: 'bg-emerald-500/10 border-emerald-400/40 text-emerald-200',
    text: 'text-emerald-200',
  },
  error: {
    label: 'Error',
    badge: 'bg-red-500/10 border-red-400/40 text-red-200',
    text: 'text-red-200',
  },
}

const getEntryId = (file: File) => `${file.name}-${file.size}-${file.lastModified}`

const summarize = (text: string, length = 240) =>
  text.length <= length ? text : `${text.slice(0, length).trim()}…`

export default function PdfUploadPanel({ onDocumentsChange }: PdfUploadPanelProps) {
  const [entries, setEntries] = useState<UploadEntry[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [globalError, setGlobalError] = useState<string>()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const updateEntries = useCallback(
    (mutate: (current: UploadEntry[]) => UploadEntry[]) => {
      setEntries((current) => {
        const updated = mutate(current)
        onDocumentsChange?.(updated.flatMap((entry) => entry.pages))
        return updated
      })
    },
    [onDocumentsChange],
  )

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files?.length) return
      setGlobalError(undefined)

      const pdfFiles = Array.from(files).filter((file) =>
        file.type ? file.type === 'application/pdf' : file.name.toLowerCase().endsWith('.pdf'),
      )

      if (!pdfFiles.length) {
        setGlobalError('Only PDF files are supported.')
        return
      }

      pdfFiles.forEach(async (file) => {
        const id = getEntryId(file)
        updateEntries((current) => {
          const exists = current.some((entry) => entry.id === id)
          if (exists) {
            return current.map((entry) =>
              entry.id === id
                ? { ...entry, status: 'processing', error: undefined, pages: [], lastUpdated: Date.now() }
                : entry,
            )
          }
          return [
            ...current,
            {
              id,
              filename: file.name,
              status: 'processing',
              pages: [],
              lastUpdated: Date.now(),
            },
          ]
        })

        try {
          const pages = await pdfToPageText(file)
          updateEntries((current) =>
            current.map((entry) =>
              entry.id === id
                ? {
                    ...entry,
                    status: 'done',
                    pages,
                    lastUpdated: Date.now(),
                  }
                : entry,
            ),
          )
        } catch (err) {
          console.error('Failed to process PDF text', err)
          updateEntries((current) =>
            current.map((entry) =>
              entry.id === id
                ? {
                    ...entry,
                    status: 'error',
                    error:
                      err instanceof Error
                        ? err.message
                        : 'Unable to extract text from this PDF.',
                    lastUpdated: Date.now(),
                  }
                : entry,
            ),
          )
        }
      })

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [updateEntries],
  )

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLLabelElement>) => {
      event.preventDefault()
      setIsDragging(false)
      handleFiles(event.dataTransfer.files)
    },
    [handleFiles],
  )

  const totalPages = useMemo(
    () => entries.reduce((count, entry) => count + entry.pages.length, 0),
    [entries],
  )

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl transition">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-sky-300/80">Documents</p>
          <h2 className="text-2xl font-semibold text-white">Upload pitch decks & PDFs</h2>
          <p className="text-sm text-slate-400">
            We keep a literal transcription of every PDF page so the backend can reason over text.
          </p>
        </div>
        <div className="rounded-full border border-white/10 px-4 py-1 text-sm text-slate-300">
          {totalPages ? `${totalPages} pages captured` : 'Awaiting uploads'}
        </div>
      </header>

      <label
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`mt-6 flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition ${
          isDragging ? 'border-sky-400 bg-sky-500/5' : 'border-white/10 bg-slate-950/30'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="application/pdf"
          className="hidden"
          onChange={(event) => handleFiles(event.target.files)}
        />
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-sky-500/10 text-2xl text-sky-300">
          ⬆
        </span>
        <p className="mt-4 text-base font-semibold text-white">Drop PDFs here</p>
        <p className="text-sm text-slate-400">or click to browse files</p>
      </label>

      {globalError && (
        <p className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {globalError}
        </p>
      )}

      <div className="mt-6 space-y-4">
        {entries.length === 0 && (
          <p className="text-sm text-slate-500">No PDFs processed yet.</p>
        )}

        {entries
          .sort((a, b) => b.lastUpdated - a.lastUpdated)
          .map((entry) => (
            <article
              key={entry.id}
              className="rounded-2xl border border-white/5 bg-slate-950/40 p-4 shadow-inner shadow-black/20"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">{entry.filename}</p>
                  <p className="text-xs text-slate-500">
                    {entry.pages.length ? `${entry.pages.length} pages` : 'awaiting text extract'}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-widest ${statusStyles[entry.status].badge}`}
                >
                  {statusStyles[entry.status].label}
                </span>
              </div>

              <div className="mt-3 text-sm text-slate-300">
                {entry.status === 'error' && (
                  <p className={statusStyles.error.text}>{entry.error}</p>
                )}
                {entry.status !== 'error' && entry.pages.length > 0 && (
                  <>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      Page 1 preview
                    </p>
                    <p className="mt-2 text-slate-200">
                      {summarize(entry.pages[0]?.text ?? 'No text detected on this page.')}
                    </p>
                  </>
                )}
                {entry.status !== 'error' && entry.pages.length === 0 && (
                  <p className="text-slate-400">Parsing literal text…</p>
                )}
              </div>
            </article>
          ))}
      </div>
    </section>
  )
}
