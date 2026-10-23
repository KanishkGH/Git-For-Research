-- Migration 004: Branches
-- Tables: branches
-- Purpose: Named pointers to commit heads per artifact.

CREATE TABLE branches (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id           uuid        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  artifact_id            uuid        NOT NULL REFERENCES artifacts(id)  ON DELETE CASCADE,
  name                   text        NOT NULL,
  head_commit_id         uuid        REFERENCES commits(id) ON DELETE RESTRICT,
  created_from_commit_id uuid        REFERENCES commits(id) ON DELETE RESTRICT,
  created_by             uuid        REFERENCES users(id)   ON DELETE SET NULL,
  is_default             boolean     NOT NULL DEFAULT false,
  created_at             timestamptz NOT NULL DEFAULT now(),

  UNIQUE (artifact_id, name)
);

CREATE INDEX idx_branches_artifact_id  ON branches(artifact_id);
CREATE INDEX idx_branches_workspace_id ON branches(workspace_id);
