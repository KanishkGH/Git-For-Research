# Git for Research

Git for Research is a web app for keeping research documents and conversations organized as versioned artifacts. A researcher can import a file, save named snapshots, explore an idea on a branch, compare changes, resolve a merge conflict, collaborate on a live draft, and ask questions over indexed research with links to source versions.

This is a course project built with Next.js, React, TypeScript, Supabase PostgreSQL, Supabase Realtime, Yjs, and OpenAI. It uses Git concepts for research content; it is not a Git client or a Git repository host.

## Problem and target users

Research notes, papers, and AI conversations are often scattered across files and chat histories. It is hard for a student or small research team to see how a finding changed, explore a different direction without overwriting work, or trace an answer back to a specific version. This application is for students and research teams who need a shared, inspectable history of their work.

## Solution and main workflows

1. **Collect research:** create a workspace and import readable documents, PDFs, conversation exports, or code files as artifacts.
2. **Develop ideas safely:** edit an artifact, save named commits, inspect history and diffs, branch from a version, and merge changes with visible conflict resolution.
3. **Work together:** invite editors or viewers, edit a shared draft with live presence, and review changes since the last visit.
4. **Find evidence:** index commit versions, ask a research question, and open the cited source versions.

## What the app does

| Area | Current implementation |
| --- | --- |
| Accounts and workspaces | Google sign-in through Supabase Auth; create workspaces; add existing signed-in users as editors or viewers |
| Import | Markdown, plain text, text-extractable PDFs, ChatGPT and Claude JSON conversation exports, and selected source-code files (up to 3 MB) |
| Version history | Each new artifact receives an initial commit. Editors can save later snapshots with a message and inspect earlier versions. |
| Branches and merges | Create a branch from a commit, compare line and paragraph changes, run a three-way merge, resolve conflicts, and record a merge commit. |
| Live collaboration | Yjs text updates are stored in PostgreSQL and streamed through Supabase Realtime. The editor shows who is viewing or editing. |
| Change awareness | When a researcher returns to a branch, the app summarizes changes since the last recorded visit. |
| Research query | Editors index commit content into pgvector with OpenAI embeddings. Members can ask a question and receive an answer with links to source commits. |

**Verification status:** the production build, lint check, and local tests for parsers, chunking, diff, and merge pass. Live OAuth, database writes, two-user Realtime editing, raw-file storage, and OpenAI answers still need an end-to-end check in the configured Supabase project. See [PROGRESS.md](./PROGRESS.md) and [DEMO.md](./DEMO.md).

## Architecture and deployment

The browser renders the Next.js interface. Server actions validate writes and use a signed-in Supabase client; PostgreSQL stores workspaces, artifacts, commits, branch heads, merge records, collaboration updates, and search vectors. Row-level security controls access. Supabase Realtime distributes Yjs updates and presence. OpenAI supplies embeddings and grounded answer generation. See [ARCHITECTURE.md](./ARCHITECTURE.md) for the data flow and boundaries.

- **Deployed application:** [git-for-researchh.vercel.app](https://git-for-researchh.vercel.app)
- **Source repository:** [Git-For-Research on GitHub](https://github.com/KanishkGH/Git-For-Research)

The application is deployed on Vercel. To deploy a copy, import this repository into Vercel, configure the environment variables below for the Production environment, apply the Supabase migrations, create the private `artifacts` Storage bucket, configure Google OAuth callback URLs for the deployment domain, and redeploy after changing environment variables. The login page was reachable on 2026-10-27; authenticated workflows still require the live checks in [DEMO.md](./DEMO.md).

## Run locally

Requirements: Node.js 24 for the included TypeScript-importing test runner, npm, a Supabase project, and a Google OAuth client. OpenAI credentials are required only for indexing and research answers.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`. Set `OPENAI_API_KEY` to use research indexing and answers. `OPENAI_ANSWER_MODEL` is optional. `SUPABASE_SERVICE_ROLE_KEY` is currently unused and is not needed to run the app. Never commit `.env.local`.

Apply [Supabase migrations](./supabase/migrations) **001 through 012 in numerical order** in the Supabase SQL Editor. Migration 008 enables pgvector search, 009 enables workspace member access, 010 adds durable Yjs updates and Realtime policies, 011 records the last seen branch head, and 012 lets a new workspace owner read the inserted row immediately. Apply only migrations missing from an existing database.

For Google sign-in:

1. Enable Google in Supabase Authentication → Providers and configure its client ID and secret.
2. Add the Supabase OAuth callback URL shown in that provider's settings to the Google OAuth client's authorized redirect URIs.
3. In Supabase Authentication → URL Configuration, add the app callback URL, for example `http://localhost:3000/auth/callback`, to Redirect URLs. Set Site URL to the deployed app origin when deploying.
4. In Supabase Realtime settings, disable public channel access so the private workspace presence policies apply.

The import action attempts to save the original file in a private Supabase Storage bucket named `artifacts`. **Create that bucket manually if you need raw-file retention; the migrations do not create it.** If the upload fails, the app still saves the extracted text as a commit and reports the artifact as imported. A text-extractable PDF is required; OCR is not implemented.

Open [http://localhost:3000](http://localhost:3000), sign in, and create a workspace. An owner can add another researcher after that person has signed in once, creating their app user record.

## Checks

```bash
npm run lint
npm test
npm run build
```

The tests cover representative parser input, chunk source offsets, line diff, clean merge, and merge conflict detection. They do not replace an authenticated browser test against Supabase and OpenAI.

## Project documents

- [ARCHITECTURE.md](./ARCHITECTURE.md): current data flow and implementation boundaries
- [DEMO.md](./DEMO.md): presentation walkthrough and live verification checklist
- [PROGRESS.md](./PROGRESS.md): what was checked and what still needs external verification

## Current limitations

- Research search requires a server-side OpenAI key and manual indexing from the workspace page; it is not automatic on every commit.
- Live collaboration depends on Supabase Realtime and private channel configuration. Test it with two signed-in accounts before presenting.
- Original file storage is best effort. The canonical extracted text is the versioned content.
- Diff and merge operate on text lines and paragraphs; they do not understand document meaning. Commit ancestry traversal is capped at 50 commits per branch for the merge preparation path.
