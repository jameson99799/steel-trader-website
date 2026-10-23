const IMG_TAG_RE = /<img\b[^>]*>/gi
const SRC_RE = /\bsrc=(["'])([^"']+)\1/i

export function sizeContentImages(html, width = 1000) {
  if (!html || !width) return html || ''

  return String(html).replace(IMG_TAG_RE, tag => {
    const match = tag.match(SRC_RE)
    if (!match) return tag

    const quote = match[1]
    const src = match[2]
    const isUpload = src.startsWith('/uploads/') || /^https?:\/\/www\.sunseasteel\.com\/uploads\//i.test(src)
    if (!isUpload || /[?&]w=\d+/.test(src)) return tag

    const separator = src.includes('?') ? '&' : '?'
    const sized = `${src}${separator}w=${width}&v=2`
    return tag.replace(match[0], `src=${quote}${sized}${quote}`)
  })
}
