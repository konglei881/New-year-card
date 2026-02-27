---
name: "supabase"
description: "Interact with Supabase Management API to manage projects, retrieve logs, check analytics, and configure authentication. Invoke when user needs to debug Supabase projects, fetch logs, or manage resources via API."
---

# Supabase Management Skill

This skill allows you to interact with the Supabase Management API to perform various administrative tasks.

## Prerequisites

- **Access Token**: You must have a Supabase Personal Access Token (PAT).
  - You should store this in your environment variables (e.g., `SUPABASE_ACCESS_TOKEN`) or provide it when making requests.
- **Project Ref**: Most commands require the Project Reference ID (`ref`).

## Capabilities

### 1. Project Management
- List all projects
- Get project details
- Create organizations/projects

### 2. Observability & Logging
- **Get Project Logs**: Retrieve logs for debugging (Auth, Database, Realtime, Storage, etc.).
  - Endpoint: `GET /v1/projects/{ref}/analytics/endpoints/logs.all`
  - Params: `sql` (optional), `iso_timestamp_start`, `iso_timestamp_end`
- **Analytics**: Fetch usage stats and API counts.

### 3. Database & Querying
- Run SQL queries against the project's database (via SQL Editor API if available, or using logs for read-only checks).

## Usage Examples

### Fetching Project Logs
To get logs for a specific project:

```bash
curl -X GET 'https://api.supabase.com/v1/projects/{ref}/analytics/endpoints/logs.all?iso_timestamp_start=2024-01-01T00:00:00Z' \
  -H 'Authorization: Bearer <SUPABASE_ACCESS_TOKEN>'
```

### Listing Projects
To list all projects under your account:

```bash
curl -X GET 'https://api.supabase.com/v1/projects' \
  -H 'Authorization: Bearer <SUPABASE_ACCESS_TOKEN>'
```

## Instructions for the Agent

1. **Authentication**: Always check if `SUPABASE_ACCESS_TOKEN` is available. If not, ask the user to provide it.
2. **Context**: If the user asks for logs, ensure you have the `Project Ref` and a time range.
3. **Execution**: Use `curl` or a dedicated script to make API requests. Do not guess IDs; list projects first if the ID is unknown.
4. **Safety**: Do not expose the Access Token in logs or final answers.

## Reference
- Official API Docs: https://supabase.com/docs/reference/api/introduction
