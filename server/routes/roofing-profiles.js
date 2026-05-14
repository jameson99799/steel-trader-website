import express from 'express'
import { run, getAll, getOne } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import { loadTranslationsForLang, translateRoofingProfile, translateRoofingCategory } from '../helpers/translate.js'

const router = express.Router()

// ==========================================
// CATEGORIES
// ==========================================

// GET all categories (public)
router.get('/categories/public', (req, res) => {
    try {
        const categories = getAll('SELECT * FROM roofing_categories WHERE is_active = 1 ORDER BY sort_order DESC, id ASC')
        
        // Inject translations if lang param is provided
        const lang = req.query.lang
        if (lang && lang !== 'en') {
            const tMap = loadTranslationsForLang(lang)
            if (tMap) categories.forEach(c => translateRoofingCategory(c, tMap, lang))
        }

        res.json(categories)
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// GET all categories (admin)
router.get('/categories', authMiddleware, (req, res) => {
    try {
        const categories = getAll('SELECT * FROM roofing_categories ORDER BY sort_order DESC, id ASC')
        // Load translations for roofing_category type
        const allTranslations = getAll(
          `SELECT content_id, language_code FROM translations
           WHERE content_type = 'roofing_category' AND content_field = 'name'`
        )
        const transMap = {}
        for (const tr of allTranslations) {
          if (!transMap[tr.content_id]) transMap[tr.content_id] = []
          transMap[tr.content_id].push(tr.language_code)
        }
        
        const withTrans = categories.map(c => ({
          ...c,
          translatedLangs: transMap[c.id] || []
        }))
        res.json(withTrans)
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// POST create category
router.post('/categories', authMiddleware, (req, res) => {
    const { name, name_en, sort_order, is_active } = req.body
    try {
        const result = run(
            `INSERT INTO roofing_categories (name, name_en, sort_order, is_active) VALUES (?, ?, ?, ?)`,
            [name, name_en, sort_order || 0, is_active !== undefined ? is_active : 1]
        )
        const newCat = getOne('SELECT * FROM roofing_categories WHERE id = ?', [result.lastInsertRowid])
        res.json(newCat)
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// PUT update category
router.put('/categories/:id', authMiddleware, (req, res) => {
    const { id } = req.params
    const { name, name_en, sort_order, is_active } = req.body
    try {
        run(
            `UPDATE roofing_categories SET name=?, name_en=?, sort_order=?, is_active=? WHERE id=?`,
            [name, name_en, sort_order || 0, is_active !== undefined ? is_active : 1, id]
        )
        const updated = getOne('SELECT * FROM roofing_categories WHERE id = ?', [id])
        res.json(updated)
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// DELETE category
router.delete('/categories/:id', authMiddleware, (req, res) => {
    const { id } = req.params
    try {
        run('DELETE FROM roofing_categories WHERE id = ?', [id])
        // Also unassign profiles from this category
        run('UPDATE roofing_profiles SET category_id = 0 WHERE category_id = ?', [id])
        res.json({ success: true })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// ==========================================
// PROFILES
// ==========================================

// GET all profiles (public)
router.get('/public', (req, res) => {
    try {
        const profiles = getAll('SELECT * FROM roofing_profiles ORDER BY sort_order DESC, id DESC')
        
        // Inject translations if lang param is provided
        const lang = req.query.lang
        if (lang && lang !== 'en') {
            const tMap = loadTranslationsForLang(lang)
            if (tMap) profiles.forEach(p => translateRoofingProfile(p, tMap, lang))
        }

        res.json(profiles)
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// GET all profiles (admin)
router.get('/', authMiddleware, (req, res) => {
    try {
        const profiles = getAll('SELECT * FROM roofing_profiles ORDER BY sort_order DESC, id DESC')
        res.json(profiles)
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// POST create
router.post('/', authMiddleware, (req, res) => {
    const { model, profile_type, effective_width, coil_width, rib_height, pitch, color, surface, sort_order, category_id, image_url, material, thickness, coating, length, applications } = req.body
    try {
        const result = run(
            `INSERT INTO roofing_profiles (model, profile_type, effective_width, coil_width, rib_height, pitch, color, surface, sort_order, category_id, image_url, material, thickness, coating, length, applications) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [model, profile_type, effective_width, coil_width, rib_height, pitch, color, surface, sort_order || 0, category_id || 0, image_url || '', material || '', thickness || '', coating || '', length || '', applications || '']
        )
        const newProfile = getOne('SELECT * FROM roofing_profiles WHERE id = ?', [result.lastInsertRowid])
        res.json(newProfile)
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// PUT update
router.put('/:id', authMiddleware, (req, res) => {
    const { id } = req.params
    const { model, profile_type, effective_width, coil_width, rib_height, pitch, color, surface, sort_order, category_id, image_url, material, thickness, coating, length, applications } = req.body
    try {
        run(
            `UPDATE roofing_profiles SET model=?, profile_type=?, effective_width=?, coil_width=?, rib_height=?, pitch=?, color=?, surface=?, sort_order=?, category_id=?, image_url=?, material=?, thickness=?, coating=?, length=?, applications=? WHERE id=?`,
            [model, profile_type, effective_width, coil_width, rib_height, pitch, color, surface, sort_order || 0, category_id || 0, image_url || '', material || '', thickness || '', coating || '', length || '', applications || '', id]
        )
        const updated = getOne('SELECT * FROM roofing_profiles WHERE id = ?', [id])
        res.json(updated)
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

// DELETE
router.delete('/:id', authMiddleware, (req, res) => {
    const { id } = req.params
    try {
        run('DELETE FROM roofing_profiles WHERE id = ?', [id])
        res.json({ success: true })
    } catch (e) {
        res.status(500).json({ error: e.message })
    }
})

export default router
