import { Router } from 'express'
import { getAll, getOne, run } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import {
    SEO_PAGE_KEYS,
    SUPPORTED_SEO_LANGS,
    getBuiltInSeoCopyRows
} from '../services/seoContent.js'
import { getLanguageSeoReadiness } from '../services/languageSeoReadiness.js'
import { generateLanguageSeoCopy } from '../services/languageSeoCopyGenerator.js'

const router = Router()
export const PRIMARY_ALWAYS_READY = new Set(['en', 'zh'])
const SEO_COPY_KEYS = new Set(SEO_PAGE_KEYS)

function getHomeSeoDefaults(code) {
    try {
        const row = getOne(
            `SELECT
                MAX(CASE WHEN content_field = 'seo_title' THEN translated_text END) AS title,
                MAX(CASE WHEN content_field = 'seo_description' THEN translated_text END) AS description
             FROM translations
             WHERE language_code = ? AND content_type = 'home_seo' AND content_id = 1`,
            [code]
        )
        return { title: row?.title || '', description: row?.description || '' }
    } catch {
        return { title: '', description: '' }
    }
}

export function getSeoCopyRows(code) {
    const stored = getAll(
        'SELECT page_key, title, description, is_manual FROM language_seo_copy WHERE language_code = ?',
        [code]
    )
    const storedByKey = new Map(stored.map(row => [row.page_key, row]))
    const builtIn = SUPPORTED_SEO_LANGS.includes(code) ? getBuiltInSeoCopyRows(code) : []
    const builtInByKey = new Map(builtIn.map(row => [row.page_key, row]))
    const homeDefaults = getHomeSeoDefaults(code)

    return SEO_PAGE_KEYS.map(pageKey => {
        const storedRow = storedByKey.get(pageKey)
        const fallback = pageKey === 'home' ? homeDefaults : builtInByKey.get(pageKey)
        return {
            page_key: pageKey,
            title: storedRow?.title || fallback?.title || '',
            description: storedRow?.description || fallback?.description || '',
            is_manual: storedRow?.is_manual ? 1 : 0
        }
    })
}

export function getReadinessError(language) {
    if (PRIMARY_ALWAYS_READY.has(language.code)) return null
    const readiness = getLanguageSeoReadiness(language.code)
    if (readiness.ready) return null

    const parts = []
    if (readiness.missingSeoCopy.length) parts.push(`SEO文案缺少: ${readiness.missingSeoCopy.join(', ')}`)
    if (readiness.missingUiTexts.length) parts.push(`UI译文缺少: ${readiness.missingUiTexts.join(', ')}`)
    if (readiness.missingCompanyFields.length) parts.push(`公司简介缺少: ${readiness.missingCompanyFields.join(', ')}`)
    if (readiness.missingPageTexts.length) parts.push(`页面文案缺少: ${readiness.missingPageTexts.join(', ')}`)
    return { ...readiness, error: parts.join('；') }
}

export function saveSeoCopyRows(code, inputRows) {
    const language = getOne('SELECT * FROM languages WHERE code = ?', [code])
    if (!language) return { status: 404, body: { error: 'not found' } }

    const incoming = new Map()
    for (const row of Array.isArray(inputRows) ? inputRows : []) {
        if (!row || !SEO_COPY_KEYS.has(row.page_key)) continue
        incoming.set(row.page_key, {
            title: String(row.title || '').trim(),
            description: String(row.description || '').trim()
        })
    }

    const merged = new Map(getSeoCopyRows(code).map(row => [row.page_key, row]))
    for (const [pageKey, row] of incoming) merged.set(pageKey, { page_key: pageKey, ...row })
    const missing = SEO_PAGE_KEYS.filter(pageKey => {
        const row = merged.get(pageKey)
        return !row || !String(row.title || '').trim() || !String(row.description || '').trim()
    })
    if (language.seo_index_ready && missing.length) {
        return {
            status: 400,
            body: {
                error: `SEO文案未完成，无法保存: ${missing.join(', ')}`,
                missingSeoCopy: missing
            }
        }
    }

    const upsert = 'INSERT INTO language_seo_copy (language_code, page_key, title, description, is_manual) VALUES (?, ?, ?, ?, 1) ' +
        'ON CONFLICT(language_code, page_key) DO UPDATE SET title = excluded.title, description = excluded.description, is_manual = 1, updated_at = CURRENT_TIMESTAMP'
    for (const [pageKey, row] of incoming) {
        run(upsert, [code, pageKey, row.title, row.description])
    }

    return {
        status: 200,
        body: { message: '保存成功', language_code: code, rows: getSeoCopyRows(code) }
    }
}

