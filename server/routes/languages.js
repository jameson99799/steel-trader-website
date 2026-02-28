import { Router } from 'express'
import { getAll, getOne, run } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

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

// POST create language
router.post('/', authMiddleware, (req, res) => {
    const { name, code, flag, sort_order, status } = req.body
    if (!name || !code) return res.status(400).json({ error: 'name and code are required' })
    try {
        const result = run(
            'INSERT INTO languages (name, code, flag, sort_order, status) VALUES (?, ?, ?, ?, ?)',
            [name, code.toLowerCase(), flag || '', sort_order || 5, status ?? 1]
        )
        res.json({ id: result.lastInsertRowid, message: '添加成功' })
    } catch (e) {
        res.status(400).json({ error: e.message })
    }
})

// PUT update language
router.put('/:id', authMiddleware, (req, res) => {
    const { name, flag, sort_order, status, ai_translated } = req.body
    run(
        'UPDATE languages SET name=?, flag=?, sort_order=?, status=?, ai_translated=? WHERE id=?',
        [name, flag || '', sort_order ?? 5, status ?? 1, ai_translated ?? 0, req.params.id]
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
    res.json({ message: '删除成功' })
})

export default router
