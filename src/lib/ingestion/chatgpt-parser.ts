import type {
  IngestionInput,
  IngestionResult,
  ParsedArtifact,
  ArtifactParser,
  ArtifactType,
} from '@/lib/ingestion/types'

interface ChatGptMessage {
  id?: string
  author?: {
    role?: string
    name?: string
  }
  create_time?: number | null
  content?: {
    content_type?: string
    parts?: unknown[]
    text?: string
  }
  status?: string
}

interface ChatGptNode {
  id?: string
  message?: ChatGptMessage | null
  parent?: string | null
  children?: string[]
}

interface ChatGptConversation {
  title?: string
  create_time?: number | null
  update_time?: number | null
  mapping?: Record<string, ChatGptNode>
  current_node?: string | null
}

/**
 * Extracts linear message sequence from a ChatGPT mapping tree.
 */
function extractLinearTurns(conversation: ChatGptConversation): { role: string; text: string }[] {
  const mapping = conversation.mapping
  if (!mapping || typeof mapping !== 'object') {
    return []
  }

  const turns: { role: string; text: string }[] = []
  const visited = new Set<string>()

  // Strategy A: If current_node is provided, traverse backwards along parent chain
  if (conversation.current_node && mapping[conversation.current_node]) {
    let currId: string | null = conversation.current_node
    const backwardsNodes: ChatGptNode[] = []

    while (currId && mapping[currId] && !visited.has(currId)) {
      visited.add(currId)
      const currentNode: ChatGptNode = mapping[currId]
      backwardsNodes.push(currentNode)
      currId = currentNode.parent || null
    }

    const chronologicalNodes = backwardsNodes.reverse()
    for (const node of chronologicalNodes) {
      const msg = node.message
      if (!msg || !msg.author?.role) continue

      const role = msg.author.role.toLowerCase()
      // Skip empty system messages
      if (role === 'system') continue

      let messageText = ''
      if (Array.isArray(msg.content?.parts)) {
        messageText = msg.content.parts
          .map((part) => (typeof part === 'string' ? part : typeof part === 'object' && part !== null ? JSON.stringify(part) : ''))
          .filter(Boolean)
          .join('\n')
      } else if (typeof msg.content?.text === 'string') {
        messageText = msg.content.text
      }

      if (messageText.trim()) {
        turns.push({ role, text: messageText.trim() })
      }
    }

    if (turns.length > 0) return turns
  }

  // Strategy B: Forward traversal from root (parent === null)
  visited.clear()
  const rootNode = Object.values(mapping).find((n) => !n.parent)
  let forwardNode: ChatGptNode | undefined = rootNode

  while (forwardNode && forwardNode.id && !visited.has(forwardNode.id)) {
    visited.add(forwardNode.id)
    const msg = forwardNode.message
    if (msg && msg.author?.role && msg.author.role.toLowerCase() !== 'system') {
      let text = ''
      if (Array.isArray(msg.content?.parts)) {
        text = msg.content.parts
          .map((p) => (typeof p === 'string' ? p : ''))
          .filter(Boolean)
          .join('\n')
      } else if (typeof msg.content?.text === 'string') {
        text = msg.content.text
      }
      if (text.trim()) {
        turns.push({ role: msg.author.role.toLowerCase(), text: text.trim() })
      }
    }

    const nextId: string | undefined = forwardNode.children?.[0]
    forwardNode = nextId ? mapping[nextId] : undefined
  }

  return turns
}

export class ChatGptParser implements ArtifactParser {
  supports(detectedType: ArtifactType): boolean {
    return detectedType === 'chatgpt_export'
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

      // Handle either single conversation or array of conversations
      let conversationList: ChatGptConversation[] = []
      if (Array.isArray(data)) {
        conversationList = data as ChatGptConversation[]
      } else if (typeof data === 'object' && data !== null) {
        conversationList = [data as ChatGptConversation]
      }

      if (conversationList.length === 0) {
        return {
          success: false,
          error: 'No conversation data found in export.',
          code: 'INVALID_CHATGPT_EXPORT',
        }
      }

      // We parse the primary conversation (or coalesce multiple)
      const primaryConv = conversationList[0]
      const title =
        primaryConv.title?.trim() ||
        input.filename.replace(/\.json$/i, '').trim() ||
        'ChatGPT Research Transcript'

      const turns = extractLinearTurns(primaryConv)

      if (turns.length === 0) {
        return {
          success: false,
          error: 'Could not extract any conversation messages from ChatGPT export.',
          code: 'INVALID_CHATGPT_EXPORT',
        }
      }

      // Build canonical Markdown transcript
      const dateStr = primaryConv.create_time
        ? new Date(primaryConv.create_time * 1000).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0]

      const sections: string[] = [
        `# ChatGPT Conversation: ${title}`,
        `*Export Date: ${dateStr} | Turns: ${turns.length}*`,
        '\n---',
      ]

      for (const turn of turns) {
        const roleLabel =
          turn.role === 'user'
            ? '### User'
            : turn.role === 'assistant'
            ? '### ChatGPT (Assistant)'
            : `### ${turn.role.toUpperCase()}`

        sections.push(`\n${roleLabel}\n\n${turn.text}`)
      }

      const canonicalContent = sections.join('\n')
      const wordCount = canonicalContent.split(/\s+/).filter(Boolean).length
      const charCount = canonicalContent.length

      const parsed: ParsedArtifact = {
        artifactType: 'chatgpt_export',
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
          sourceType: 'chatgpt_export',
          extractedAt: new Date().toISOString(),
          title,
        },
      }

      return { success: true, data: parsed }
    } catch (err) {
      return {
        success: false,
        error: `Failed to parse ChatGPT export: ${err instanceof Error ? err.message : 'Unknown error'}`,
        code: 'PARSING_ERROR',
      }
    }
  }
}

export const chatGptParser = new ChatGptParser()
