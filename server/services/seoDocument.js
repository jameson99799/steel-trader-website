export const publicHtmlCacheControl =
  'public, max-age=0, must-revalidate, s-maxage=300, stale-while-revalidate=60'

export function getSeoResponsePolicy({ isPrivateRoute, isNotFound }) {
  if (isPrivateRoute) {
    return { cacheControl: 'no-store', robots: 'noindex, nofollow' }
  }
  if (isNotFound) {
    return { cacheControl: 'no-store', robots: 'noindex, follow' }
  }
  return { cacheControl: publicHtmlCacheControl, robots: 'index, follow' }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function removeManagedHeadTags(html) {
  return html
    .replace(
      /<meta\b[^>]*(?:\bname=["'](?:description|keywords|robots|twitter:[^"']+)["']|\bproperty=["']og:[^"']+["']|\bhttp-equiv=["'](?:cache-control|pragma|expires)["'])[^>]*>\s*/gi,
      ''
    )
    .replace(
      /<link\b[^>]*\brel=["'](?:canonical|alternate)["'][^>]*>\s*/gi,
      ''
    )
    .replace(
      /<script\b[^>]*\btype=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>\s*/gi,
      ''
    )
    .replace(
      /<script\b[^>]*>\s*window\.__INITIAL_STATE__\s*=[\s\S]*?<\/script>\s*/gi,
      ''
    )
}

function replaceTitle(html, title) {
  const tag = `<title>${escapeHtml(title)}</title>`
  if (/<title\b[^>]*>[\s\S]*?<\/title>/i.test(html)) {
    return html.replace(/<title\b[^>]*>[\s\S]*?<\/title>/i, tag)
  }
  return html.replace('</head>', `  ${tag}\n</head>`)
}

function replaceDocumentLanguage(html, lang) {
  const escapedLang = escapeHtml(lang)
  if (/<html\b[^>]*\blang=["'][^"']*["']/i.test(html)) {
    return html.replace(
      /<html\b([^>]*?)\blang=["'][^"']*["']([^>]*)>/i,
      `<html$1lang="${escapedLang}"$2>`
    )
  }
  return html.replace(/<html\b([^>]*)>/i, `<html lang="${escapedLang}"$1>`)
}

export function renderSeoDocument({
  html,
  lang,
  title,
  description,
  keywords,
  canonical,
  robots,
  metaHtml = '',
  schemaHtml = '',
  stateHtml = ''
}) {
  let output = replaceDocumentLanguage(String(html ?? ''), lang)
  output = replaceTitle(output, title)
  output = removeManagedHeadTags(output)

  const managedHead = [
    `<meta name="description" content="${escapeHtml(description)}">`,
    `<meta name="keywords" content="${escapeHtml(keywords)}">`,
    `<meta name="robots" content="${escapeHtml(robots)}">`,
    canonical ? `<link rel="canonical" href="${escapeHtml(canonical)}">` : '',
    metaHtml,
    schemaHtml,
    stateHtml
  ].filter(Boolean).join('\n  ')

  return output.replace('</head>', `  ${managedHead}\n</head>`)
}

export function renderSeoErrorPage() {
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8">',
    '  <meta name="robots" content="noindex, nofollow">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1">',
    '  <title>Server Error</title>',
    '</head>',
    '<body><main><h1>Server Error</h1><p>Please try again later.</p></main></body>',
    '</html>'
  ].join('\n')
}
