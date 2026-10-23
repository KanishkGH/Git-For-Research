import type { ArtifactType } from '@/types/database'

export type { ArtifactType }

export interface IngestionInput {
  buffer: Buffer | Uint8Array
  filename: string
  mimeType?: string
  size?: number
}

export interface IngestionMetadata {
  originalFilename: string
  detectedMimeType: string
  byteSize: number
  wordCount: number
  charCount: number
  pageCount?: number
  turnCount?: number
  sourceType: ArtifactType
  extractedAt: string
  title?: string
  extra?: Record<string, unknown>
}

export interface ParsedArtifact {
  artifactType: ArtifactType
  title: string
  canonicalContent: string
  metadata: IngestionMetadata
  originalFilename: string
  detectedMimeType: string
}

export type IngestionErrorCode =
  | 'UNSUPPORTED_FILE_TYPE'
  | 'FILE_TOO_LARGE'
  | 'EMPTY_DOCUMENT'
  | 'INVALID_JSON'
  | 'INVALID_CHATGPT_EXPORT'
  | 'INVALID_CLAUDE_EXPORT'
  | 'PDF_EXTRACTION_FAILED'
  | 'PDF_NO_TEXT'
  | 'INVALID_ENCODING'
  | 'PARSING_ERROR'

export type IngestionResult =
  | { success: true; data: ParsedArtifact }
  | { success: false; error: string; code: IngestionErrorCode }

export interface ArtifactParser {
  supports(detectedType: ArtifactType): boolean
  parse(input: IngestionInput): Promise<IngestionResult>
}
