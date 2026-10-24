/** Searchable text tied to a precise range in an immutable commit. */
export interface ContentChunk {
  index: number
  content: string
  startOffset: number
  endOffset: number
}

const MAX_CHARS = 1200
const OVERLAP_CHARS = 160

/** Split a commit snapshot while keeping paragraph boundaries when possible. */
export function chunkContent(source: string): ContentChunk[] {
  const chunks: ContentChunk[] = []
  let start = 0

  while (start < source.length) {
    let end = Math.min(start + MAX_CHARS, source.length)

    if (end < source.length) {
      const floor = start + Math.floor(MAX_CHARS * 0.6)
      const paragraphEnd = source.lastIndexOf('\n\n', end)
      const lineEnd = source.lastIndexOf('\n', end)
      const wordEnd = source.lastIndexOf(' ', end)
      if (paragraphEnd >= floor) end = paragraphEnd + 2
      else if (lineEnd >= floor) end = lineEnd + 1
      else if (wordEnd >= floor) end = wordEnd + 1
    }

    const raw = source.slice(start, end)
    const leadingSpace = raw.length - raw.trimStart().length
    const trailingSpace = raw.length - raw.trimEnd().length
    const content = raw.trim()

    if (content) {
      chunks.push({
        index: chunks.length,
        content,
        startOffset: start + leadingSpace,
        endOffset: end - trailingSpace,
      })
    }

    if (end === source.length) break
    start = Math.max(start + 1, end - OVERLAP_CHARS)
  }

  return chunks
}
