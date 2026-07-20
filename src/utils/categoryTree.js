export function flattenCategoryTree(categories) {
  const flattened = []
  const visit = nodes => {
    nodes.forEach(category => {
      flattened.push(category)
      visit(category.children || [])
    })
  }
  visit(categories || [])
  return flattened
}
