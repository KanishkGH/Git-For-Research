# Git for Research

**Git for Research** is a web application for collecting research material and tracking how it changes. Researchers can import notes, PDFs, and AI conversation exports; save named versions; explore ideas on branches; resolve merge conflicts; edit together; and search indexed versions with links back to the source. It applies Git-style history to research content. It is not a Git client or repository host.

- **Live application:** https://git-for-researchh.vercel.app
- **Source code:** https://github.com/KanishkGH/Git-For-Research
- **Demo video:** https://drive.google.com/file/d/1gMVThTnXi7FP6dH84pLIr7H9uCIawFA0/view?usp=drivesdk
- **Demo and live test guide:** [DEMO.md](./DEMO.md)
- **Implementation status:** [PROGRESS.md](./PROGRESS.md)

## Problem statement

Students and small research teams often spread their work across documents, PDFs, and AI chats. They need to know which version produced a finding, compare two lines of inquiry, collaborate without silently overwriting work, and trace an answer to its source. Ordinary file folders and chat histories make those tasks difficult.

## Target users

The application is built for students and small research teams who need a shared, inspectable history of notes, papers, and conversations.

## Solution

Git for Research gives those teams a shared workspace with persistent research artifacts and an inspectable history. The core product is the path from importing material to editing, versioning, comparing, and merging it. Collaboration and evidence search extend that path when the required external services are configured.

## Key features and workflows

| Workflow | User actions | Result |
| --- | --- | --- |
| Collect research | Create a workspace, create a text artifact, or import a supported file | An artifact is saved with an initial text snapshot and a `main` branch |
| Develop an idea | Edit text, save a commit with a message, open an older version, create a branch from a commit | Branches retain separate heads and a readable history |
| Compare and merge | View additions and deletions, prepare a three-way merge, resolve overlapping edits | A merge commit records both parent versions and advances the target branch |
| Work with a team | Add an existing user as editor or viewer, open a shared draft, see presence and recent changes | Role-based access and persistent Yjs text updates |
| Find evidence | Index workspace commits, ask a question, open a cited version | An answer grounded in retrieved excerpts, when OpenAI is available |

Google sign-in establishes each researcher's identity. The workspace owner can add another person after that person has signed in once. Owners manage members; editors can change research content; viewers can read it. PostgreSQL row-level security enforces these roles in addition to the interface.

### Supported imports

- Markdown and plain-text files
- Text-extractable PDFs (scanned PDFs need OCR, which is not implemented)
- ChatGPT and Claude JSON conversation exports with recognizable schemas
- Selected source-code and text configuration files such as `.py`, `.ts`, `.js`, `.sql`, and `.yaml`

The upload limit is **3 MB per file**. Import extracts a canonical text representation. That text becomes the versioned commit content. The application also attempts to retain the original file in a private Supabase Storage bucket named `artifacts`; raw-file storage is best effort.

## Main application logic

1. **Import:** validate the signed-in user's editor access, file type, and size; parse the file; create an artifact and initial commit; point its `main` branch at that commit. If a later database step fails, the action attempts to clean up the incomplete import.
2. **Save a version:** store a full text snapshot with a message, SHA-256 hash, author, and parent commit. Advance the branch head only if it still points to the expected parent, so a stale save is rejected.
3. **Branch and merge:** start a branch from a chosen commit. Compare versions as text additions and deletions. A three-way merge uses a shared ancestor; overlapping edits go to a conflict resolver. Completing the merge creates a commit with two parents and checks that neither branch moved during resolution.
4. **Live draft:** seed a Yjs document from the branch head, persist encoded updates in PostgreSQL, and deliver updates and presence through Supabase Realtime. Saving a commit makes an explicit versioned snapshot of the draft. The app also compares the current branch head with the version a researcher last viewed.
5. **Research query:** split commit text into overlapping chunks with source offsets, create embeddings, and store them with the commit ID in pgvector. Search stays within the user's workspace. The answer request receives retrieved excerpts and is instructed to cite them; citation links open the corresponding artifact version.

## Tech stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| Web application | Next.js 15 App Router, React 19, TypeScript, Tailwind CSS | Pages, editor UI, server actions, loading and error states |
| Authentication and data | Supabase Auth, PostgreSQL, row-level security | Google sign-in, persistent records, ownership and roles |
| File storage | Supabase Storage | Optional retention of original uploads |
| Live editing | Yjs and Supabase Realtime | Shared text updates and presence |
| Research search | pgvector and OpenAI API | Embeddings, workspace search, grounded answers |
| Deployment | Vercel | Public web application |

## Architecture

The browser calls Next.js server actions for writes. Those actions validate input and use the signed-in user's Supabase session. PostgreSQL stores workspaces, artifacts, commits, branch heads, merge records, Yjs updates, last-seen views, and search chunks. Database row-level security restricts reads and writes. OpenAI calls stay on the server; the API key is never sent to the browser. See [ARCHITECTURE.md](./ARCHITECTURE.md) for the data model and flow details.

