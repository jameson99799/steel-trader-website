export function getVisibleCategoryIds(categories) {
  const byId = new Map(categories.map(category => [category.id, category]))
  const visibility = new Map()

  const isVisible = (id, visiting = new Set()) => {
    if (visibility.has(id)) return visibility.get(id)
    const category = byId.get(id)
    if (!category || Number(category.is_enabled) === 0 || visiting.has(id)) {
      visibility.set(id, false)
      return false
    }

    const parentId = category.parent_id
    if (parentId === null || parentId === undefined || Number(parentId) === 0) {
      visibility.set(id, true)
      return true
    }

    const nextVisiting = new Set(visiting)
    nextVisiting.add(id)
    const result = isVisible(parentId, nextVisiting)
    visibility.set(id, result)
    return result
  }

  return new Set(categories.filter(category => isVisible(category.id)).map(category => category.id))
}

export function buildPublicCategoryTree(categories, productCounts) {
  const visibleIds = getVisibleCategoryIds(categories)
  const byParent = new Map()

  for (const category of categories) {
    if (!visibleIds.has(category.id)) continue
    const parentId = Number(category.parent_id || 0)
    const siblings = byParent.get(parentId) || []
    siblings.push(category)
    byParent.set(parentId, siblings)
  }

  const buildBranch = parentId => (byParent.get(parentId) || [])
    .map(category => {
      const children = buildBranch(category.id)
      const product_count = productCounts.get(category.id) || 0
      if (!product_count && !children.length) return null
      return { ...category, product_count, children }
    })
    .filter(Boolean)

  return buildBranch(0)
}

export function visibleProductWhere(alias, ids) {
  const categoryIds = [...ids]
  if (!categoryIds.length) return { clause: ' AND 1=0', params: [] }
  return {
    clause: ` AND ${alias}.category_id IN (${categoryIds.map(() => '?').join(', ')})`,
    params: categoryIds
  }
}
