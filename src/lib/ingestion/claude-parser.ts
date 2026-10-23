import type {
  IngestionInput,
  IngestionResult,
  ParsedArtifact,
  ArtifactParser,
  ArtifactType,
} from '@/lib/ingestion/types'

interface ClaudeMessage {
  uuid?: string
  sender?: string
  role?: string
  text?: string
  content?: string | { type?: string; text?: string }[]
  created_at?: string
}

interface ClaudeConversation {
  uuid?: string
  name?: string
  title?: string
  created_at?: string
  updated_at?: string
  chat_messages?: ClaudeMessage[]
  messages?: ClaudeMessage[]
}

function extractMessageContent(msg: ClaudeMessage): string {
  if (typeof msg.text === 'string') {
    return msg.text.trim()
  }
  if (typeof msg.content === 'string') {
    return msg.content.trim()
  }
  if (Array.isArray(msg.content)) {
    return msg.content
      .map((part) => (typeof part === 'string' ? part : part?.text || ''))
      .filter(Boolean)
      .join('\n')
      .trim()
  }
  return ''
}

export class ClaudeParser implements ArtifactParser {
  supports(detectedType: ArtifactType): boolean {
    return detectedType === 'claude_export'
  }

  async parse(input: IngestionInput): Promise<IngestionResult> {
    try {
      const buffer = Buffer.isBuffer(input.buffer)
        ? input.buffer
        : Buffer.from(input.buffer)

      if (buffer.length === 0) {
        return {
          success: false,
          error: 'The uploaded JSON file is empty.',
          code: 'EMPTY_DOCUMENT',
        }
      }

      const jsonStr = buffer.toString('utf8').trim()
      let data: unknown
      try {
        data = JSON.parse(jsonStr)
      } catch {
        return {
          success: false,
          error: 'Invalid JSON format. Could not parse file.',
          code: 'INVALID_JSON',
        }
      }

      let conversationList: ClaudeConversation[] = []
      if (Array.isArray(data)) {
        conversationList = data as ClaudeConversation[]
      } else if (typeof data === 'object' && data !== null) {
        conversationList = [data as ClaudeConversation]
      }

      if (conversationList.length === 0) {
        return {
          success: false,
          error: 'No conversation data found in Claude export.',
          code: 'INVALID_CLAUDE_EXPORT',
        }
      }

      const primaryConv = conversationList[0]
      const title =
        primaryConv.name?.trim() ||
        primaryConv.title?.trim() ||
        input.filename.replace(/\.json$/i, '').trim() ||
        'Claude Research Transcript'

      const rawMessages = primaryConv.chat_messages || primaryConv.messages || []
      const turns: { sender: string; text: string }[] = []

      for (const msg of rawMessages) {
        const sender = (msg.sender || msg.role || 'human').toLowerCase()
        const text = extractMessageContent(msg)
        if (text) {
          turns.push({ sender, text })
        }
      }

      if (turns.length === 0) {
        return {
          success: false,
          error: 'Could not extract any valid messages from Claude export.',
          code: 'INVALID_CLAUDE_EXPORT',
        }
      }

      const dateStr = primaryConv.created_at
        ? new Date(primaryConv.created_at).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]

      const sections: string[] = [
        `# Claude Conversation: ${title}`,
        `*Export Date: ${dateStr} | Turns: ${turns.length}*`,
        '\n---',
      ]

      for (const turn of turns) {
        const senderLabel =
          turn.sender === 'human' || turn.sender === 'user'
            ? '### Human'
            : turn.sender === 'assistant' || turn.sender === 'claude'
            ? '### Claude (Assistant)'
            : `### ${turn.sender.toUpperCase()}`

        sections.push(`\n${senderLabel}\n\n${turn.text}`)
      }

      const canonicalContent = sections.join('\n')
      const wordCount = canonicalContent.split(/\s+/).filter(Boolean).length
      const charCount = canonicalContent.length

      const parsed: ParsedArtifact = {
        artifactType: 'claude_export',
        title,
        canonicalContent,
        originalFilename: input.filename,
        detectedMimeType: 'application/json',
        metadata: {
          originalFilename: input.filename,
          detectedMimeType: 'application/json',
          byteSize: buffer.length,
          wordCount,
          charCount,
          turnCount: turns.length,
          sourceType: 'claude_export',
          extractedAt: new Date().toISOString(),
          title,
        },
      }

      return { success: true, data: parsed }
    } catch (err) {
      return {
        success: false,
        error: `Failed to parse Claude export: ${err instanceof Error ? err.message : 'Unknown error'}`,
        code: 'PARSING_ERROR',
      }
    }
  }
}

export const claudeParser = new ClaudeParser()
