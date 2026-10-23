-- Migration 001: Identity
-- Tables: users, workspaces, workspace_members
-- Purpose: Establish user identity, research workspaces, and workspace membership access control.

-- 1. users table
CREATE TABLE users (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email        text        NOT NULL UNIQUE,
  display_name text        NOT NULL,
  avatar_url   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 2. workspaces table
CREATE TABLE workspaces (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  description text,
  owner_id    uuid        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_workspaces_owner_id ON workspaces(owner_id);

-- 3. workspace_members table
CREATE TABLE workspace_members (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
  role         text        NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  joined_at    timestamptz NOT NULL DEFAULT now(),

  UNIQUE (workspace_id, user_id)
);

CREATE INDEX idx_workspace_members_user_id      ON workspace_members(user_id);
CREATE INDEX idx_workspace_members_workspace_id ON workspace_members(workspace_id);
