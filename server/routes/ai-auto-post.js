import { Router } from 'express'
import { getAll, getOne, run } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import fs from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { applyWatermark } from '../utils/watermark.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const router = Router()

// --- AI API Helper ---
async function callAi(channel, model, systemPrompt, userPrompt) {
  let apiUrl = channel.api_url.replace(/\/$/, '')
  if (apiUrl.endsWith('/chat/completions')) {
      apiUrl = apiUrl.replace(/\/chat\/completions$/, '')
  }
  
  const payload = {
      model: model || channel.default_model || 'gpt-4o-mini',
      messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
      ],
      temperature: 0.7
  }

  const response = await fetch(`${apiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${channel.api_key}`
      },
      body: JSON.stringify(payload)
  })

  if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`AI API Error: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

function cleanJsonString(str) {
  let s = str.trim()
  if (s.startsWith('```json')) s = s.slice(7)
  else if (s.startsWith('```')) s = s.slice(3)
  if (s.endsWith('```')) s = s.slice(0, -3)
  return s.trim()
}

// --- Background Worker Logic ---
let workerRunning = false

async function executeGeneration(isTest = false) {
  const settings = getOne('SELECT * FROM ai_post_settings WHERE id = 1')
  if (!settings) throw new Error('Settings not found')

  const channel = getOne('SELECT * FROM ai_channels WHERE id = ?', [settings.channel_id]) || 
                  getOne('SELECT * FROM ai_channels WHERE is_default = 1')
  if (!channel) throw new Error('No AI Channel configured')

  const metadataPromptRow = getOne('SELECT content FROM ai_post_prompts WHERE id = ?', [settings.metadata_prompt_id])
  const bodyPromptRow = getOne('SELECT content FROM ai_post_prompts WHERE id = ?', [settings.body_prompt_id])
  if (!metadataPromptRow || !bodyPromptRow) throw new Error('Prompts not configured correctly')

  let products = []
  try { products = JSON.parse(settings.products_json || '[]') } catch(e) {}
  if (!products.length) throw new Error('No products selected for generation')

  const product = products[settings.current_product_index % products.length]
  const nextIndex = (settings.current_product_index + 1) % products.length

  // Step 1: Generate Metadata
  const userPrompt = `Product: ${product}`
  const rawMetadata = await callAi(channel, null, metadataPromptRow.content.replace('{product}', product), userPrompt)
  
  let metadata
  try {
    metadata = JSON.parse(cleanJsonString(rawMetadata))
  } catch (e) {
    throw new Error('Failed to parse AI JSON response for metadata. Output was: ' + rawMetadata)
  }

  // Step 2: Fetch Cover Image
  // Use | logic to search media library
  let coverImage = ''
  if (product) {
    const terms = product.split('|').map(s => s.trim()).filter(Boolean)
    let where = 'WHERE status=1 AND mimetype LIKE "image/%"'
    const params = []
    if (terms.length > 0) {
      const ors = terms.map(() => '(original_filename LIKE ? OR alt LIKE ?)').join(' OR ')
      where += ` AND (${ors})`
      terms.forEach(term => {
        params.push(`%${term}%`, `%${term}%`)
      })
    }
    // Randomize selection
    const media = getOne(`SELECT * FROM media ${where} ORDER BY RANDOM() LIMIT 1`, params)
    if (media) {
      coverImage = media.filepath
    }
  }

  // Step 3: Generate Body
  const bodySysPrompt = bodyPromptRow.content
    .replace('{product}', product)
    .replace('{title}', metadata.title || '')
    .replace('{summary}', metadata.summary || '')
  
  let bodyContent = await callAi(channel, null, bodySysPrompt, `Please write the article now.`)
  if (bodyContent.startsWith('```html')) bodyContent = bodyContent.slice(7)
  else if (bodyContent.startsWith('```')) bodyContent = bodyContent.slice(3)
  if (bodyContent.endsWith('```')) bodyContent = bodyContent.slice(0, -3)
  bodyContent = bodyContent.trim()

  // Generate slug
  const slug = (metadata.title || product || `post-${Date.now()}`).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 60) + '-' + Date.now()

  // Step 4: Insert News Post
  const result = run(`
    INSERT INTO news (title, title_en, slug, summary, summary_en, content, cover_image, seo_title, seo_description, seo_keywords, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `, [
    metadata.title || product, metadata.title || product, slug,
    metadata.summary || '', metadata.summary || '',
    bodyContent, coverImage,
    metadata.seo_title || '', metadata.seo_description || '', metadata.seo_keywords || ''
  ])

  const newId = result.lastInsertRowid

  // Step 5: Queue Translation if needed
  if (settings.translate_all === 1) {
    const langs = getAll("SELECT code FROM languages WHERE code != 'en' AND status = 1")
    for (const l of langs) {
      const uniqueKey = `${l.code}_news_${newId}`
      const exist = getOne("SELECT id FROM translation_tasks WHERE target_lang=? AND item_type=? AND item_id=? AND (status='pending' OR status='running')", [l.code, 'news', newId])
      if (!exist) {
        run("INSERT INTO translation_tasks (target_lang, item_type, item_id, item_name, status) VALUES (?, ?, ?, ?, 'pending')", 
            [l.code, 'news', newId, metadata.title || `News_${newId}`])
      }
    }
  }

  // If not test, update index and next run time
  if (!isTest) {
    const nextRun = new Date(Date.now() + (settings.frequency_days || 1) * 24 * 60 * 60 * 1000)
    run('UPDATE ai_post_settings SET current_product_index = ?, next_run_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1', 
      [nextIndex, nextRun.toISOString()]
    )
  }

  return { id: newId, title: metadata.title, product, coverImage }
}

