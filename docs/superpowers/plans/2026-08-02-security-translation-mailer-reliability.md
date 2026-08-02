# SunSea Steel Security, Translation, and Mailer Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix confirmed website security, AI translation queue, and bulk-mail reliability/compliance defects without deleting existing data or sending email.

**Architecture:** Add small security, mailer, scheduling, and translation helpers around the existing Express/Vue/SQLite application. Preserve current routes while centralizing authorization, path validation, secret masking, durable status transitions, suppression, and HTML sanitization.

**Tech Stack:** Node.js 20+, Express 4, SQLite/better-sqlite3, Vue 3, Nodemailer 8, Node test runner.

## Global Constraints

- Never delete or replace existing products, media, news, translations, reviews, contacts, tasks, or logs.
- Never send a real email during implementation or verification.
- Every schema migration must be idempotent and compatible with the deployed database.
- Preserve public URLs and current admin/CRM navigation.
- Apply TDD: every behavior change starts with a failing test and ends with targeted plus full verification.

---

### Task 1: Production secrets and secret-safe APIs

**Files:**
- Create: `server/config/secrets.js`
- Modify: `server/middleware/auth.js`
- Modify: `server/routes/translation.js`
- Modify: `server/routes/ai.js`
- Modify: `server/routes/email.js`
- Modify: `ecosystem.config.cjs`
- Modify: `server-setup.sh`
- Test: `test/securityBoundaries.test.js`

**Interfaces:**
- Produces: `getJwtSecrets(env, nodeEnv)` and `maskSecret(value)`.
- Consumes: existing Express authentication middleware and PM2 environment.

- [ ] Write tests asserting production rejects missing/default JWT secrets and secret-bearing APIs require authentication and omit raw keys/passwords.
- [ ] Run `node --test test/securityBoundaries.test.js` and confirm failures identify the current defaults and unmasked responses.
- [ ] Implement secret loading, authenticated settings, masked responses, and PM2 `.env` loading.
- [ ] Re-run the targeted test and confirm it passes.
- [ ] Run authentication and login regression tests.

### Task 2: HTML and attachment safety

**Files:**
- Create: `server/services/safePath.js`
- Create: `src/utils/sanitizeHtml.js`
- Modify: `server/routes/mailer.js`
- Modify: `src/views/ProductDetail.vue`
- Modify: `src/views/NewsDetail.vue`
- Modify: `src/views/admin/Mailer.vue`
- Test: `test/contentSafety.test.js`

**Interfaces:**
- Produces: `resolveUploadPath(root, filename)` and `sanitizeRichHtml(html)`.
- Consumes: uploaded attachment metadata and localized HTML strings.

- [ ] Write failing tests for traversal filenames, encoded traversal, script/event attributes, iframe/object tags, and `javascript:` URLs.
- [ ] Run the targeted test and confirm all unsafe cases currently fail.
- [ ] Implement strict upload containment and allow-list HTML sanitation.
- [ ] Re-run targeted tests and existing product/news rendering tests.

### Task 3: Mailer schema and authorization

**Files:**
- Create: `server/services/mailerSchema.js`
- Create: `server/services/mailerAccess.js`
- Modify: `server/db.js`
- Modify: `server/routes/mailer.js`
- Modify: `server/routes/email.js`
- Modify: `server/routes/crm-mailer.js`
- Test: `test/mailerSchema.test.js`
- Test: `test/mailerAuthorization.test.js`

**Interfaces:**
- Produces: `initializeMailerSchema(db)`, `mailResourceScope(identity)`, and owner-aware record guards.
- Consumes: current `req.user`/`req.crmUser` identities.

- [ ] Write failing in-memory database tests for missing mail columns and owner-scoped CRUD/start/stop/realtime/log behavior.
- [ ] Confirm the tests fail against current schema and routes.
- [ ] Add idempotent columns/indexes and apply owner checks to every mail mutation and progress response.
- [ ] Replace the invalid `mail_contacts.country` filter with group-name filtering.
- [ ] Re-run both targeted suites.

