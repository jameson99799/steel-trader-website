import { Router } from 'express'
import { getOne, run } from '../db.js'
import { verifyUnsubscribeToken } from '../services/mailCompliance.js'

const router = Router()

function unsubscribe(req, res) {
  const token = req.method === 'POST' ? (req.body?.token || req.query?.token) : req.query?.token
  const email = verifyUnsubscribeToken(token)
  if (!email) return res.status(400).json({ error: 'Invalid unsubscribe token' })
  const existing = getOne('SELECT email FROM mail_suppressions WHERE email=?', [email])
  if (!existing) run("INSERT INTO mail_suppressions (email, source, reason) VALUES (?,'unsubscribe','recipient request')", [email])
  if (req.method === 'POST') return res.status(200).json({ success: true })
  res.type('html').send('<!doctype html><html><head><meta charset="utf-8"><title>Unsubscribed</title></head><body style="font-family:Arial;padding:48px;text-align:center"><h1>Unsubscribed</h1><p>You will no longer receive marketing emails from SunSea Steel.</p></body></html>')
}

router.get('/unsubscribe', unsubscribe)
router.post('/unsubscribe', unsubscribe)

export default router
