// Fields that must NEVER be exposed to the public (SSR __INITIAL_STATE__ or /api/seo)
const SENSITIVE_SEO_FIELDS = [
  'service_account_json',
  'oauth_client_secret',
  'oauth_refresh_token',
  'oauth_client_id'
]

export function stripSeoSecrets(seo = {}) {
  if (!seo || typeof seo !== 'object') return seo || {}
  const safe = { ...seo }
  for (const field of SENSITIVE_SEO_FIELDS) {
    if (field in safe) delete safe[field]
  }
  return safe
}