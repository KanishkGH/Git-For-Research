# Architecture

> **Status:** Initial architecture document. Many implementation details remain TBD and will be decided per phase.

---

## 1. Project Goal

Git for Research applies the core concepts of Git — versioning, branching, diffing, merging, conflict detection — to research artifacts instead of source code.

Research artifacts (Markdown documents, PDFs, LLM conversation exports) become first-class versioned objects. Multiple researchers can collaborate, fork research directions into branches, detect and resolve conflicts, and query their entire research history semantically.

The system is designed for a hackathon (13 hours) and therefore prioritizes the core versioning engine above all else.

---

## 2. Core Requirements (Four Pillars)

### Ingestion (15% of judging)
- Markdown / plaintext documents
- PDFs (text-extractable; production OCR not required)
- ChatGPT conversation exports
- Claude conversation exports (separate parser — schemas differ)
- All artifact types normalized into a common internal representation

### Versioning (35% of judging — highest weighted)
- Discrete commits with full history
- Human-readable semantic diff (sentence/paragraph level, not byte-level)
- Branching: divergent lines of research history
- Merge: converging branches back together
- Conflict detection: clear, visible conflicts when branches modify overlapping content incompatibly
- The judges specifically want to see a live semantic diff and a live merge conflict

### Concurrent Context (20% of judging)
- Multiple users editing the same artifact simultaneously
- CRDT-based concurrency (Yjs) — no silent overwrites
- Live presence indicators (who is viewing / editing)
- Change awareness: "what changed since I last looked?"

### Retrieval / Query (15% of judging)
- Semantic similarity search across all artifacts and versions
- Cross-artifact retrieval
- Version-aware retrieval
- LLM-powered research query: user asks a question, system retrieves relevant chunks and generates a grounded answer with source citations

---

## 3. Initial Technology Stack

### Frontend
- **Next.js 15** — framework (App Router)
- **React 19** — UI library
- **TypeScript** — type safety
- **Tailwind CSS** — utility-first styling

### Backend
- **Next.js API Routes** — server-side logic and API endpoints

### Database
- **PostgreSQL** — via Supabase (cloud-hosted)
- **pgvector** — Supabase extension for semantic vector search

### Storage
- **Supabase Storage** — blob storage for raw artifact files (PDFs, exports)

### Concurrency
- **Yjs** — CRDT library for concurrent editing
- **WebSocket server** — Yjs synchronization transport (deployment TBD)

### AI
- **Embeddings** — OpenAI embedding model (specific model TBD)
- **LLM** — OpenAI (specific model TBD)

### Parsing
- **PDF** — text extraction library (TBD)
- **ChatGPT exports** — custom parser (JSON format)
- **Claude exports** — custom parser (separate JSON format; schemas differ from ChatGPT)

---

## 4. Core Domain Concepts

> These are conceptual definitions only. Final database schema is TBD.

### Workspace
A top-level container for a research project. All artifacts, commits, and branches belong to a workspace.

### Artifact
A research object — the "what". Represents a document, PDF, or conversation export at an abstract level. An artifact has identity independent of its content at any given point.

### Commit (Version)
A discrete snapshot of an artifact's content at a specific point in time. Contains:
- content or content reference
- content hash
- author
- timestamp
- commit message
- parent commit reference
- branch reference

### Branch
A divergent line of research history. A branch points to a head commit. Branches share history until they diverge.

### Diff
A human-readable comparison between two commits of the same artifact. Operates at the semantic (sentence/paragraph) level, not byte level. Surfaces additions, deletions, and modifications.

### Merge
The act of converging two divergent branches back together. Results in either a clean merge commit or a conflict state.

### Conflict
A state where two branches have modified overlapping content in incompatible ways. Conflicts must be surfaced clearly and explicitly — never silently resolved.

### Chunk
A subdivision of an artifact's content for retrieval purposes. Artifacts are split into chunks for embedding and semantic search.

### Embedding
A vector representation of a chunk's content, used for semantic similarity search.

### User (Mock)
A mock researcher identity. Full production authentication is out of scope for the hackathon.

### Presence
A real-time record of which users are currently viewing or editing which artifacts.

---

## 5. Major Pipelines

### Ingestion Pipeline
```
Upload
  → Detect artifact type (Markdown / PDF / ChatGPT / Claude)
  → Parse (type-specific parser)
  → Normalize to common Artifact representation
  → Store Artifact
  → Create initial Commit (version 1)
  → Chunk content
  → Generate embeddings
  → Store in pgvector
```

### Versioning Pipeline
```
Edit / Update Artifact
  → Create new Commit (parent = previous head)
  → Compute semantic diff (vs parent)
  → Update branch head pointer
```

### Branch Pipeline
```
Create Branch from Commit
  → New Branch record pointing to that Commit
  → Subsequent commits on branch build on that head
```

### Merge Pipeline
```
Merge Branch A into Branch B
  → Find common ancestor commit
  → Compute changes in each branch since ancestor
  → Attempt three-way merge at paragraph/sentence level
  → If clean: create merge commit
  → If conflict: surface conflict markers, require resolution
```

### Retrieval Pipeline
```
User Question
  → Generate question embedding
  → pgvector similarity search
  → Retrieve top-N relevant chunks (with artifact/version metadata)
  → Construct LLM prompt with retrieved context
  → LLM generates grounded answer
  → Return answer + source citations
```

### Concurrency Pipeline
```
User opens Artifact for editing
  → Connect to Yjs WebSocket server
  → Document state synchronized via CRDT
  → Presence updated (user visible to others)
  → On disconnect: presence removed
  → All changes conflict-free (CRDT handles it)
  → Periodically or on explicit save: create Commit
```

---

## 6. UI Direction

**Theme:** Deep Indigo + Cobalt

> UI polish is intentionally secondary to core functionality.
> The UI should be functional and research-oriented, not visually elaborate.

### Color Palette

| Role | Color | Hex |
|------|-------|-----|
| Primary action (Commit, Merge, New Branch) | Indigo 600 | `#4F46E5` |
| Secondary / links | Blue 600 | `#2563EB` |
| Success / additions / positive | Teal 600 | `#0D9488` |
| Danger / removals / conflicts | Rose 600 | `#E11D48` |
| Background | Slate 50 | `#F8FAFC` |
| Borders | — | `#E2E8F0` |

---

## 7. Architecture Decisions Pending

The following decisions have NOT been finalized and will be made per phase:

| Decision | Status |
|----------|--------|
| Exact database schema | TBD — Phase 1 |
| Commit content storage strategy (full content vs. delta) | TBD |
| Semantic diff algorithm (library / approach) | TBD |
| Merge algorithm (library / custom) | TBD |
| Yjs WebSocket server deployment (self-hosted Render / PartyKit / Liveblocks) | TBD |
| Exact OpenAI embedding model | TBD |
| Exact OpenAI LLM model | TBD |
| PDF parsing library | TBD |
| ChatGPT export JSON schema handling | TBD — requires real export samples |
| Claude export JSON schema handling | TBD — requires real export samples, separate from ChatGPT |
| Chunking strategy (chunk size, overlap) | TBD |
| Search ranking approach | TBD |
