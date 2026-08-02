import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

export function loadEnvFile(filePath = path.join(projectRoot, '.env'), env = process.env) {
  if (!fs.existsSync(filePath)) return
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const separator = line.indexOf('=')
    if (separator < 1) continue
    const key = line.slice(0, separator).trim()
    let value = line.slice(separator + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (env[key] === undefined) env[key] = value
  }
}

loadEnvFile()

const insecureDefaults = new Set([
  'led-trade-secret-key-2024',
  'crm-steel-secret-2024',
  'your-secret-key-change-this-in-production'
])

function resolveSecret(name, developmentFallback, env, nodeEnv) {
  const value = env[name] || (nodeEnv === 'production' ? '' : developmentFallback)
  if (nodeEnv === 'production' && (!value || value.length < 32 || insecureDefaults.has(value))) {
    throw new Error(`${name} must be configured with at least 32 random characters in production`)
  }
  return value
}

export function getJwtSecrets(env = process.env, nodeEnv = env.NODE_ENV || 'development') {
  return {
    jwtSecret: resolveSecret('JWT_SECRET', 'local-admin-jwt-secret-not-for-production-2026', env, nodeEnv),
    crmSecret: resolveSecret('CRM_JWT_SECRET', 'local-crm-jwt-secret-not-for-production-2026', env, nodeEnv)
  }
}

export function maskSecret(value) {
  const text = String(value || '')
  if (!text) return ''
  if (text.length <= 8) return '********'
  return `${text.slice(0, 4)}****${text.slice(-4)}`
}

export function sanitizeTranslationSettings(row) {
  if (!row) return {}
  const { api_key, ...safe } = row
  return { ...safe, api_key_display: maskSecret(api_key), api_key_configured: Boolean(api_key) }
}

export function sanitizeAIChannel(row) {
  if (!row) return row
  const { api_key, ...safe } = row
  let models = []
  try { models = Array.isArray(row.models) ? row.models : JSON.parse(row.models || '[]') } catch (_) {}
  return { ...safe, models, api_key_display: maskSecret(api_key), api_key_configured: Boolean(api_key) }
}

export function sanitizeSmtpAccount(row) {
  if (!row) return row
  const { smtp_pass, ...safe } = row
  return { ...safe, smtp_pass_display: smtp_pass ? '********' : '', smtp_pass_configured: Boolean(smtp_pass) }
}

export const { jwtSecret: JWT_SECRET, crmSecret: CRM_SECRET } = getJwtSecrets()
