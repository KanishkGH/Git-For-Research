import type {
  IngestionInput,
  IngestionResult,
  ParsedArtifact,
  ArtifactParser,
  ArtifactType,
} from '@/lib/ingestion/types'

/**
 * Extracts a document title from YAML frontmatter or the first H1 header.
 */
export function extractMarkdownTitle(
  content: string,
  fallbackFilename: string
): string {
  // 1. Check YAML Frontmatter
  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/)
  if (frontmatterMatch) {
    const yamlBody = frontmatterMatch[1]
    const titleMatch = yamlBody.match(/^title:\s*["']?([^"'\n\r]+)["']?/m)
    if (titleMatch && titleMatch[1].trim()) {
      return titleMatch[1].trim()
    }
  }

  // 2. Check First H1 Header (# Title)
  const h1Match = content.match(/^#\s+(.+)$/m)
  if (h1Match && h1Match[1].trim()) {
    return h1Match[1].trim()
  }

  // 3. Fallback to filename without extension
  const baseName = fallbackFilename.replace(/\.[^/.]+$/, '').trim()
  return baseName || 'Untitled Document'
}

export class MarkdownParser implements ArtifactParser {
  supports(detectedType: ArtifactType): boolean {
    return detectedType === 'markdown' || detectedType === 'codebase'
  }

  async parse(input: IngestionInput): Promise<IngestionResult> {
    try {
      const buffer = Buffer.isBuffer(input.buffer)
        ? input.buffer
        : Buffer.from(input.buffer)

      if (buffer.length === 0) {
        return {
          success: false,
          error: 'The uploaded file is empty.',
          code: 'EMPTY_DOCUMENT',
        }
      }

      // Convert to UTF-8 text and strip BOM
      let text = buffer.toString('utf8')
      if (text.charCodeAt(0) === 0xfeff) {
        text = text.slice(1)
      }

      // Normalize line endings
      text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()

      if (!text) {
        return {
          success: false,
          error: 'The document contains no readable text.',
          code: 'EMPTY_DOCUMENT',
        }
      }

      const isCode = input.filename.match(/\.(py|ts|tsx|js|jsx|rs|go|cpp|c|java|r|sql|sh|yaml|yml)$/i)
      const artifactType: ArtifactType = isCode ? 'codebase' : 'markdown'
      const title = extractMarkdownTitle(text, input.filename)

      const wordCount = text.split(/\s+/).filter(Boolean).length
      const charCount = text.length
      const byteSize = buffer.length

      const parsed: ParsedArtifact = {
        artifactType,
        title,
        canonicalContent: text,
        originalFilename: input.filename,
        detectedMimeType: isCode ? 'text/plain' : 'text/markdown',
        metadata: {
          originalFilename: input.filename,
          detectedMimeType: isCode ? 'text/plain' : 'text/markdown',
          byteSize,
          wordCount,
          charCount,
          sourceType: artifactType,
          extractedAt: new Date().toISOString(),
          title,
        },
      }

      return { success: true, data: parsed }
    } catch (err) {
      return {
        success: false,
        error: `Failed to parse Markdown document: ${err instanceof Error ? err.message : 'Unknown error'}`,
        code: 'PARSING_ERROR',
      }
    }
  }
}

export const markdownParser = new MarkdownParser()
