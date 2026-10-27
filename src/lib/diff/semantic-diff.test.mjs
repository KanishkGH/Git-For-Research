import assert from 'node:assert/strict'
import test from 'node:test'
import {
  computeSemanticDiff,
  performThreeWayMerge,
  hasUnresolvedConflictMarkers,
} from './semantic-diff.ts'

test('diff shows a changed research finding', () => {
  const chunks = computeSemanticDiff('Finding A\nFinding B', 'Finding A\nFinding C')
  assert.deepEqual(chunks.map(({ type }) => type), ['unchanged', 'deletion', 'addition'])
})

test('merge combines edits to separate paragraphs', () => {
  const result = performThreeWayMerge('A\nB\nC', 'A revised\nB\nC', 'A\nB\nC revised')
  assert.equal(result.hasConflicts, false)
  assert.equal(result.mergedContent, 'A revised\nB\nC revised')
})

test('merge exposes conflicting edits to the same paragraph', () => {
  const result = performThreeWayMerge('A\nB\nC', 'A\nB target\nC', 'A\nB source\nC')
  assert.equal(result.hasConflicts, true)
  assert.equal(result.conflicts.length, 1)
  assert.equal(hasUnresolvedConflictMarkers(result.mergedContent), true)
  assert.equal(result.conflicts[0].baseContent, 'B')
})
