const blockedTags = /<\/?(?:script|iframe|object|embed|form|input|button|textarea|select|option|base|meta|link|svg|math)[^>]*>/gi
const blockedTagBlocks = /<(?:script|iframe|object|embed|form|button|textarea|select|svg|math)\b[^>]*>[\s\S]*?<\/(?:script|iframe|object|embed|form|button|textarea|select|svg|math)>/gi
const eventHandlers = /(?:\s|\/)+on[a-z0-9_-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi
const srcdocAttribute = /\s+srcdoc\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi
const urlAttributes = /\b(href|src|xlink:href|formaction)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi

function decodeCodePoint(raw, radix) {
  const codePoint = Number.parseInt(raw, radix)
  return Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
    ? String.fromCodePoint(codePoint)
    : ''
}

function isUnsafeUrl(value) {
  const decoded = String(value || '')
    .replace(/&#x([0-9a-f]+);?/gi, (_, code) => decodeCodePoint(code, 16))
    .replace(/&#([0-9]+);?/g, (_, code) => decodeCodePoint(code, 10))
    .replace(/&(colon|tab|newline);?/gi, (_, name) => ({ colon: ':', tab: '\t', newline: '\n' })[name.toLowerCase()])
  const normalized = decoded.replace(/[\u0000-\u0020\u007f\s]+/g, '').toLowerCase()
  return /^(?:javascript|vbscript):/.test(normalized) || /^data:(?:text\/html|application\/xhtml\+xml|image\/svg\+xml)/.test(normalized)
}

export function sanitizeRichHtml(value) {
  let html = String(value || '')
  html = html.replace(blockedTagBlocks, '')
  html = html.replace(blockedTags, '')
  html = html.replace(eventHandlers, '')
  html = html.replace(srcdocAttribute, '')
  html = html.replace(urlAttributes, (match, name, quoted, doubleValue, singleValue, bareValue) => {
    const value = doubleValue ?? singleValue ?? bareValue ?? ''
    return isUnsafeUrl(value) ? `${name}="#"` : match
  })
  html = html.replace(/@import\s+[^;]+;?/gi, '')
  html = html.replace(/expression\s*\([^)]*\)/gi, '')
  html = html.replace(/url\s*\(\s*(['"]?)\s*(?:javascript|vbscript):[^)]*\)/gi, 'url("")')
  return html
}

export default sanitizeRichHtml
