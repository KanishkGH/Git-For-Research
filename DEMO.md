# Demo Plan

> ⚠️ **This is the planned demo flow. None of this is currently implemented.**
> This document will be updated as features are built and the demo is refined.

---

## Demo Goal

Demonstrate in ~10 minutes that Git for Research applies the core Git concepts — versioning, branching, diffing, merging, conflict detection, concurrent collaboration — to research artifacts, and adds semantic search on top.

The two must-hit moments:
1. **Live semantic diff** — human-readable, not byte-level
2. **Live merge conflict** — clear, surfaced conflict between two branches

---

## Planned Demo Flow

### Step 1 — Open Workspace
- Open the Git for Research app
- Show an existing workspace for a research project
- Briefly explain the concept: research artifacts as versioned objects

### Step 2 — Upload Research Artifacts
- Upload a Markdown research document
- Upload a PDF paper
- Upload a ChatGPT conversation export
- Show all three appear as artifacts in the workspace

### Step 3 — Show Artifacts as Versioned Objects
- Click on an artifact
- Show it has an initial commit (version 1) created at upload time
- Show the commit message, timestamp, and author

### Step 4 — Create Commits (Versioning)
- Edit the Markdown document
- Save / commit the change
- Show the new commit appears in the history

### Step 5 — Show Commit History
- Navigate the commit history for an artifact
- Show the list of commits with authors, timestamps, messages

### Step 6 — Create a Branch
- From the current commit, create a branch called `ai-tutors`
- Explain: this represents a divergent research direction

### Step 7 — Modify Research on a Branch
- On `ai-tutors` branch, edit the document
- Add a paragraph about AI tutors
- Commit the change on this branch

### Step 8 — Show Semantic Diff
- Compare the `ai-tutors` branch commit to the `main` branch commit
- **Key demo moment**: Show the semantic diff
  - Removed sentence highlighted in red
  - Added sentence highlighted in green
  - Human-readable, not a byte dump

### Step 9 — Create Another Branch (for conflict)
- Go back to `main`
- Create a second branch called `ai-accessibility`
- On this branch, modify the SAME paragraph that was modified on `ai-tutors`
- Commit

### Step 10 — Attempt Merge
- Attempt to merge `ai-tutors` into `main`

### Step 11 — Demonstrate Conflict Detection
- **Key demo moment**: Show the merge conflict
  - Both branches modified the same content
  - Conflict is surfaced clearly with conflict markers
  - Not silently resolved
- Show the conflict resolution UI

### Step 12 — Resolve and Merge
- Resolve the conflict (pick one side or combine)
- Complete the merge
- Show the resulting merged commit in history

### Step 13 — Concurrent Editing / Presence
- Open the same artifact in two browser tabs (simulating two researchers)
- Show live presence indicators: "Researcher A — editing", "Researcher B — viewing"
- Type in one tab, watch the other update in real-time
- No silent overwrites — both changes preserved

### Step 14 — Ask a Research Question
- Type a question into the research query interface
  - Example: *"What does our research say about the effectiveness of AI tutors?"*
- Show the system:
  - Retrieving relevant chunks from across artifacts
  - Considering multiple artifact types (document + PDF + conversation)
  - Considering version history

### Step 15 — Show Answer with Sources
- Show the LLM-generated answer
- Show the source citations: which artifact, which version, which section

---

## Demo Notes

- Use pre-loaded realistic research content (not Lorem Ipsum) for a convincing demo
- The merge conflict scenario requires pre-staging conflicting edits
- Two-browser concurrent editing requires two logged-in mock users (or two tabs with different mock user sessions)
- Practice the demo at least twice before presenting

---

## Demo Timing (Target)

| Section | Target Time |
|---------|------------|
| Intro + workspace | 1 min |
| Ingestion | 1.5 min |
| Versioning + history | 1.5 min |
| Branching + semantic diff | 2 min |
| Merge conflict | 2 min |
| Concurrent editing | 1 min |
| Research query | 1.5 min |
| **Total** | **~10.5 min** |
