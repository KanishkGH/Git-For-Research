/**
 * Semantic Diffing and 3-Way Merge Utilities for Research Artifacts.
 * Implements:
 * 1. Line and paragraph LCS diffing
 * 2. Diff3 chunk-aligned 3-Way merge algorithm with conflict marker injection
 * 3. Lowest Common Ancestor (LCA) traversal
 */

import type { CommitRow } from '@/types/database'

export type DiffType = 'unchanged' | 'addition' | 'deletion' | 'modification'

export interface DiffChunk {
  type: DiffType
  content: string
  originalContent?: string
  modifiedContent?: string
  lineStart?: number
  lineEnd?: number
}

export interface MergeConflict {
  id: string
  index: number
  baseContent: string
  targetContent: string
  sourceContent: string
  resolvedContent: string | null
  startLine: number
  endLine: number
}

export interface ThreeWayMergeResult {
  hasConflicts: boolean
  mergedContent: string
  conflicts: MergeConflict[]
  diffAgainstBase: {
    targetDiff: DiffChunk[]
    sourceDiff: DiffChunk[]
  }
  diffTargetVsSource: DiffChunk[]
}

export interface ChangeHunk {
  baseStart: number // 0-indexed start in base
  baseEnd: number   // 0-indexed exclusive end in base
  lines: string[]   // replacement lines
}

/**
 * Standard conflict marker patterns used to identify unresolved conflicts.
 */
export const CONFLICT_MARKERS = {
  START: '<<<<<<< TARGET (Current Branch)',
  DIVIDER: '=======',
  END: '>>>>>>> SOURCE (Incoming Branch)',
}

/**
 * Checks if a given text contains unresolved conflict markers.
 */
export function hasUnresolvedConflictMarkers(content: string): boolean {
  return (
    content.includes('<<<<<<<') ||
    content.includes('=======') ||
    content.includes('>>>>>>>')
  )
}

/**
 * Compute Longest Common Subsequence (LCS) matrix between two token arrays.
 */
function computeLCS(tokensA: string[], tokensB: string[]): number[][] {
  const m = tokensA.length
  const n = tokensB.length
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  )

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (tokensA[i - 1] === tokensB[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  return dp
}

/**
 * Extracts line-level change hunks between base and a modified text using LCS.
 */
export function extractChangeHunks(
  baseLines: string[],
  modLines: string[]
): ChangeHunk[] {
  const dp = computeLCS(baseLines, modLines)
  const matches: { bIdx: number; mIdx: number }[] = []

  let i = baseLines.length
  let j = modLines.length

  while (i > 0 && j > 0) {
    if (baseLines[i - 1] === modLines[j - 1]) {
      matches.unshift({ bIdx: i - 1, mIdx: j - 1 })
      i--
      j--
    } else if (dp[i][j - 1] >= dp[i - 1][j]) {
      j--
    } else {
      i--
    }
  }

  const hunks: ChangeHunk[] = []
  let lastB = 0
  let lastM = 0

  for (const match of matches) {
    if (match.bIdx > lastB || match.mIdx > lastM) {
      hunks.push({
        baseStart: lastB,
        baseEnd: match.bIdx,
        lines: modLines.slice(lastM, match.mIdx),
      })
    }
    lastB = match.bIdx + 1
    lastM = match.mIdx + 1
  }

  // Trailing hunk after last match
  if (lastB <= baseLines.length && (lastB < baseLines.length || lastM < modLines.length)) {
    hunks.push({
      baseStart: lastB,
      baseEnd: baseLines.length,
      lines: modLines.slice(lastM, modLines.length),
    })
  }

  return hunks
}

/**
 * Computes a semantic diff between an original text and a modified text.
 * Operates primarily at line/paragraph level for readable document diffing.
 */
export function computeSemanticDiff(
  originalText: string,
  modifiedText: string
): DiffChunk[] {
  const linesA = originalText ? originalText.split('\n') : []
  const linesB = modifiedText ? modifiedText.split('\n') : []

  const dp = computeLCS(linesA, linesB)
  const chunks: DiffChunk[] = []

  let i = linesA.length
  let j = linesB.length

  const rawDiff: { type: DiffType; content: string }[] = []

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && linesA[i - 1] === linesB[j - 1]) {
      rawDiff.unshift({ type: 'unchanged', content: linesA[i - 1] })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rawDiff.unshift({ type: 'addition', content: linesB[j - 1] })
      j--
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      rawDiff.unshift({ type: 'deletion', content: linesA[i - 1] })
      i--
    }
  }

  // Coalesce contiguous diff operations into semantic chunks
  let currentChunk: DiffChunk | null = null

  for (const item of rawDiff) {
    if (!currentChunk) {
      currentChunk = {
        type: item.type,
        content: item.content,
      }
    } else if (currentChunk.type === item.type) {
      currentChunk.content += '\n' + item.content
    } else {
      chunks.push(currentChunk)
      currentChunk = {
        type: item.type,
        content: item.content,
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk)
  }

  return chunks
}

