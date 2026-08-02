import { existsSync, readFileSync } from 'node:fs'
import { isAbsolute, relative, resolve } from 'node:path'

function readArgument(name, fallback) {
  const index = process.argv.indexOf(name)
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback
}

function fail(message) {
  console.error(message)
  process.exitCode = 1
}

const distDir = resolve(readArgument('--dist', 'dist'))
const indexPath = resolve(distDir, 'index.html')

if (!existsSync(indexPath)) {
  fail(`Missing build entry: ${indexPath}`)
} else {
  const html = readFileSync(indexPath, 'utf8')
  const references = [...html.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)]
    .map((match) => match[1].trim())
    .filter((value) => value && !/^(?:[a-z]+:|\/\/|#|data:)/i.test(value))
    .map((value) => value.split(/[?#]/, 1)[0])

  const missing = []
  const checked = new Set()

  for (const reference of references) {
    let decoded
    try {
      decoded = decodeURIComponent(reference)
    } catch {
      missing.push(`${reference} (invalid URL encoding)`)
      continue
    }

    const normalized = decoded.replace(/^[/\\]+/, '')
    const assetPath = resolve(distDir, normalized)
    const relativePath = relative(distDir, assetPath)

    if (isAbsolute(relativePath) || relativePath.startsWith('..')) {
      missing.push(`${reference} (outside dist)`)
      continue
    }

    checked.add(relativePath)
    if (!existsSync(assetPath)) missing.push(reference)
  }

  const hasEntryScript = references.some((value) => /(?:^|\/)assets\/[^/?#]+\.js(?:[?#]|$)/i.test(value))
  if (!hasEntryScript) missing.push('JavaScript entry asset')

  if (missing.length > 0) {
    for (const item of missing) console.error(`Missing build asset: ${item}`)
    process.exitCode = 1
  } else {
    console.log(`Build assets verified: ${checked.size} local files referenced by ${indexPath}`)
  }
}
