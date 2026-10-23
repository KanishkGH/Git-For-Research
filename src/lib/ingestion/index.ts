import type { IngestionInput, IngestionResult } from '@/lib/ingestion/types'
import { detectArtifactType, MAX_FILE_SIZE_BYTES } from '@/lib/ingestion/detector'
import { markdownParser } from '@/lib/ingestion/markdown-parser'
import { chatGptParser } from '@/lib/ingestion/chatgpt-parser'
import { claudeParser } from '@/lib/ingestion/claude-parser'
import { pdfParser } from '@/lib/ingestion/pdf-parser'

export * from '@/lib/ingestion/types'
export * from '@/lib/ingestion/detector'
export * from '@/lib/ingestion/markdown-parser'
export * from '@/lib/ingestion/chatgpt-parser'
export * from '@/lib/ingestion/claude-parser'
export * from '@/lib/ingestion/pdf-parser'

/**
 * Unified Ingestion Entrypoint:
 * Takes raw file bytes and metadata, detects the underlying format,
 * runs the appropriate parser, and produces a structured, normalized ParsedArtifact.
 */
export async function parseArtifact(
  input: IngestionInput
): Promise<IngestionResult> {
  try {
    if (!input.buffer || input.buffer.length === 0) {
      return {
        success: false,
        error: 'Uploaded file is empty or missing content.',
        code: 'EMPTY_DOCUMENT',
      }
    }

    if (input.buffer.length > MAX_FILE_SIZE_BYTES) {
      return {
        success: false,
        error: `File size (${(input.buffer.length / (1024 * 1024)).toFixed(1)}MB) exceeds the maximum allowed size of 15MB.`,
        code: 'FILE_TOO_LARGE',
      }
    }

    const detection = detectArtifactType(input)

    if (detection.artifactType === 'unsupported') {
      return {
        success: false,
        error: `Unsupported file format for '${input.filename}'. Supported formats: Markdown (.md, .txt), PDF (.pdf), and ChatGPT/Claude conversation exports (.json).`,
        code: 'UNSUPPORTED_FILE_TYPE',
      }
    }

    switch (detection.artifactType) {
      case 'markdown':
      case 'codebase':
        return await markdownParser.parse(input)
      case 'chatgpt_export':
        return await chatGptParser.parse(input)
      case 'claude_export':
        return await claudeParser.parse(input)
      case 'pdf':
        return await pdfParser.parse(input)
      default:
        return {
          success: false,
          error: 'Unrecognized parser dispatch.',
          code: 'UNSUPPORTED_FILE_TYPE',
        }
    }
  } catch (err) {
    return {
      success: false,
      error: `Ingestion processing failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      code: 'PARSING_ERROR',
    }
  }
}
