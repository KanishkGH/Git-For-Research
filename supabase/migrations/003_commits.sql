-- Migration 003: Commits
-- Tables: commits
-- Purpose: Git-like versioning engine storing full text snapshots and parent chains.
-- Note: branch_id is intentionally omitted to resolve circular FK with branches.

CREATE TABLE commits (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     uuid        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  artifact_id      uuid        NOT NULL REFERENCES artifacts(id)  ON DELETE CASCADE,
  parent_commit_id uuid        REFERENCES commits(id) ON DELETE RESTRICT,
  merge_parent_id  uuid        REFERENCES commits(id) ON DELETE RESTRICT,
  content          text        NOT NULL,
  content_hash     text        NOT NULL,
  message          text        NOT NULL,
  author_id        uuid        REFERENCES users(id) ON DELETE SET NULL,
  is_merge_commit  boolean     NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_commits_artifact_id       ON commits(artifact_id);
CREATE INDEX idx_commits_parent_commit_id  ON commits(parent_commit_id);
CREATE INDEX idx_commits_workspace_id      ON commits(workspace_id);
CREATE INDEX idx_commits_created_at        ON commits(created_at DESC);
