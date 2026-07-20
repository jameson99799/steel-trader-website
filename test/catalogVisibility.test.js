import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { getVisibleCategoryIds, buildPublicCategoryTree, visibleProductWhere } from '../server/services/catalogVisibility.js'
import { buildAdminCategoryTree } from '../server/routes/categories.js'

const rows = [
  { id: 1, parent_id: 0, is_enabled: 1 },
  { id: 2, parent_id: 1, is_enabled: 0 },
  { id: 3, parent_id: 2, is_enabled: 1 },
  { id: 4, parent_id: 1, is_enabled: 1 }
]

test('disabled parents hide descendants without changing child state', () => {
  assert.deepEqual([...getVisibleCategoryIds(rows)], [1, 4])
})

test('public tree prunes hidden and empty branches', () => {
  assert.deepEqual(buildPublicCategoryTree(rows, new Map([[4, 2]])), [
    { id: 1, parent_id: 0, is_enabled: 1, product_count: 0, children: [
      { id: 4, parent_id: 1, is_enabled: 1, product_count: 2, children: [] }
    ] }
  ])
})

test('no visible categories cannot expose products', () => {
  assert.deepEqual(visibleProductWhere('p', new Set()), { clause: ' AND 1=0', params: [] })
})

test('public categories are pruned while the admin tree retains disabled records', () => {
  assert.deepEqual(buildPublicCategoryTree(rows, new Map([[4, 2]])), [
    { id: 1, parent_id: 0, is_enabled: 1, product_count: 0, children: [
      { id: 4, parent_id: 1, is_enabled: 1, product_count: 2, children: [] }
    ] }
  ])
  assert.deepEqual(buildAdminCategoryTree(rows), [
    { id: 1, parent_id: 0, is_enabled: 1, children: [
      { id: 2, parent_id: 1, is_enabled: 0, children: [
        { id: 3, parent_id: 2, is_enabled: 1, children: [] }
      ] },
      { id: 4, parent_id: 1, is_enabled: 1, children: [] }
    ] }
  ])
})

test('admin dashboard and translation views use complete authenticated catalog sources', async () => {
  const [dashboard, translations] = await Promise.all([
    readFile(new URL('../src/views/admin/Dashboard.vue', import.meta.url), 'utf8'),
    readFile(new URL('../src/views/admin/Translations.vue', import.meta.url), 'utf8')
  ])
  assert.match(dashboard, /api\.getAdminProducts\(/)
  assert.match(dashboard, /api\.getAdminCategoryTree\(/)
  assert.match(dashboard, /countCategoryTree\(categories\)/)
  assert.match(translations, /api\.getAdminCategoryTree\(/)
})
