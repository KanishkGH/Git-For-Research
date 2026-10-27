# Progress and verification

Updated 2026-10-27. **Implemented** means the feature has code and UI. **Locally verified** means a local automated check passed. **Live verification pending** means a signed-in browser check against the configured external services has not been completed during this review.

## Current status

| Feature | Implementation | Verification |
| --- | --- | --- |
| Google sign-in and workspace roles | Implemented | Workspace creation hit a production RLS error; migration 012 and a code fix are prepared, live retry pending |
| Markdown, plain-text, ChatGPT, and Claude parsing | Implemented | Representative parser tests pass |
| Text-extractable PDF import | Implemented | Live import pending |
| Raw-file upload to Supabase Storage | Best-effort implementation | Private `artifacts` bucket is visible in the Supabase dashboard; live upload pending |
| Commit snapshots and branch heads | Implemented | Build passes; live database flow pending |
| Semantic diff and three-way merge | Implemented | Local diff, clean merge, and conflict tests pass; live UI flow pending |
| Yjs editing and live presence | Implemented | Two-user Realtime check pending |
| Change awareness | Implemented | Live two-user check pending |
| Chunking and source offsets | Implemented | Local chunk tests pass |
| pgvector indexing and grounded answers | Implemented | A local OpenAI key is present, but live indexing and answer generation remain unverified |

## Checks run

- `npm run lint`: passed.
- `npm run build`: passed.
- `npm test`: eight local tests pass across parser, chunking, diff, and merge modules.
- Local HTTP smoke check: `/login` returns HTTP 200 and an unauthenticated request to `/` redirects to `/login`.
- Public Vercel login page at `https://git-for-researchh.vercel.app/login`: HTTP 200 on 2026-10-27. This does not verify authenticated workflows.

These checks do not establish that every external integration works. The most useful next action is the end-to-end walkthrough in [DEMO.md](./DEMO.md) using two signed-in accounts.

## Submission tasks

1. Run every live pass criterion in [DEMO.md](./DEMO.md) and record the outcome.
2. Add the key to the Vercel Production environment and verify indexing and answers if those features will be demonstrated.
3. Import a new file and verify that the original appears in the private `artifacts` Storage bucket if raw-file retention is part of the demonstration.
4. Check Google callback URLs and private Realtime configuration on the deployed environment.

## Known limits

- On 2026-10-27, production workspace creation returned a row-level security error. Migration 012 adds a direct owner read policy, and the workspace insert now reads its row in a separate statement. Neither fix has been applied or verified in production during this review.
- The app versions extracted text snapshots. It does not offer OCR for scanned PDFs.
- Original-file upload can fail while the artifact import still succeeds with extracted text.
- Research indexing is manual and uses external OpenAI requests.
- Commit ancestry reads are currently limited to 50 parent commits in the merge preparation path.
