# Task 2 Report: Product Review Validation and Workflows

## Status

Complete. The domain service is the single implementation point for review validation, bulk parsing, admin/public queries, mutations, translation freshness, and cache invalidation.

## RED evidence

### Initial required RED

Command:

```powershell
node --test test/productReviewCore.test.js
```

Expected failure observed (exit 1):

```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find module ...\server\services\productReviews.js
tests 1
pass 0
fail 1
```

The failure was caused by the missing production module, not a test syntax or fixture error.

### Self-review regression RED

After the initial GREEN, two edge cases were added before their fixes:

```powershell
node --test test/productReviewCore.test.js
```

Observed (exit 1):

```text
tests 15
pass 13
fail 2
```

The failures proved that `listPublic` incorrectly imposed an unspecified limit of 100 and that an existing translation with a NULL `source_hash` was not marked stale. Both were corrected in the service, then rerun GREEN.

## GREEN evidence

Final focused command:

```powershell
node --test test/productReviewCore.test.js
```

Key output:

```text
tests 15
pass 15
fail 0
duration_ms 131.89
```

Syntax command:

```powershell
node --check server/services/productReviews.js
```

Result: exit 0 with no syntax errors.

Final complete command:

```powershell
npm.cmd test
```

Key output:

```text
tests 78
pass 78
fail 0
duration_ms 12411.5588
```

## Files

- Created `server/services/productReviews.js`.
- Created `test/productReviewCore.test.js`.
- Created this required execution report at `.superpowers/sdd/task-2-report.md`.
- No routes, Vue components, SSR code, translation system files, schema files, or dependencies were changed.

## Coverage

- Real calendar date parsing, strict one-decimal ratings, input trimming, policy enforcement, disclosure rules, and deterministic SHA-256 source hashes.
- Position-aware line parsing, preserved body hyphens, row errors, blank lines, and batch-local duplicate detection.
- Real in-memory SQLite coverage for create/idempotency, 1-200 row atomic bulk writes, shared batch IDs, immutable updates, translation invalidation, publication timestamps, remove, bulk status, and scoped publish-all.
- Admin filtering/pagination/category recursion; public English and hash-current language reads without fallback; global published summary; translated/stale/missing status.
- Correct cache invalidation product IDs for every successful mutation type.

## Commit

- Title: `feat: add product review validation and workflows`
- This report is included in that commit; the final SHA is reported by the task response after Git creates the commit.

## Self-review

- Rechecked every exported interface and all twelve minimum test areas against `task-2-brief.md`.
- Confirmed user text is bound as SQL parameters; only constant SQL structure and generated placeholder counts are interpolated.
- Confirmed input objects are not mutated, ratings are rejected rather than repaired, preview parsing performs no database access, and bulk normalization completes before transactional writes.
- Confirmed non-English public results replace and remove English source helper fields, require exact language and current source hash, and never fall back.
- Confirmed idempotent no-write paths do not invalidate cache, while all six successful mutation methods do.

## Concerns

- None known. A read-only reviewer was started but stopped at the parent task's request so final verification and submission would not wait; the parent will perform the independent post-commit review.
