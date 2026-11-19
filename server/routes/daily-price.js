import { Router } from 'express'
import { getAll, getOne, run } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import { createDailyPriceStore, normalizePriceDate } from '../services/dailyPrice.js'
import { loadTranslationsForLang } from '../helpers/translate.js'

const store = createDailyPriceStore({ getAll, getOne, run })

// Content fields of a published price sheet that carry translatable text
// (the table numbers/specs stay language-neutral; MT/USD/AFP are protected
// by the translation prompt).
const TRANSLATED_FIELDS = ['gi_product_name', 'gl_product_name', 'trade_terms', 'payment_term', 'price_validity']

// Apply the AI/admin translations for this entry (translations table:
// content_type='daily_price', content_id=<entry id>) as <field>_<lang> keys;
// display falls back to the base (English) text when a translation is missing.
function applyEntryTranslation(entry, lang) {
  if (!entry || !lang || lang === 'en') return entry
  try {
    const tMap = loadTranslationsForLang(lang)
    const t = tMap?.[`daily_price_${entry.id}`]
    if (t) {
      for (const field of TRANSLATED_FIELDS) {
        if (t[field]) entry[`${field}_${lang}`] = t[field]
      }
    }
  } catch (e) { /* translations table may be unavailable — serve base text */ }
  return entry
}

const router = Router()

// Public: latest published price board
router.get('/latest', (req, res) => {
  try {
    res.json(applyEntryTranslation(store.getLatest(), req.query.lang))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Public: all published dates (history dropdown)
router.get('/dates', (req, res) => {
  try {
    res.json(store.listDates())
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Public: one specific date from history
router.get('/date/:date', (req, res) => {
  try {
    const entry = store.getByDate(req.params.date)
    if (!entry) return res.status(404).json({ error: 'No price published for this date' })
    res.json(applyEntryTranslation(entry, req.query.lang))
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

// Admin: every entry with full data (history manager)
router.get('/admin', authMiddleware, (req, res) => {
  try {
    const dates = store.listDates()
    const entries = dates.map(d => store.getByDate(d.publish_date)).filter(Boolean)
    res.json(entries)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Admin: save (publish) an entry — upserts by publish_date
router.post('/admin', authMiddleware, (req, res) => {
  try {
    res.json(store.save(req.body || {}))
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

// Admin: delete a history entry
router.delete('/admin/:date', authMiddleware, (req, res) => {
  try {
    const removed = store.remove(req.params.date)
    if (!removed) return res.status(404).json({ error: 'No price published for this date' })
    res.json({ success: true })
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

// Validate a date string without touching the DB (admin date picker helper)
router.get('/validate-date/:date', (req, res) => {
  try {
    res.json({ valid: true, date: normalizePriceDate(req.params.date) })
  } catch (e) {
    res.status(400).json({ valid: false, error: e.message })
  }
})

export default router