/**
 * Performs a robust diff3 3-way merge between base, target, and source texts.
 */
export function performThreeWayMerge(
  baseText: string,
  targetText: string,
  sourceText: string
): ThreeWayMergeResult {
  // Shortcut: If source and target are identical, clean merge immediately
  if (sourceText === targetText) {
    return {
      hasConflicts: false,
      mergedContent: targetText,
      conflicts: [],
      diffAgainstBase: {
        targetDiff: computeSemanticDiff(baseText, targetText),
        sourceDiff: computeSemanticDiff(baseText, sourceText),
      },
      diffTargetVsSource: computeSemanticDiff(targetText, sourceText),
    }
  }

  // Shortcut: If source unchanged from base, take target
  if (sourceText === baseText) {
    return {
      hasConflicts: false,
      mergedContent: targetText,
      conflicts: [],
      diffAgainstBase: {
        targetDiff: computeSemanticDiff(baseText, targetText),
        sourceDiff: computeSemanticDiff(baseText, sourceText),
      },
      diffTargetVsSource: computeSemanticDiff(targetText, sourceText),
    }
  }

  // Shortcut: If target unchanged from base, take source
  if (targetText === baseText) {
    return {
      hasConflicts: false,
      mergedContent: sourceText,
      conflicts: [],
      diffAgainstBase: {
        targetDiff: computeSemanticDiff(baseText, targetText),
        sourceDiff: computeSemanticDiff(baseText, sourceText),
      },
      diffTargetVsSource: computeSemanticDiff(targetText, sourceText),
    }
  }

  const baseLines = baseText.length > 0 ? baseText.split('\n') : []
  const targetLines = targetText.length > 0 ? targetText.split('\n') : []
  const sourceLines = sourceText.length > 0 ? sourceText.split('\n') : []

  const targetHunks = extractChangeHunks(baseLines, targetLines)
  const sourceHunks = extractChangeHunks(baseLines, sourceLines)

  const targetDiff = computeSemanticDiff(baseText, targetText)
  const sourceDiff = computeSemanticDiff(baseText, sourceText)
  const diffTargetVsSource = computeSemanticDiff(targetText, sourceText)

  const conflicts: MergeConflict[] = []
  const mergedLines: string[] = []

  let basePos = 0
  let tHunkIdx = 0
  let sHunkIdx = 0
  let conflictCounter = 0

  while (basePos <= baseLines.length) {
    const tHunk = tHunkIdx < targetHunks.length ? targetHunks[tHunkIdx] : null
    const sHunk = sHunkIdx < sourceHunks.length ? sourceHunks[sHunkIdx] : null

    // Find the next active change point
    const nextTStart = tHunk ? tHunk.baseStart : Infinity
    const nextSStart = sHunk ? sHunk.baseStart : Infinity
    const nextActionPos = Math.min(nextTStart, nextSStart, baseLines.length)

    // Output unchanged base lines up to the next change point
    while (basePos < nextActionPos) {
      mergedLines.push(baseLines[basePos])
      basePos++
    }

    if (basePos >= baseLines.length && !tHunk && !sHunk) {
      break
    }

    const tIsActive = tHunk && tHunk.baseStart <= basePos
    const sIsActive = sHunk && sHunk.baseStart <= basePos

    if (tIsActive && sIsActive) {
      // Both target and source modified this overlapping region
      const overlapStart = Math.min(tHunk.baseStart, sHunk.baseStart)
      const overlapEnd = Math.max(tHunk.baseEnd, sHunk.baseEnd)

      // Collect all hunks within this overlapping window
      const tOverlapLines = [...tHunk.lines]
      const sOverlapLines = [...sHunk.lines]
      tHunkIdx++
      sHunkIdx++

      // Check if both sides made the exact same change
      const targetStr = tOverlapLines.join('\n')
      const sourceStr = sOverlapLines.join('\n')
      const baseStr = baseLines.slice(overlapStart, overlapEnd).join('\n')

      if (targetStr === sourceStr) {
        // Clean identical changes
        mergedLines.push(...tOverlapLines)
      } else {
        // Conflicting change
        conflictCounter++
        const startLine = mergedLines.length + 1

        const conflict: MergeConflict = {
          id: `conflict-${conflictCounter}`,
          index: conflictCounter,
          baseContent: baseStr,
          targetContent: targetStr,
          sourceContent: sourceStr,
          resolvedContent: null,
          startLine,
          endLine: startLine + tOverlapLines.length + sOverlapLines.length + 3,
        }

        conflicts.push(conflict)

        // Inject conflict markers
        mergedLines.push(CONFLICT_MARKERS.START)
        if (targetStr) mergedLines.push(targetStr)
        mergedLines.push(CONFLICT_MARKERS.DIVIDER)
        if (sourceStr) mergedLines.push(sourceStr)
        mergedLines.push(CONFLICT_MARKERS.END)
      }

      basePos = Math.max(basePos, overlapEnd)
    } else if (tIsActive && !sIsActive) {
      // Only Target changed here -> Take Target
      mergedLines.push(...tHunk.lines)
      basePos = Math.max(basePos, tHunk.baseEnd)
      tHunkIdx++
    } else if (!tIsActive && sIsActive) {
      // Only Source changed here -> Take Source
      mergedLines.push(...sHunk.lines)
      basePos = Math.max(basePos, sHunk.baseEnd)
      sHunkIdx++
    } else {
      basePos++
    }
  }

  const mergedContent = mergedLines.join('\n')

  return {
    hasConflicts: conflicts.length > 0,
    mergedContent,
    conflicts,
    diffAgainstBase: {
      targetDiff,
      sourceDiff,
    },
    diffTargetVsSource,
  }
}

/**
 * Locates the Lowest Common Ancestor (LCA) commit between two branches.
 * Given arrays of commits (from getCommitHistory), finds the intersection.
 */
export function findLowestCommonAncestor(
  targetHistory: CommitRow[],
  sourceHistory: CommitRow[]
): CommitRow | null {
  if (targetHistory.length === 0 || sourceHistory.length === 0) {
    return null
  }

  // If both HEADs are the exact same commit
  if (targetHistory[0].id === sourceHistory[0].id) {
    return targetHistory[0]
  }

  const targetCommitIds = new Set(targetHistory.map((c) => c.id))
  // Also recognize merge_parent_id from any merge commits in target's history
  for (const commit of targetHistory) {
    if (commit.merge_parent_id) {
      targetCommitIds.add(commit.merge_parent_id)
    }
  }

  // Walk source history to find the first commit present in target's ancestry
  for (const sourceCommit of sourceHistory) {
    if (targetCommitIds.has(sourceCommit.id)) {
      return sourceCommit
    }
  }

  // Fallback to the root commit of target history if no common ancestor detected
  return targetHistory[targetHistory.length - 1] || null
}
