#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Product review spam audit (Google review-spam policy compliance)
//
// Detects and optionally hides "templated" reviews — the pattern flagged by
// the site SEO audit: many reviews whose title or body embeds the full product
// name / SEO title keyword verbatim, duplicate review bodies posted under
// different author names, and evenly spaced (bot-like) publish intervals.
//
// Usage (on the server, from the project root):
//   node scripts/audit-product-reviews.mjs           # report only (dry run)
//   node scripts/audit-product-reviews.mjs --hide    # hide flagged reviews
//   node scripts/audit-product-reviews.mjs --hide --delete-ids 12,13
//
// Hidden reviews stay in the admin panel (status='hidden') so genuine feedback
// can be re-published after manual cleanup; they never reach the public page
// or the Product JSON-LD aggregateRating.
// ─────────────────────────────────────────────────────────────────────────────
import { initDb, getAll, getOne, run } from '../server/db.js'
import { findTemplatedReviewPattern } from '../server/services/productReviews.js'

const args = process.argv.slice(2)
const shouldHide = args.includes('--hide')
const deleteIdsArg = args.find(a => a.startsWith('--delete-ids'))
const deleteIds = deleteIdsArg
  ? deleteIdsArg.split('=')[1].split(',').map(Number).filter(Number.isFinite)
  : []

const MIN_TITLE_LENGTH = 20 // don't false-positive on short product names

await initDb()

const products = getAll('SELECT id, name, name_en, seo_title, slug FROM products WHERE status = 1')
const report = []
let hiddenCount = 0

for (const product of products) {
  const reviews = getAll(
    `SELECT id, author_name, review_title, review_text, review_date, rating, source
     FROM product_reviews WHERE product_id = ? AND status IN ('published','pending')`,
    [product.id]
  )
  if (!reviews.length) continue

  const flagged = new Map() // id -> reasons[]
  const textSeen = new Map() // normalized body -> [ids]

  for (const r of reviews) {
    const reasons = []
    const pattern = findTemplatedReviewPattern(r, product)
    if (pattern) reasons.push(`keyword stuffing (${pattern.reason})`)

    const norm = String(r.review_text || '').toLowerCase().replace(/\s+/g, ' ').trim()
    if (norm.length >= 30) {
      if (!textSeen.has(norm)) textSeen.set(norm, [])
      textSeen.get(norm).push(r.id)
    }
    if (reasons.length) flagged.set(r.id, reasons)
  }

  // Duplicate bodies across different authors
  for (const [, ids] of textSeen) {
    if (ids.length > 1) {
      for (const id of ids) {
        if (!flagged.has(id)) flagged.set(id, [])
        flagged.get(id).push('duplicate review body shared with another review')
      }
    }
  }

  // Evenly spaced dates (bot-like publishing cadence)
  const dated = reviews
    .filter(r => /^\d{4}-\d{2}-\d{2}$/.test(String(r.review_date || '')))
    .sort((a, b) => String(a.review_date).localeCompare(String(b.review_date)))
  if (dated.length >= 5) {
    const gaps = []
    for (let i = 1; i < dated.length; i++) {
      gaps.push(Math.round((new Date(dated[i].review_date) - new Date(dated[i - 1].review_date)) / 86400000))
    }
    const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length
    const uniform = gaps.every(g => Math.abs(g - avg) <= Math.max(2, avg * 0.15))
    if (uniform && avg > 0) {
      for (const r of dated) {
        if (!flagged.has(r.id)) flagged.set(r.id, [])
        flagged.get(r.id).push(`uniform ~${Math.round(avg)}-day publish interval across ${dated.length} reviews`)
      }
    }
  }

  if (flagged.size) {
    report.push({ product: product.name_en || product.name, slug: product.slug, flagged: [...flagged.entries()] })
    if (shouldHide) {
      for (const [id] of flagged) {
        run(`UPDATE product_reviews SET status = 'hidden', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [id])
        hiddenCount++
      }
    }
  }
}

for (const entry of report) {
  console.log(`\n=== ${entry.product} (${entry.slug}) — ${entry.flagged.length} flagged ===`)
  for (const [id, reasons] of entry.flagged) {
    console.log(`  review #${id}: ${reasons.join('; ')}`)
  }
}

if (deleteIds.length) {
  for (const id of deleteIds) {
    const existing = getOne('SELECT id FROM product_reviews WHERE id = ?', [id])
    if (existing) {
      run('DELETE FROM product_review_translations WHERE review_id = ?', [id])
      run('DELETE FROM product_reviews WHERE id = ?', [id])
      console.log(`Deleted review #${id}`)
    }
  }
}

console.log(`\nSummary: ${report.reduce((n, r) => n + r.flagged.length, 0)} flagged review(s) across ${report.length} product(s).`)
console.log(shouldHide ? `Hidden: ${hiddenCount} review(s).` : 'Dry run — re-run with --hide to set flagged reviews to hidden.')
console.log('Review changes invalidate the SEO render cache automatically via listPublic; restart the server or clear the seo_render_cache table if pages are cached.')