```text
Browser and editor
    -> Next.js pages and server actions
        -> Supabase Auth, PostgreSQL, Storage, Realtime
        -> OpenAI embeddings and answers (research search only)
```

## Local setup

### Requirements

- Node.js 24 and npm. Node 24 is needed to run the included tests that import TypeScript directly.
- A Supabase project with PostgreSQL, Realtime, and Storage available.
- A Google OAuth client configured through Supabase Auth.
- An OpenAI API key with available credits if you want indexing and research answers. The other workflows do not require OpenAI.

### 1. Install and configure

```bash
git clone https://github.com/KanishkGH/Git-For-Research.git
cd Git-For-Research
npm install
```

Copy `.env.example` to `.env.local` (`cp .env.example .env.local` on macOS/Linux, or `Copy-Item .env.example .env.local` in PowerShell), then fill in the values below. `.env.local` is ignored by Git.

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase public or publishable key; access is controlled by auth and row-level security |
| `OPENAI_API_KEY` | For research search | Server-side embeddings and answer requests |
| `OPENAI_ANSWER_MODEL` | No | Overrides the default answer model, `gpt-6-luna` |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Reserved in the template; the current application does not use it |

Never put secrets in `NEXT_PUBLIC_*` variables or commit `.env.local`. The Supabase public key is designed for client use; the OpenAI key is server-side only.

### 2. Set up Supabase

1. In the Supabase SQL Editor, apply [migrations 001 through 012](./supabase/migrations) in numerical order. On an existing project, apply only those still missing. These create the schema, role policies, search function, collaboration updates, and workspace-owner read policy.
2. Create a **private** Storage bucket named `artifacts` if original-file retention is required. The migrations do not create the bucket.
3. Enable Google in Supabase Authentication > Providers. Enter a Google OAuth client ID and secret. Add the Supabase callback URL shown there to the Google client's authorized redirect URIs.
4. In Supabase Authentication > URL Configuration, add `http://localhost:3000/auth/callback` to Redirect URLs. Set Site URL to the appropriate app origin and add the deployed callback URL when deploying.
5. Configure Supabase Realtime for private channels so the workspace presence policies in migration 010 apply. Realtime must also be enabled for `collaboration_updates` by that migration.

### 3. Start the app

```bash
npm run dev
```

Open http://localhost:3000, sign in with Google, and create a workspace. A second researcher must sign in once before the owner can add their email as a member.

## Deployment

The public deployment is at https://git-for-researchh.vercel.app. To deploy your own copy, import the repository into Vercel, set the required environment variables for **Production**, configure the matching app callback URL in Supabase, apply the migrations, and redeploy after changing environment variables. Configure the private Storage bucket and Realtime settings for the workflows you intend to use.

The GitHub commit `136fb04` was pushed and Vercel reported a successful deployment on 27 October 2026. The public login page was reachable. A deployment status and login page do not prove that signed-in database and Realtime workflows work; run the live checks in [DEMO.md](./DEMO.md).

## Verification

```bash
npm run lint
npm test
npm run build
```

At the latest local check, lint and the production build passed. Eight tests passed for representative import parsing, chunk offsets, text diff, clean merge, and merge conflict detection. These tests do not cover the deployed OAuth flow, database policies, Storage, two-user Realtime behavior, or an end-to-end research query.

**Live verification still needed:** sign in, create a workspace, import a file, save and reload a commit, branch and merge, and confirm any collaboration or search flow you plan to demonstrate. The previous production workspace-creation attempt hit a row-level security error. The code fix is deployed, but application of migration 012 to the production database and a successful live retry have not been confirmed. A direct request using the local OpenAI key on 27 October 2026 returned **no credits remaining**, so indexing and answers need an account with available API credits. See [PROGRESS.md](./PROGRESS.md) for the current record and [DEMO.md](./DEMO.md) for pass criteria.

## Current limits

- Indexing is started manually from a workspace; new commits are not indexed automatically.
- Search and answers require a configured, funded OpenAI API account.
- Original-file upload is best effort; the extracted text snapshot is the durable versioned content.
- PDF import extracts embedded text and does not perform OCR.
- Diff and merge operate on text lines and paragraphs, not the meaning of a document. Merge ancestry traversal currently reads at most 50 parent commits per branch.
- Live collaboration requires working Supabase Realtime and private-channel configuration.

## Project documents

- [ARCHITECTURE.md](./ARCHITECTURE.md) — implementation and data flows
- [DEMO.md](./DEMO.md) — suggested video walkthrough and live test checklist
- [PROGRESS.md](./PROGRESS.md) — implementation and verification status
