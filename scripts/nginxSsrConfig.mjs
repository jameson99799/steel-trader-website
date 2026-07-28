import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const legacySpaLocationPattern =
  /(^[ \t]*)# Frontend \(Vue SPA\)\r?\n\1location \/ \{\r?\n\1[ \t]+root [^;\r\n]+\/dist;\r?\n\1[ \t]+index index\.html;\r?\n\1[ \t]+try_files \\?\$uri \\?\$uri\/ \/index\.html;\r?\n\1\}/m

function assertPort(port) {
  const parsed = Number(port)
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`Invalid Node port: ${port}`)
  }
  return parsed
}

export function migrateLegacySpaLocation(source, port) {
  const nodePort = assertPort(port)
  const match = String(source).match(legacySpaLocationPattern)
  if (!match) {
    return { changed: false, content: String(source) }
  }

  const indent = match[1]
  const inner = `${indent}    `
  const replacement = [
    `${indent}# Public HTML and sitemap routes are rendered by Node for SEO/GEO.`,
    `${indent}location / {`,
    `${inner}proxy_pass http://127.0.0.1:${nodePort};`,
    `${inner}proxy_http_version 1.1;`,
    `${inner}proxy_set_header Connection "";`,
    `${inner}proxy_set_header Host $host;`,
    `${inner}proxy_set_header X-Real-IP $remote_addr;`,
    `${inner}proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`,
    `${inner}proxy_set_header X-Forwarded-Proto $scheme;`,
    `${inner}proxy_connect_timeout 30s;`,
    `${inner}proxy_read_timeout 300s;`,
    `${indent}}`
  ].join(source.includes('\r\n') ? '\r\n' : '\n')

  return {
    changed: true,
    content: String(source).replace(legacySpaLocationPattern, () => replacement)
  }
}

function readOption(name) {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

function runCli() {
  const inputPath = readOption('--input')
  const outputPath = readOption('--output')
  const port = readOption('--port') || '3001'
  if (!inputPath || !outputPath) {
    throw new Error('Usage: node scripts/nginxSsrConfig.mjs --input <path> --output <path> [--port 3001]')
  }

  const result = migrateLegacySpaLocation(readFileSync(inputPath, 'utf8'), port)
  writeFileSync(outputPath, result.content, 'utf8')
  process.stdout.write(`${JSON.stringify({ changed: result.changed, output: outputPath })}\n`)
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    runCli()
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
