# Task 1: Catalog public visibility controls

## Changed files

- `server/services/catalogVisibility.js`: shared ancestor-aware category visibility, public-tree pruning, and parameterized product SQL conditions.
- `test/catalogVisibility.test.js`: regression tests for disabled ancestors, empty-branch pruning, and empty visible-category filters.
- `server/db.js`: additive `is_enabled INTEGER NOT NULL DEFAULT 1` migration and `(parent_id, is_enabled)` index.
- `server/routes/categories.js`: public pruned tree, authenticated complete admin tree, and partial visibility updates that retain omitted fields.
- `server/routes/products.js`, `server/index.js`, `server/routes/sitemap.js`, `server/routes/chat.js`: reuse visibility filtering for public product/category outputs, SSR/JSON-LD/initial state, sitemaps, and chat links.
- `src/views/admin/Categories.vue`, `src/api/index.js`: admin display toggle using `FormData`, admin tree loading, and category-cache invalidation.
- `package.json`: `npm test` script.

## TDD evidence

1. RED command: `node --test test/catalogVisibility.test.js`
   - Failed as expected with `ERR_MODULE_NOT_FOUND` for `server/services/catalogVisibility.js`.
2. GREEN command: `node --test test/catalogVisibility.test.js`
   - Passed 3/3 tests after the minimal visibility service was added.

## Verification

- `node --check` over all changed server modules: passed.
- `node --test test/catalogVisibility.test.js`: passed 3/3 (re-run after final edits).
- `npm.cmd run build`: passed; Vite transformed 738 modules.
- `git diff --check`: passed.
- `npm test`: not clean because Node discovers legacy scripts outside this task:
  - `scratch/test-backend.cjs` fails when an external market-data response has `json.data.diff === null`.
  - `server/test.js` fails because the existing database lacks `seo_settings.llms_txt`.
  - The new `catalogVisibility` test passes in that full run.

## Self-review

- Disabled ancestors and cycles make descendants non-public without mutating child records.
- The empty visible-category set yields the required `AND 1=0` condition, so no public product endpoint can leak uncategorized/hidden output.
- Product detail and fuzzy fallback now return the existing 404 result for hidden-category products.
- No database, GeoIP, API-key, or generated `dist` files are included in the task changes.
