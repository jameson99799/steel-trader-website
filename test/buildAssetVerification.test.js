import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

function withBuildFixture(callback) {
  const root = mkdtempSync(join(tmpdir(), 'steel-build-assets-'))
  try {
    mkdirSync(join(root, 'assets'))
    callback(root)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

function runVerifier(root) {
  return execFileSync(process.execPath, ['scripts/verifyBuildAssets.mjs', '--dist', root], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  })
}

test('build asset verifier accepts an index whose local entry assets exist', () => {
  withBuildFixture((root) => {
    writeFileSync(join(root, 'index.html'), '<link rel="stylesheet" href="/assets/index.css"><script type="module" src="/assets/index.js"></script>')
    writeFileSync(join(root, 'assets', 'index.css'), 'body{}')
    writeFileSync(join(root, 'assets', 'index.js'), 'export {}')

    assert.match(runVerifier(root), /Build assets verified/)
  })
})

test('build asset verifier rejects an index with a missing local asset', () => {
  withBuildFixture((root) => {
    writeFileSync(join(root, 'index.html'), '<script type="module" src="/assets/missing.js"></script>')

    assert.throws(
      () => runVerifier(root),
      (error) => error?.status === 1 && /Missing build asset/.test(error?.stderr || '')
    )
  })
})
