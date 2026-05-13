import express from 'express'
import { run, getAll, getOne } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

const router = express.Router()

// GET all profiles (public)
router.get('/public', (req, res) => {
    try {
        const profiles = getAll('SELECT * FROM roofing_profiles ORDER BY sort_order DESC, id DESC')
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
    const { model, profile_type, effective_width, coil_width, rib_height, pitch, color, surface, sort_order } = req.body
    try {
        const result = run(
            `INSERT INTO roofing_profiles (model, profile_type, effective_width, coil_width, rib_height, pitch, color, surface, sort_order) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [model, profile_type, effective_width, coil_width, rib_height, pitch, color, surface, sort_order || 0]
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
    const { model, profile_type, effective_width, coil_width, rib_height, pitch, color, surface, sort_order } = req.body
    try {
        run(
            `UPDATE roofing_profiles SET model=?, profile_type=?, effective_width=?, coil_width=?, rib_height=?, pitch=?, color=?, surface=?, sort_order=? WHERE id=?`,
            [model, profile_type, effective_width, coil_width, rib_height, pitch, color, surface, sort_order || 0, id]
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
