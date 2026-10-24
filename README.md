# Git for Research

Git for Research is a research collaboration and versioning system inspired by Git. It treats research artifacts such as documents, PDFs and LLM conversations as versioned objects that can be branched, compared, merged, collaboratively edited and searched.

---

## Project Overview

Modern research is fragmented. Documents live in Google Docs, PDFs pile up in folders, ChatGPT and Claude conversations are lost, and multiple researchers silently overwrite each other's work. Git for Research applies the concepts that made software development collaboration tractable — versioning, branching, merging, conflict detection — to research artifacts.

---

## Core Features

| Feature | Description |
|---------|-------------|
| **Ingestion** | Upload Markdown, PDFs, ChatGPT exports, and Claude exports |
| **Versioning** | Discrete commits with human-readable semantic diffs |
| **Branching** | Fork research into divergent lines of inquiry |
| **Merging** | Merge branches; surface clear conflicts when they exist |
| **Concurrent Editing** | CRDT-based (Yjs) concurrent editing with live presence |
| **Retrieval** | Semantic search across all artifacts and versions |
| **Research Query** | Ask questions; get answers grounded in your research history |

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS |
| Backend | Next.js API Routes (server-side) |
| Database | PostgreSQL via Supabase |
| Semantic Search | pgvector (Supabase extension) |
| File Storage | Supabase Storage |
| Concurrency | Yjs (CRDT) |
| Embeddings | OpenAI embedding model |
| LLM | OpenAI |
| PDF Parsing | text extraction library (TBD) |

---

## Current Status

Workspaces, artifact ingestion, commit history, branching, semantic diffs, and merges have been manually tested. Collaborative editing and research search are implemented in code. Migrations 008–011 were reported applied to the Supabase project; service configuration and live multi-user verification remain open.

See [PROGRESS.md](./PROGRESS.md) for a detailed checklist of what is complete and what remains.

---

## Local Development

### Prerequisites

- Node.js v18 or higher (v24 recommended)
- npm
- A Supabase project (see Environment Variables below)
- An OpenAI API key for semantic search and grounded answers

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/KanishkGH/Git-For-Research.git
cd Git-For-Research

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and OPENAI_API_KEY

# 4. Start the development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the app.

### Database and sign-in

Run `supabase/migrations/001_identity.sql` through `011_change_awareness.sql` in order in the Supabase SQL Editor. If migrations 001–007 were already applied, run only 008–011. Migration 008 enables pgvector and version-aware research search. Migration 009 opens access to workspace members. Migration 010 enables durable Yjs updates and Supabase Realtime presence. Migration 011 tracks each researcher's last seen branch head.

For separate researcher accounts, enable email/password sign-ups in Supabase Authentication. Each researcher signs up and signs in once, then the workspace owner adds their email as an editor or viewer. In Supabase Realtime settings, disable public channel access so the private workspace presence policies in migration 010 apply. In Supabase Auth URL Configuration, set the production Site URL after deployment for confirmation links.

On each workspace page, **Index research** processes existing and new commit versions in small batches. The OpenAI key is needed for indexing and research questions. Live editing and presence use the same Supabase project; no separate Yjs server is required.

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values.

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable key (legacy variable name) | Supabase Dashboard → Project Settings → API Keys |
| `SUPABASE_SERVICE_ROLE_KEY` | Reserved for future work; currently unused | Supabase Dashboard → Project Settings → API Keys |
| `OPENAI_API_KEY` | Server-only key for embeddings and research answers | https://platform.openai.com/api-keys |
| `OPENAI_ANSWER_MODEL` | Optional answer model; defaults to `gpt-6-luna` | OpenAI model documentation |

> ⚠️ **Never commit `.env.local`.** It is in `.gitignore`. Only `.env.example` is committed.

---

## Team Development Workflow

Two developers share this repository as the source of truth.

```
Developer 1 (primary laptop)
  → implements features
  → commits and pushes to GitHub

Developer 2 (secondary laptop)
  → clones/pulls from GitHub
  → continues development
```

### Branching Convention

- `main` — stable, working state
- `dev/feature-name` — active feature branches

### Portability Rules

- No machine-specific secrets in any committed file
- All configuration via environment variables
- `node_modules/`, `.next/`, and `.env.local` are in `.gitignore` and are never committed
