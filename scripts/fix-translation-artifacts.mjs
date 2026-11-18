#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Translation artifact cleanup (AI code-fence debris).
//
// Some AI providers wrap translations in markdown code fences or leave stray
// backtick fragments. When stored raw, that debris renders as visible code in
// the site footer / labels (reported on /hi/ and /ru/ footers).
//
// Usage (on the server, from the project root):
//   node scripts/fix-translation-artifacts.mjs          # report only (dry run)
//   node scripts/fix-translation-artifacts.mjs --fix    # clean the rows in place
//
// Only leading/trailing fence debris is touched (see cleanTranslationText) —
// legitimate inline code spans inside the text are preserved.
// ─────────────────────────────────────────────────────────────────────────────
import { initDb, getAll, run } from '../server/db.js'
import { cleanTranslationText, hasTranslationArtifacts } from '../server/utils/cleanTranslationText.js'

const shouldFix = process.argv.includes('--fix')

await initDb()

const rows = getAll(`
  SELECT id, language_code, content_type, content_id, content_field, translated_text
  FROM translations
  WHERE translated_text LIKE ${"'%" + '`' + "%'"}
`)

const affected = []
for (const row of rows) {
  if (!hasTranslationArtifacts(row.translated_text)) continue
  affected.push(row)
}

if (!affected.length) {
  console.log('No translation rows with code-fence artifacts found.')
  process.exit(0)
}

console.log(`Found ${affected.length} translation row(s) with fence/backtick artifacts:\n`)
for (const row of affected) {
  const preview = String(row.translated_text).replace(/\s+/g, ' ').slice(0, 90)
  console.log(`  #${row.id} [${row.language_code}] ${row.content_type}:${row.content_id}:${row.content_field}`)
  console.log(`     before: ${preview}`)
  if (shouldFix) {
    const cleaned = cleanTranslationText(row.translated_text)
    run('UPDATE translations SET translated_text = ? WHERE id = ?', [cleaned, row.id])
    console.log(`     after : ${cleaned.replace(/\s+/g, ' ').slice(0, 90)}`)
  }
}

console.log(shouldFix
  ? `\nFixed ${affected.length} row(s). Server caches translations for 5s — restart or wait before re-checking pages.`
  : '\nDry run — re-run with --fix to clean these rows in place.')
