import assert from 'node:assert/strict'
import test from 'node:test'
import { chunkContent } from './chunk-content.ts'

test('empty and whitespace commits have no searchable chunks', () => {
  assert.deepEqual(chunkContent(''), [])
  assert.deepEqual(chunkContent(' \n\t '), [])
})

test('chunks retain exact source ranges for citations', () => {
  const source = Array.from({ length: 35 }, (_, index) =>
    `Paragraph ${index}: ${'research evidence '.repeat(7)}`
  ).join('\n\n')
  const chunks = chunkContent(source)

  assert.ok(chunks.length > 1)
  for (const [index, chunk] of chunks.entries()) {
    assert.equal(chunk.index, index)
    assert.equal(source.slice(chunk.startOffset, chunk.endOffset), chunk.content)
    assert.ok(chunk.content.length <= 1200)
    if (index > 0) assert.ok(chunk.startOffset < chunks[index - 1].endOffset)
  }
  assert.equal(chunks.at(-1).endOffset, source.trimEnd().length)
})
