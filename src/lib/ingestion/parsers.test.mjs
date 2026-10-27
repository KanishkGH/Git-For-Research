import assert from 'node:assert/strict'
import test from 'node:test'
import { markdownParser } from './markdown-parser.ts'
import { chatGptParser } from './chatgpt-parser.ts'
import { claudeParser } from './claude-parser.ts'

test('Markdown import normalizes text and finds the title', async () => {
  const result = await markdownParser.parse({
    filename: 'notes.md',
    buffer: Buffer.from('# Field notes\r\n\r\nA useful observation.\r\n'),
  })
  assert.equal(result.success, true)
  assert.equal(result.data.title, 'Field notes')
  assert.equal(result.data.canonicalContent, '# Field notes\n\nA useful observation.')
})

test('ChatGPT export follows the selected conversation path', async () => {
  const exportData = {
    title: 'Research chat',
    mapping: {
      root: { id: 'root', parent: null, message: null },
      user: { id: 'user', parent: 'root', message: { author: { role: 'user' }, content: { parts: ['What did we find?'] } } },
      answer: { id: 'answer', parent: 'user', message: { author: { role: 'assistant' }, content: { parts: ['Evidence supports the result.'] } } },
    },
    current_node: 'answer',
  }
  const result = await chatGptParser.parse({ filename: 'chat.json', buffer: Buffer.from(JSON.stringify(exportData)) })
  assert.equal(result.success, true)
  assert.equal(result.data.metadata.turnCount, 2)
  assert.match(result.data.canonicalContent, /What did we find\?[\s\S]*Evidence supports the result\./)
})

test('Claude export turns messages into a readable transcript', async () => {
  const exportData = { name: 'Literature review', chat_messages: [
    { sender: 'human', text: 'Summarize this paper.' },
    { sender: 'assistant', text: 'The paper studies collaboration.' },
  ] }
  const result = await claudeParser.parse({ filename: 'claude.json', buffer: Buffer.from(JSON.stringify(exportData)) })
  assert.equal(result.success, true)
  assert.equal(result.data.metadata.turnCount, 2)
  assert.match(result.data.canonicalContent, /### Human[\s\S]*### Claude \(Assistant\)/)
})
