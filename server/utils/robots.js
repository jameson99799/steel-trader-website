const API_ALLOW_RE = /^\s*Allow:\s*\/api\/?\s*$/im
const API_DISALLOW_RE = /^\s*Disallow:\s*\/api\/?\s*$/im
const CRM_DISALLOW_RE = /^\s*Disallow:\s*\/crm\/?\s*$/im
const ADMIN_DISALLOW_RE = /^\s*Disallow:\s*\/admin\/?\s*$/im
const AGENT_RE = /^\s*User-agent:\s*\*\s*$/im

function insertRule(text, line) {
  for (const anchor of [ADMIN_DISALLOW_RE, CRM_DISALLOW_RE, AGENT_RE]) {
    if (anchor.test(text)) {
      return text.replace(anchor, match => `${match}\n${line}`)
    }
  }
  return `${text.trimEnd()}\n${line}`
}

export function normalizeRobotsTxt(input) {
  let text = String(input || '').replace(/\r\n/g, '\n')
  if (!text.trim()) return text

  text = text.replace(API_ALLOW_RE, 'Disallow: /api/')
  if (!CRM_DISALLOW_RE.test(text)) {
    text = insertRule(text, 'Disallow: /crm/')
  }
  if (!API_DISALLOW_RE.test(text)) {
    text = insertRule(text, 'Disallow: /api/')
  }
  return text
}
