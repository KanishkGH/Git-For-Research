-- Migration 006: Presence Sessions
-- Tables: presence_sessions
-- Purpose: Track live user presence per artifact for concurrent editing.

CREATE TABLE presence_sessions (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  artifact_id   uuid        NOT NULL REFERENCES artifacts(id)  ON DELETE CASCADE,
  user_id       uuid        NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
  status        text        NOT NULL DEFAULT 'viewing'
                              CHECK (status IN ('viewing', 'editing')),
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  session_token text        NOT NULL DEFAULT gen_random_uuid()::text,

  UNIQUE (user_id, artifact_id)
);

CREATE INDEX idx_presence_sessions_artifact_id  ON presence_sessions(artifact_id);
CREATE INDEX idx_presence_sessions_last_seen_at ON presence_sessions(last_seen_at);
