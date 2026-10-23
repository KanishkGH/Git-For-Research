-- Migration 005: Merge Records
-- Tables: merge_records
-- Purpose: Record merge lifecycle states, conflict markers, and conflict resolution details.

CREATE TABLE merge_records (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     uuid        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  artifact_id      uuid        NOT NULL REFERENCES artifacts(id)  ON DELETE CASCADE,
  source_branch_id uuid        NOT NULL REFERENCES branches(id)   ON DELETE RESTRICT,
  target_branch_id uuid        NOT NULL REFERENCES branches(id)   ON DELETE RESTRICT,
  base_commit_id   uuid        NOT NULL REFERENCES commits(id)    ON DELETE RESTRICT,
  source_commit_id uuid        NOT NULL REFERENCES commits(id)    ON DELETE RESTRICT,
  target_commit_id uuid        NOT NULL REFERENCES commits(id)    ON DELETE RESTRICT,
  result_commit_id uuid        REFERENCES commits(id)             ON DELETE RESTRICT,
  status           text        NOT NULL DEFAULT 'pending'
                                 CHECK (status IN ('pending', 'success', 'conflict', 'resolved')),
  conflict_content text,
  resolved_content text,
  initiated_by     uuid        REFERENCES users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  resolved_at      timestamptz
);

CREATE INDEX idx_merge_records_artifact_id  ON merge_records(artifact_id);
CREATE INDEX idx_merge_records_status       ON merge_records(status);
CREATE INDEX idx_merge_records_workspace_id ON merge_records(workspace_id);
