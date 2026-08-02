import crypto from 'crypto'
import { normalizeEmail } from './mailerPolicy.js'

const DEFAULT_SITE_URL = 'https://www.sunseasteel.com'

function activeSecret(explicitSecret) {
  const value = explicitSecret || process.env.UNSUBSCRIBE_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'local-unsubscribe-secret-not-for-production-2026')
  if (!value || value.length < 32) throw new Error('UNSUBSCRIBE_SECRET must contain at least 32 characters')
  return value
}

export function createUnsubscribeToken(email, secret) {
  const normalized = normalizeEmail(email)
  if (!normalized || !normalized.includes('@')) throw new Error('A valid email address is required')
  const payload = Buffer.from(JSON.stringify({ email: normalized }), 'utf8').toString('base64url')
  const signature = crypto.createHmac('sha256', activeSecret(secret)).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

export function verifyUnsubscribeToken(token, secret) {
  try {
    const [payload, signature, extra] = String(token || '').split('.')
    if (!payload || !signature || extra) return ''
    const expected = crypto.createHmac('sha256', activeSecret(secret)).update(payload).digest()
    const actual = Buffer.from(signature, 'base64url')
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return ''
    return normalizeEmail(JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')).email)
  } catch (_) { return '' }
}

export function applyUnsubscribe(message, email, secret, siteUrl = DEFAULT_SITE_URL) {
  const token = createUnsubscribeToken(email, secret)
  const unsubscribeUrl = `${siteUrl.replace(/\/$/, '')}/api/unsubscribe?token=${encodeURIComponent(token)}`
  const footer = `<p style="margin-top:24px;color:#64748b;font-size:12px;line-height:1.5">You are receiving this business email from SunSea Steel. <a href="${unsubscribeUrl}">Unsubscribe</a> from future marketing emails.</p>`
  return {
    ...message,
    html: `${message.html || ''}${footer}`,
    headers: {
      ...(message.headers || {}),
      'List-Unsubscribe': `<${unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
    }
  }
}