### Task 4: Durable mail task behavior

**Files:**
- Create: `server/services/mailTaskState.js`
- Create: `server/services/safeScheduler.js`
- Modify: `server/routes/mailer.js`
- Modify: `server/routes/crm-mailer.js`
- Modify: `server/index.js`
- Test: `test/mailTaskState.test.js`

**Interfaces:**
- Produces: `processedSentEmails(logs)`, `classifyMailTask(outcomes)`, `scheduleInRange(date, callback)`, and `recoverInterruptedMailTasks(db)`.
- Consumes: mail logs, schedule dates, and current task rows.

- [ ] Write failing tests proving failed recipients remain retryable, mixed outcomes are partial, all failures are failed, invalid/far-future schedules never fire early, and interrupted tasks become paused.
- [ ] Run the targeted test and observe expected failures.
- [ ] Implement helpers and integrate them into both mail runners.
- [ ] Persist SMTP error messages, reuse transports, validate intervals and schedule dates, and close transports at task end.
- [ ] Re-run targeted tests.

### Task 5: Suppression and one-click unsubscribe

**Files:**
- Create: `server/services/mailSuppression.js`
- Create: `server/routes/unsubscribe.js`
- Modify: `server/db.js`
- Modify: `server/index.js`
- Modify: `server/routes/mailer.js`
- Modify: `server/routes/crm-mailer.js`
- Modify: `server/routes/external-api.js`
- Test: `test/mailSuppression.test.js`

**Interfaces:**
- Produces: signed unsubscribe URLs, suppression lookup/write methods, and `applyMarketingUnsubscribe(mail, recipient)`.
- Consumes: a dedicated `UNSUBSCRIBE_SECRET` derived only from an explicit production secret.

- [ ] Write failing tests for signed tokens, tamper rejection, idempotent suppression, recipient exclusion, visible body link, `List-Unsubscribe`, and `List-Unsubscribe-Post` headers.
- [ ] Run targeted tests and confirm current mail output fails the requirements.
- [ ] Add the suppression schema, public GET/POST unsubscribe route, and send-time exclusion/headers.
- [ ] Re-run targeted tests without calling SMTP.

### Task 6: Translation queue reliability

**Files:**
- Create: `server/services/translationQueueState.js`
- Modify: `server/services/translationTaskSchema.js`
- Modify: `server/routes/translation.js`
- Modify: `server/routes/translation-jobs.js`
- Modify: `server/index.js`
- Modify: `src/views/admin/Translations.vue`
- Test: `test/translationQueueState.test.js`

**Interfaces:**
- Produces: `clampTranslationConcurrency(value)`, `recoverLegacyTranslationTasks(db)`, and `isActiveTranslationStatus(status)`.
- Consumes: `translation_tasks`, `translation_jobs`, and admin job polling.

- [ ] Write failing tests for concurrency bounds, stale-running recovery, partial-result errors, duplicate pending jobs, and active pausing/aborting UI states.
- [ ] Run targeted tests and confirm failures represent the audited defects.
- [ ] Implement state helpers, startup recovery, strict success classification, and job uniqueness checks.
- [ ] Re-run translation task, review translation, and new queue tests.

### Task 7: Dependency and end-to-end verification

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Delete if unused: `server/utils/wechatBot.js`
- Test: all tests under `test/`

**Interfaces:**
- Consumes: completed Tasks 1-6.
- Produces: a buildable, tested dependency graph and deployment handoff.

- [ ] Prove the Wechaty bot is unreachable from application startup and remove its unused dependency chain.
- [ ] Update directly fixable high-risk dependencies without forced breaking upgrades.
- [ ] Run `npm audit --omit=dev` and record remaining reachable versus transitive findings.
- [ ] Run `npm test` and require zero failures.
- [ ] Run server syntax checks and `npm run build` with exit code 0.
- [ ] Run `npm run verify:public` against `https://www.sunseasteel.com` and record the result.
- [ ] Review `git diff`, verify no database or generated artifact changes, and summarize deployment steps.

