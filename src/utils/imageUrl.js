const IMAGE_VERSION = '2'

export function imageUrl(url, width) {
  if (!url || !width) return url || ''
  if (/^(data|blob):/i.test(url)) return url
  if (/[?&]w=\d+/.test(url)) return url

  const separator = url.includes('?') ? '&' : '?'
  const version = /[?&]v=/.test(url) ? '' : `&v=${IMAGE_VERSION}`
  return `${url}${separator}w=${width}${version}`
}
