-- Migration 002: Artifacts
-- Tables: artifacts
-- Purpose: Establish identity of research objects (documents, PDFs, conversation exports).

CREATE TABLE artifacts (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      uuid        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name              text        NOT NULL,
  artifact_type     text        NOT NULL CHECK (
                                  artifact_type IN (
                                    'markdown', 'pdf',
                                    'chatgpt_export', 'claude_export',
                                    'codebase'
                                  )
                                ),
  original_filename text,
  storage_path      text,
  created_by        uuid        REFERENCES users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_artifacts_workspace_id ON artifacts(workspace_id);
