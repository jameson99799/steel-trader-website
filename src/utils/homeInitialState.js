export function canReuseHomeInitialState(initialState, currentLang) {
  return initialState?.lang === currentLang &&
    Boolean(initialState.hero?.id) &&
    Array.isArray(initialState.featuredProducts) &&
    Array.isArray(initialState.categories) &&
    Boolean(initialState.pageTexts?.id) &&
    Boolean(initialState.company?.id)
}

export function createLatestOnlyCommit() {
  let latestVersion = 0

  return {
    begin() {
      latestVersion += 1
      return latestVersion
    },
    isLatest(version) {
      return version === latestVersion
    }
  }
}

export function normalizeLocalizedRefreshResults(results) {
  const [heroResult, productsResult, categoriesResult, pageTextsResult, companyResult] = results
  const groups = [
    ['hero', heroResult],
    ['featured products', productsResult],
    ['categories', categoriesResult],
    ['page texts', pageTextsResult],
    ['company', companyResult]
  ]
  const errors = groups
    .filter(([, result]) => result.status === 'rejected')
    .map(([group, result]) => ({ group, error: result.reason }))

  return {
    hero: heroResult?.status === 'fulfilled' ? heroResult.value || {} : {},
    featuredProducts: productsResult?.status === 'fulfilled' && Array.isArray(productsResult.value?.data)
      ? productsResult.value.data
      : [],
    categories: categoriesResult?.status === 'fulfilled' && Array.isArray(categoriesResult.value)
      ? categoriesResult.value.slice(0, 6)
      : [],
    pageTexts: pageTextsResult?.status === 'fulfilled' ? pageTextsResult.value || {} : {},
    company: companyResult?.status === 'fulfilled' ? companyResult.value || {} : {},
    errors
  }
}
