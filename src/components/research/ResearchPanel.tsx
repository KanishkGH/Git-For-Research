'use client'

import { useState, useTransition, type FormEvent } from 'react'
import Link from 'next/link'
import {
  askResearchAction,
  indexNextResearchBatchAction,
  type ResearchSource,
} from '@/app/actions/research'

export function ResearchPanel({ workspaceId, canEdit }: { workspaceId: string; canEdit: boolean }) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [sources, setSources] = useState<ResearchSource[]>([])
  const [error, setError] = useState('')
  const [indexStatus, setIndexStatus] = useState('')
  const [isIndexing, setIsIndexing] = useState(false)
  const [isAsking, startAsk] = useTransition()

  async function indexWorkspace() {
    setError('')
    setIsIndexing(true)
    try {
      for (let batch = 0; batch < 1000; batch++) {
        const result = await indexNextResearchBatchAction(workspaceId)
        if (!result.success) throw new Error(result.error)
        if (result.data.done) {
          setIndexStatus('All commit versions are searchable.')
          return
        }
        setIndexStatus(`Indexing commit ${result.data.commitId?.slice(0, 7)}: ${result.data.indexed}/${result.data.total} chunks`)
      }
      setIndexStatus('Indexing paused after 1000 batches. Click Index research again to continue.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Indexing failed.')
    } finally {
      setIsIndexing(false)
    }
  }

  function ask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setAnswer('')
    setSources([])
    startAsk(async () => {
      const result = await askResearchAction(workspaceId, question)
      if (!result.success) {
        setError(result.error)
        return
      }
      setAnswer(result.data.answer)
      setSources(result.data.sources)
    })
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Ask your research</h2>
          <p className="mt-1 text-sm text-slate-500">Search across artifacts and commit versions, with sources.</p>
        </div>
        {canEdit && <button type="button" onClick={indexWorkspace} disabled={isIndexing || isAsking}
          className="rounded-md border border-indigo-300 px-3 py-2 text-sm font-medium text-indigo-700 disabled:opacity-50 dark:border-indigo-700 dark:text-indigo-300">
          {isIndexing ? 'Indexing…' : 'Index research'}
        </button>}
      </div>
      {indexStatus && <p role="status" className="mt-3 text-sm text-slate-600 dark:text-slate-300">{indexStatus}</p>}
      <form onSubmit={ask} className="mt-5 flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="research-question">Research question</label>
        <input id="research-question" value={question} onChange={(event) => setQuestion(event.target.value)}
          maxLength={1000} required placeholder="What does our research say about…?"
          className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" />
        <button type="submit" disabled={isAsking || isIndexing}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {isAsking ? 'Searching…' : 'Ask'}
        </button>
      </form>
      {error && <p role="alert" className="mt-3 text-sm text-rose-600">{error}</p>}
      {answer && (
        <div className="mt-5 space-y-4 border-t border-slate-200 pt-4 dark:border-slate-800">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{answer}</p>
          {sources.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold">Sources</h3>
              <ol className="mt-2 space-y-2">
                {sources.map((source) => (
                  <li key={`${source.commitId}-${source.number}`} className="rounded-md bg-slate-50 p-3 text-xs dark:bg-slate-800">
                    <Link className="font-medium text-indigo-700 underline dark:text-indigo-300"
                      href={`/workspaces/${workspaceId}/artifacts/${source.artifactId}?commit=${source.commitId}`}>
                      [{source.number}] {source.artifactName} · commit {source.commitId.slice(0, 7)}
                    </Link>
                    <p className="mt-1 line-clamp-3 text-slate-600 dark:text-slate-300">{source.excerpt}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
