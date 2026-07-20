# Task 1: Catalog public visibility controls

## Changed files

- `server/services/catalogVisibility.js`: shared ancestor-aware category visibility, public-tree pruning, and parameterized product SQL conditions.
- `test/catalogVisibility.test.js`: regression tests for disabled ancestors, empty-branch pruning, and empty visible-category filters.
- `server/db.js`: additive `is_enabled INTEGER NOT NULL DEFAULT 1` migration and `(parent_id, is_enabled)` index.
- `server/routes/categories.js`: public pruned tree, authenticated complete admin tree, and partial visibility updates that retain omitted fields.
- `server/routes/products.js`, `server/index.js`, `server/routes/sitemap.js`, `server/routes/chat.js`: reuse visibility filtering for public product/category outputs, SSR/JSON-LD/initial state, sitemaps, and chat links.
- `src/views/admin/Categories.vue`, `src/views/admin/Products.vue`, `src/views/admin/Dashboard.vue`, `src/views/admin/Translations.vue`, `src/api/index.js`: authenticated admin catalog consumers, display toggle using `FormData`, and category-cache invalidation.
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

## Review follow-up

- Public `GET /api/categories/` now filters the flat category list through `getVisibleCategoryIds`; the authenticated `/api/categories/admin/tree` remains the complete administrative source.
- Added authenticated `GET /api/products/admin/list`. The public product list stays visibility-filtered, while `admin/Products.vue` now loads complete categories and products, including records in disabled category branches.
- Added regression test `public categories are pruned while the admin tree retains disabled records`.

### Follow-up TDD and verification

1. RED command: `node --test test/catalogVisibility.test.js`
   - Failed as expected because `buildAdminCategoryTree` was not exported from the categories route.
2. GREEN command: `node --test test/catalogVisibility.test.js`
   - Passed 4/4 after exporting the complete-tree helper and applying public/admin route separation.
3. Final commands:
   - `node --check server/routes/categories.js server/routes/products.js server/services/catalogVisibility.js`: passed.
   - `node --test test/catalogVisibility.test.js`: passed 4/4.
   - `npm.cmd run build`: passed; Vite transformed 738 modules.

## Second review follow-up

- `Dashboard.vue` uses the authenticated full product list and complete category tree; its recursive counter preserves the previous all-category total rather than counting roots only.
- `Translations.vue` uses the authenticated complete category tree when product translation status is loaded, so disabled-branch product categories remain selectable.
- Extended the focused regression test to verify all admin catalog consumers use `getAdminProducts`/`getAdminCategoryTree` and that the dashboard recursively counts the complete tree.

### Follow-up TDD and verification

1. RED command: `node --test test/catalogVisibility.test.js`
   - Failed as expected because Dashboard still called `api.getProducts()`.
2. Additional RED command: `node --test test/catalogVisibility.test.js`
   - Failed as expected after adding the recursive-count assertion because Dashboard only used `categories.length`.
3. GREEN command: `node --test test/catalogVisibility.test.js`
   - Passed 5/5 after switching Dashboard and Translations to authenticated catalog sources and adding the recursive count.

## Third review follow-up

- Added `src/utils/categoryTree.js` with `flattenCategoryTree` and applied it before `Translations.vue` assigns the authenticated admin tree to its flat category-select data.
- Replaced the brittle source-regex test with a behavior test that flattens a nested admin tree and verifies that a disabled child and its enabled grandchild are both retained.

### Follow-up TDD and verification

1. RED command: `node --test test/catalogVisibility.test.js`
   - Failed as expected because `src/utils/categoryTree.js` did not exist.
2. GREEN command: `node --test test/catalogVisibility.test.js`
   - Passed 5/5 after adding the recursive flattening helper and using it in Translations.