// GET all languages
router.get('/', (req, res) => {
    const all = getAll('SELECT * FROM languages ORDER BY sort_order ASC, id ASC')
    res.json(all)
})

// GET only enabled languages (used by frontend)
router.get('/active', (req, res) => {
    const active = getAll('SELECT * FROM languages WHERE status = 1 ORDER BY sort_order ASC, id ASC')
    res.json(active)
})

// GET localized SEO copy for one language (prefilled with built-in defaults)
router.get('/:code/seo-copy', (req, res) => {
    const language = getOne('SELECT * FROM languages WHERE code = ?', [req.params.code])
    if (!language) return res.status(404).json({ error: 'not found' })
    res.json({ language_code: language.code, rows: getSeoCopyRows(language.code) })
})

// POST create language
router.post('/', authMiddleware, (req, res) => {
    const { name, code, flag, sort_order, status } = req.body
    if (!name || !code) return res.status(400).json({ error: 'name and code are required' })
    const normalizedCode = String(code).toLowerCase()
    try {
        const result = run(
            'INSERT INTO languages (name, code, flag, sort_order, status, seo_index_ready) VALUES (?, ?, ?, ?, ?, ?)',
            [
                name,
                normalizedCode,
                flag || '',
                sort_order || 5,
                status ?? 1,
                PRIMARY_ALWAYS_READY.has(normalizedCode) ? 1 : 0
            ]
        )
        res.json({ id: result.lastInsertRowid, message: '添加成功' })
    } catch (e) {
        res.status(400).json({ error: e.message })
    }
})

// POST generate SEO copy for one language with the configured AI channel
router.post('/:code/seo-copy/generate', authMiddleware, async (req, res) => {
    try {
        const result = await generateLanguageSeoCopy(req.params.code)
        res.json({ message: 'SEO文案生成完成', ...result })
    } catch (e) {
        res.status(e.statusCode || 500).json({ error: e.message })
    }
})

// PUT localized SEO copy for one language
router.put('/:code/seo-copy', authMiddleware, (req, res) => {
    const result = saveSeoCopyRows(req.params.code, req.body?.rows)
    res.status(result.status).json(result.body)
})

// PUT update language
router.put('/:id', authMiddleware, (req, res) => {
    const current = getOne('SELECT * FROM languages WHERE id = ?', [req.params.id])
    if (!current) return res.status(404).json({ error: 'not found' })

    const isPrimary = PRIMARY_ALWAYS_READY.has(current.code)
    let nextReady = current.seo_index_ready ? 1 : 0
    if (isPrimary) {
        nextReady = 1
    } else if (req.body.seo_index_ready !== undefined) {
        nextReady = req.body.seo_index_ready ? 1 : 0
    }

    if (nextReady === 1 && !current.seo_index_ready) {
        const readinessError = getReadinessError(current)
        if (readinessError) {
            return res.status(400).json({
                error: `SEO收录未就绪: ${readinessError.error}`,
                missingSeoCopy: readinessError.missingSeoCopy,
                missingUiTexts: readinessError.missingUiTexts,
                missingCompanyFields: readinessError.missingCompanyFields,
                missingPageTexts: readinessError.missingPageTexts
            })
        }
    }

    const { name, flag, sort_order, status, ai_translated } = req.body
    run(
        'UPDATE languages SET name=?, flag=?, sort_order=?, status=?, ai_translated=?, seo_index_ready=? WHERE id=?',
        [
            name ?? current.name,
            flag ?? current.flag ?? '',
            sort_order ?? current.sort_order ?? 5,
            status ?? current.status ?? 1,
            ai_translated ?? current.ai_translated ?? 0,
            nextReady,
            req.params.id
        ]
    )
    res.json({ message: '更新成功' })
})

// DELETE language (cannot delete 'en')
router.delete('/:id', authMiddleware, (req, res) => {
    const lang = getOne('SELECT * FROM languages WHERE id = ?', [req.params.id])
    if (!lang) return res.status(404).json({ error: 'not found' })
    if (lang.code === 'en') return res.status(400).json({ error: 'cannot delete English language' })
    run('DELETE FROM languages WHERE id = ?', [req.params.id])
    run('DELETE FROM translations WHERE language_code = ?', [lang.code])
    run('DELETE FROM product_review_translations WHERE language_code = ?', [lang.code])
    run('DELETE FROM language_seo_copy WHERE language_code = ?', [lang.code])
    res.json({ message: '删除成功' })
})

export default router
