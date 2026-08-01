# Task 1 Report: Product Review Schema and Idempotent Migration

## Scope

Implemented only the Task 1 files: normalized product-review schema, legacy
`seo_reviews` migration, database transaction wrapper, and focused tests. No
review data is generated, altered, or auto-published.

## TDD evidence

### RED

Command:

```powershell
node --test test/productReviewSchema.test.js
```

Expected failing output observed:

```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../server/services/productReviewSchema.js'
```

Exit code: `1`.

### GREEN

Commands:

```powershell
node --test test/productReviewSchema.test.js
node --check server/services/productReviewSchema.js
node --check server/db.js
```

Key output:

```text
tests 5
pass 5
fail 0
```

Both syntax checks exited `0`.

## Complete test result

Command:

```powershell
npm.cmd test
```

Result:

```text
tests 63
pass 63
fail 0
cancelled 0
skipped 0
todo 0
```

Exit code: `0`.

## Files

- Created `server/services/productReviewSchema.js`
- Created `test/productReviewSchema.test.js`
- Modified `server/db.js`

## Commit

`feat: add normalized product review storage`

## Self-review

- Column order, indexes, check constraints, unique partial index, and cascading
  foreign keys are covered by the focused in-memory SQLite tests.
- The migration accepts only existing products and valid product reviews; it
  trims migrated author/body text, rejects ratings outside 1–5 or with more
  than one decimal place, assigns `pending`/`migration`, and is idempotent via
  `source` plus `external_id`.
- `initDb` invokes schema initialization immediately after `products` exists;
  `seo_reviews` remains present but is documented only as a legacy migration
  source. The exported transaction wrapper delegates to better-sqlite3.

## Concerns

None for the required test command. A broader `node --test` scan (not the
project test command) still discovers unrelated repository scripts and fails
because of their pre-existing environment/runtime assumptions; `npm.cmd test`
is clean.

## Review follow-up: non-NULL external ID uniqueness

### RED

Added a regression case inserting two `external_api` rows with the same empty
string `external_id`. Command:

```powershell
node --test test/productReviewSchema.test.js
```

Observed expected failure under the former `TRIM(external_id) <> ''` predicate:

```text
tests 5
pass 4
fail 1
AssertionError [ERR_ASSERTION]: Missing expected exception.
```

Exit code: `1`.

### GREEN

Changed the partial unique index predicate to exactly
`WHERE external_id IS NOT NULL`, so every non-NULL value, including `''`, is
unique per source. Commands:

```powershell
node --test test/productReviewSchema.test.js
npm.cmd test
```

Results:

```text
node --test test/productReviewSchema.test.js: 5 pass, 0 fail
npm.cmd test: 63 pass, 0 fail
```

Both commands exited `0`.

### Follow-up self-review

- The partial-index condition now matches the brief exactly; only `NULL`
  external IDs are exempt from uniqueness.
- The regression test proves two empty-string IDs under the same source are
  rejected, while retaining the existing non-empty uniqueness coverage.
