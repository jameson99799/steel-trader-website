# SunSea Steel Security, Translation, and Mailer Reliability Design

## Objective

Eliminate the confirmed credential, authorization, queue-recovery, mailer-schema, scheduling, unsubscribe, and HTML-safety defects without changing public URLs, deleting business data, or sending test email.

## Chosen approach

Use focused shared services instead of duplicating checks inside large route files:

- A production-secret loader fails closed when JWT secrets are absent and is loaded consistently by PM2.
- Resource-authorization helpers enforce administrator-or-owner access for mailer records.
- Attachment helpers resolve filenames beneath the uploads directory and reject traversal.
- Mailer schema migrations add only backward-compatible columns and suppression data.
- Mail task helpers make retry, final status, scheduling, and restart recovery deterministic.
- Translation queue helpers clamp concurrency, recover stale work, and use explicit terminal states.
- HTML is sanitized with an allow-list before public `v-html` rendering.

This preserves the current Express/Vue/SQLite architecture and avoids replacing existing admin workflows.

## Security boundaries

1. Public translation status remains public, but translation settings and every secret-bearing response require administrator authentication and never return raw credentials.
2. Production startup requires unique `JWT_SECRET` and `CRM_JWT_SECRET`; development retains explicit local-only defaults.
3. CRM subaccounts may read or mutate only owned or explicitly assigned mail resources. Administrator accounts retain global access.
4. Attachment names are treated as opaque basenames. Resolved paths must remain under `uploads` for upload, send, and delete operations.
5. AI/admin rich HTML is sanitized with an allow-list that removes scripts, event handlers, dangerous URL schemes, embedded frames, and unsafe metadata.

## Mail delivery design

- `mail_logs` gains `account_name`, `error_msg`, and `retry_count` columns through idempotent migrations.
- Contacts gain normalized-email indexes scoped by owner; group filtering never queries a nonexistent country column.
- Resume skips only `sent` recipients. Failed recipients remain eligible.
- A task ends as `done`, `partial`, or `failed` from actual outcomes and stores a summary error.
- SMTP transports are pooled per account for a task and use normal certificate verification.
- Scheduled tasks use a bounded recheck timer, so dates beyond Node's timer limit cannot execute early.
- Server startup converts interrupted mail tasks to `paused`, preserving sent logs for safe resume.
- Marketing sends check a suppression table, add visible unsubscribe links and RFC one-click headers, and expose a signed public unsubscribe endpoint. Suppression is permanent until an administrator explicitly restores the address.
- No audit or verification step sends real email.

## Translation design

- Keep both existing APIs for compatibility, but make the durable `translation_jobs` system authoritative in the admin UI.
- Recover stale legacy `translation_tasks` rows to `pending` at startup so auto-post work cannot remain stuck.
- Mark legacy tasks successful only when there are no field errors.
- Clamp concurrency to 1-10 at every server entry point.
- Prevent concurrent `pending`, `running`, or `pausing` jobs.
- Preserve resumable pending items on safe pause; classify crashed jobs as aborted with an actionable log.
- Treat `running`, `pausing`, and `aborting` as active in the UI.

## Compatibility and data safety

- All new schema changes use `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE` guarded by column checks, and indexes that preserve existing rows.
- Existing sent logs, contacts, tasks, translations, products, media, and reviews are never deleted.
- Existing public APIs and URLs remain registered.
- Existing marketing templates continue working; unsubscribe content is appended only when not already present.

## Verification

- Add route/source-contract tests for secret masking, authorization, traversal rejection, schema compatibility, queue recovery, retry behavior, timer bounds, suppression, and one-click headers.
- Run targeted tests in red-green cycles.
- Run the full Node test suite, production build, server syntax checks, and public multi-viewport verifier.
- Confirm the Git worktree contains only intentional files and no database mutation.

