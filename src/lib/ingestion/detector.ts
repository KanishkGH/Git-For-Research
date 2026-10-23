import type { ArtifactType, IngestionInput } from '@/lib/ingestion/types'

export type DetectedType = ArtifactType | 'unsupported'

export interface DetectionResult {
  artifactType: DetectedType
  confidence: 'high' | 'medium' | 'low'
  mimeType: string
}

export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024 // 15MB

/**
 * Heuristically inspects a JSON structure to detect whether it is a ChatGPT or Claude export.
 */
function detectJsonSchema(contentStr: string): 'chatgpt_export' | 'claude_export' | 'unsupported' {
  try {
    const data = JSON.parse(contentStr)

    // 1. Check for ChatGPT Export structures
    if (Array.isArray(data)) {
      if (data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
        const first = data[0] as Record<string, unknown>
        if ('mapping' in first || ('title' in first && 'create_time' in first)) {
          return 'chatgpt_export'
        }
        if ('chat_messages' in first || ('uuid' in first && 'name' in first)) {
          return 'claude_export'
        }
      }
    } else if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>
      if ('mapping' in obj || ('title' in obj && ('create_time' in obj || 'mapping' in obj))) {
        return 'chatgpt_export'
      }
      if ('chat_messages' in obj || ('name' in obj && 'messages' in obj)) {
        return 'claude_export'
      }
    }

    return 'unsupported'
  } catch {
    return 'unsupported'
  }
}

/**
 * Detects the artifact type based on filename extension, MIME type, and content inspection.
 */
export function detectArtifactType(input: IngestionInput): DetectionResult {
  const filename = input.filename.toLowerCase()
  const buffer = input.buffer

  // 1. PDF detection
  if (filename.endsWith('.pdf')) {
    return {
      artifactType: 'pdf',
      confidence: 'high',
      mimeType: 'application/pdf',
    }
  }

  // 2. Markdown & Plaintext
  if (
    filename.endsWith('.md') ||
    filename.endsWith('.markdown') ||
    filename.endsWith('.mdown')
  ) {
    return {
      artifactType: 'markdown',
      confidence: 'high',
      mimeType: 'text/markdown',
    }
  }

  if (filename.endsWith('.txt')) {
    return {
      artifactType: 'markdown',
      confidence: 'high',
      mimeType: 'text/plain',
    }
  }

  // 3. JSON Export detection (ChatGPT vs Claude vs unsupported)
  if (filename.endsWith('.json')) {
    const textSnippet = buffer.toString('utf8', 0, Math.min(buffer.length, 100000))
    const detectedJson = detectJsonSchema(textSnippet)
    if (detectedJson !== 'unsupported') {
      return {
        artifactType: detectedJson,
        confidence: 'high',
        mimeType: 'application/json',
      }
    }

    return {
      artifactType: 'unsupported',
      confidence: 'low',
      mimeType: 'application/json',
    }
  }

  // 4. Codebase script extensions
  const codeExtensions = [
    '.py',
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.rs',
    '.go',
    '.cpp',
    '.c',
    '.h',
    '.java',
    '.r',
    '.sql',
    '.sh',
    '.yaml',
    '.yml',
  ]
  if (codeExtensions.some((ext) => filename.endsWith(ext))) {
    return {
      artifactType: 'codebase',
      confidence: 'high',
      mimeType: 'text/plain',
    }
  }

  return {
    artifactType: 'unsupported',
    confidence: 'low',
    mimeType: input.mimeType || 'application/octet-stream',
  }
}