async function runWorker() {
  if (workerRunning) return
  workerRunning = true
  try {
    const settings = getOne('SELECT * FROM ai_post_settings WHERE id = 1')
    if (settings && settings.status === 'running') {
      const now = new Date()
      const nextRun = settings.next_run_at ? new Date(settings.next_run_at) : new Date(0)
      if (now >= nextRun) {
        // Time to run!
        for (let i = 0; i < (settings.articles_per_run || 1); i++) {
          await executeGeneration(false)
        }
      }
    }
  } catch (e) {
    console.error('AI Auto-Post Worker Error:', e.message)
    // Optional: auto-pause on error?
    // run("UPDATE ai_post_settings SET status = 'paused' WHERE id = 1")
  } finally {
    workerRunning = false
  }
}

// Start interval loop
setInterval(runWorker, 60 * 1000) // Check every 1 minute


// --- Endpoints ---

router.get('/settings', authMiddleware, (req, res) => {
  const settings = getOne('SELECT * FROM ai_post_settings WHERE id = 1')
  res.json(settings)
})

router.post('/settings', authMiddleware, (req, res) => {
  const { frequency_days, articles_per_run, products_json, translate_all, channel_id, metadata_prompt_id, body_prompt_id } = req.body
  run(`
    UPDATE ai_post_settings 
    SET frequency_days=?, articles_per_run=?, products_json=?, translate_all=?, channel_id=?, metadata_prompt_id=?, body_prompt_id=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=1
  `, [frequency_days, articles_per_run, products_json, translate_all ? 1 : 0, channel_id, metadata_prompt_id, body_prompt_id])
  res.json({ success: true })
})

router.post('/action', authMiddleware, (req, res) => {
  const { action } = req.body
  if (action === 'start') {
    const settings = getOne('SELECT next_run_at FROM ai_post_settings WHERE id = 1')
    // If starting for the very first time, set next_run_at to now so it runs immediately
    if (!settings.next_run_at) {
      run("UPDATE ai_post_settings SET status = 'running', next_run_at = CURRENT_TIMESTAMP WHERE id = 1")
    } else {
      run("UPDATE ai_post_settings SET status = 'running' WHERE id = 1")
    }
    // trigger worker immediately
    setTimeout(runWorker, 1000)
  } else if (action === 'pause') {
    run("UPDATE ai_post_settings SET status = 'paused' WHERE id = 1")
  } else if (action === 'stop') {
    run("UPDATE ai_post_settings SET status = 'paused', next_run_at = NULL, current_product_index = 0 WHERE id = 1")
  }
  res.json({ success: true })
})

router.post('/test-run', authMiddleware, async (req, res) => {
  try {
    const result = await executeGeneration(true)
    res.json({ success: true, result })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Prompts CRUD
router.get('/prompts', authMiddleware, (req, res) => {
  const prompts = getAll('SELECT * FROM ai_post_prompts ORDER BY type, is_default DESC, id DESC')
  res.json(prompts)
})

router.post('/prompts', authMiddleware, (req, res) => {
  const { name, content, type } = req.body
  if (!name || !content || !type) return res.status(400).json({ error: 'Missing fields' })
  const result = run('INSERT INTO ai_post_prompts (name, content, type) VALUES (?, ?, ?)', [name, content, type])
  res.json({ id: result.lastInsertRowid, message: 'Saved' })
})

router.put('/prompts/:id', authMiddleware, (req, res) => {
  const { name, content } = req.body
  run('UPDATE ai_post_prompts SET name=?, content=? WHERE id=?', [name, content, req.params.id])
  res.json({ message: 'Updated' })
})

router.delete('/prompts/:id', authMiddleware, (req, res) => {
  run('DELETE FROM ai_post_prompts WHERE id=?', [req.params.id])
  res.json({ message: 'Deleted' })
})

router.put('/prompts/:id/set-default', authMiddleware, (req, res) => {
  const prompt = getOne('SELECT type FROM ai_post_prompts WHERE id=?', [req.params.id])
  if (prompt) {
    run('UPDATE ai_post_prompts SET is_default=0 WHERE type=?', [prompt.type])
    run('UPDATE ai_post_prompts SET is_default=1 WHERE id=?', [req.params.id])
  }
  res.json({ message: 'Set as default' })
})

export default router
