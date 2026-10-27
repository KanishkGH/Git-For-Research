# Demo and live verification

The following flow matches features present in the code. **Run it on the actual Supabase project before presenting:** local tests and a successful build do not verify OAuth, database writes, Realtime, Storage, or OpenAI.

## Prepare

1. Apply database migrations 001–012 and configure Google sign-in and private Supabase Realtime as described in [README.md](./README.md).
2. Sign in with two different Google accounts. Create a workspace with the first account, then add the second account as an editor. To show viewer restrictions, add a third account as a viewer if available.
3. Prepare a small Markdown document with three distinct paragraphs, a text-extractable PDF, and a valid ChatGPT or Claude JSON export. Use realistic research content and keep each file under 3 MB.
4. If demonstrating research answers, set `OPENAI_API_KEY`, confirm the OpenAI account can make embedding and answer requests, and index the workspace before the presentation.
5. Create branch edits in advance if a reliable live merge conflict is needed.

## Submission video walkthrough (target 3–5 minutes)

1. **Problem and user (20–30 seconds):** explain that small research teams need a history they can inspect and branch safely.
2. **Collect and version (60–75 seconds):** sign in, show a prepared workspace, import a short document, edit it, save a named commit, and open the history.
3. **Branch and merge (90–120 seconds):** show a prepared alternate branch, a readable diff, an overlapping edit, the conflict resolver, and the resulting merge commit.
4. **Collaboration or research query (45–75 seconds):** show the one advanced flow that was verified live before recording. For collaboration, use two signed-in accounts. For research query, index beforehand and open a citation.
5. **Close (10–15 seconds):** point to the deployed app and source repository.

Keep the full checklist below for private testing; the video should show a few reliable workflows rather than attempt every feature. Do not record a flow that has not passed its live check.

## Pass criteria for a live check

| Flow | Confirm |
| --- | --- |
| OAuth | Both accounts can sign in and return to the app. |
| Workspace roles | Owner can add a member; editor can import and commit; viewer cannot edit. |
| Import | Each supported sample produces readable canonical text and an initial commit. |
| Storage, if required | The original file exists in the private `artifacts` bucket. An artifact appearing in the UI alone does not prove raw storage succeeded. |
| Versioning | New commit appears in history and survives a page reload. |
| Merge | Non-overlapping edits merge; overlapping edits produce a visible conflict; resolution creates a merge commit. |
| Collaboration | Two signed-in accounts see live presence and text updates; edits survive a reload. |
| Search | Indexing completes, a question returns an answer, and citation links open the correct versions. |

Record any failed step in [PROGRESS.md](./PROGRESS.md) before claiming the corresponding live feature works in a submission.
