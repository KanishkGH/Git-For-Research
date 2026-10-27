# Architecture

This document describes the **current code**, not an initial design proposal. Git for Research is a Next.js app with server actions for writes, Supabase PostgreSQL for records, Supabase Auth for identity, Supabase Realtime for presence and update notifications, Yjs for shared text, and OpenAI for embeddings and grounded answers.

## Main components

| Component | Responsibility | Code |
| --- | --- | --- |
| Next.js App Router | Pages, Google sign-in callback, server actions, route rendering | `src/app/` |
| Supabase access layer | Typed reads and writes using the signed-in user's session | `src/lib/db/`, `src/lib/supabase/` |
| Ingestion | Detect format, extract readable text, normalize metadata | `src/lib/ingestion/` |
| Versioning | SHA-256 commit snapshots, branch heads, semantic diff, three-way merge | `src/lib/db/commits.ts`, `src/lib/diff/semantic-diff.ts`, `src/app/actions/merge.ts` |
| Collaboration | Durable Yjs updates and live editor state | `src/lib/collaboration/`, `src/app/actions/collaboration.ts` |
| Retrieval | Chunk commit content, embed chunks, pgvector search, answer from retrieved excerpts | `src/lib/retrieval/`, `src/app/actions/research.ts` |
| Database rules | Schema, row-level security, Realtime policies, search function | `supabase/migrations/001_identity.sql` through `012_workspace_owner_read.sql` |

## Data model

- A **workspace** has an owner and may have editor or viewer members.
- An **artifact** identifies a research item inside a workspace. Its type may be a document, PDF, conversation export, or code file.
- A **commit** stores a full text snapshot, author, message, hash, and parent commit ID. A merge commit can also have a second parent.
- A **branch** points to a current head commit. Different branches can point into shared history.
- A **merge record** tracks an attempted merge and its resolution.
- **Collaboration updates** hold encoded Yjs operations for a branch. The first editor seeds the Yjs document from the branch's current head commit.
- **Commit chunks** hold source offsets, embedding vectors, and the commit ID needed for citations.
- **Artifact views** remember the branch head last seen by each user for change awareness.

## Main flows

### Import and versioning

The upload action checks workspace editor access and the 3 MB limit, detects the file format, extracts canonical text, creates an artifact, attempts to store the original file, creates an initial commit, and points a new `main` branch at it. The original-file upload is best effort; the commit text is the durable versioned representation. Later saves create a new commit and advance the branch head with a compare-and-swap check to reject a stale head.

### Branch, diff, and merge

A branch starts at a selected commit. The diff uses longest common subsequence over lines, producing readable additions and deletions. Merge preparation traverses each branch's parent history, finds a shared ancestor, and compares both branch texts to that base. Conflicting edits are surfaced in the resolver; completing the merge writes a commit with target and source parents and advances the target head. The app then attempts to copy merged text into the target branch's live Yjs draft.

This is a text merge, not semantic understanding by an LLM. The history reader currently returns at most 50 parent commits, so long histories require further work before ancestry is fully reliable.

### Live editing and change awareness

The browser loads stored Yjs updates for a branch and subscribes to inserted updates through Supabase Realtime. Local edits are merged and written to `collaboration_updates`; private Realtime presence shows active researchers. A commit is an explicit snapshot of the live text. Returning to a branch compares its present head with the head saved in `artifact_views`.

### Research search

An editor clicks **Index research** on a workspace. The server processes unindexed commits in small batches, chunks text, requests `text-embedding-3-small` vectors, and stores the chunks in PostgreSQL with pgvector. A question is embedded and matched to chunks in the same workspace. The answer request sends those excerpts to an OpenAI model with instructions to cite numbered sources. Source links open the corresponding artifact and commit. Indexing and answers require `OPENAI_API_KEY`.

## Access and deployment

Google OAuth runs through Supabase Auth. Server components and actions use the user's cookie-backed Supabase client. Row-level security allows members to read their workspace, editors to write research content, and owners to manage members. The service-role key is unused. Deployments need the same environment variables, applied migrations, Google callback settings, and private Realtime configuration described in [README.md](./README.md).

## Verification boundaries

Local lint, tests, and the production build verify code structure and selected pure functions. They cannot prove that the deployed OAuth provider, database migrations, Storage bucket, private Realtime channels, and OpenAI account are configured. Follow [DEMO.md](./DEMO.md) for the live checks.
