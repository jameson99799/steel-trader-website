import { Router } from 'express'
import { getAll, getOne, run } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import fs from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { applyWatermark } from '../utils/watermark.js'
import { processTranslationQueue } from './translation.js'


const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT_DIR = join(__dirname, '../../')

function logMsg(msg) {
  try {
    fs.appendFileSync(join(ROOT_DIR, 'data/ai-post.log'), `[${new Date().toISOString()}] ${msg}\n`)
  } catch(e){}
}

const router = Router()

// --- AI API Helper ---
async function callAi(channel, model, systemPrompt, userPrompt) {
  let apiUrl = channel.api_url.replace(/\/$/, '')
  if (apiUrl.endsWith('/chat/completions')) {
      apiUrl = apiUrl.replace(/\/chat\/completions$/, '')
  }
  
  let finalModel = model || channel.default_model
  if (!finalModel && channel.models) {
      try {
          const modelsArray = JSON.parse(channel.models)
          if (Array.isArray(modelsArray) && modelsArray.length > 0) {
              finalModel = modelsArray[0]
          }
      } catch (e) {}
  }
  finalModel = finalModel || 'gpt-4o-mini'

  const payload = {
      model: finalModel,
      messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      stream: true
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

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
  }

  const decoder = new TextDecoder("utf-8");
  let fullText = "";
  let buffer = "";
  for await (const chunk of response.body) {
      buffer += decoder.decode(chunk, { stream: true });
      let lines = buffer.split('\n');
      buffer = lines.pop(); // keep the last partial line in buffer
      for (const line of lines) {
          const tLine = line.trim();
          if (tLine.startsWith('data: ') && tLine !== 'data: [DONE]') {
              try {
                  const data = JSON.parse(tLine.slice(6));
                  if (data.choices && data.choices[0].delta && data.choices[0].delta.content) {
                      fullText += data.choices[0].delta.content;
                  }
              } catch (e) {
                  // ignore
              }
          }
      }
  }
  // catch any remaining data in buffer
  if (buffer.trim().startsWith('data: ') && buffer.trim() !== 'data: [DONE]') {
      try {
          const data = JSON.parse(buffer.trim().slice(6));
          if (data.choices && data.choices[0].delta && data.choices[0].delta.content) {
              fullText += data.choices[0].delta.content;
          }
      } catch (e) {}
  }

  if (!fullText) {
      logMsg(`Warning: Stream parsing resulted in empty string. Content-Type was ${contentType}`);
  }
  return fullText || '';
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
  logMsg(`--- Starting executeGeneration(isTest=${isTest}) ---`)
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
  console.log('[DEBUG] executeGeneration raw products_json:', settings.products_json)
  console.log('[DEBUG] executeGeneration parsed products:', products)
  console.log('[DEBUG] executeGeneration current_product_index:', settings.current_product_index)
  if (!products.length) throw new Error('No products selected for generation')

  const product = products[settings.current_product_index % products.length]
  const nextIndex = (settings.current_product_index + 1) % products.length
  console.log('[DEBUG] executeGeneration chosen product:', product)
  logMsg(`Selected product: ${product}`)

  // Step 1: Generate Metadata
  const userPrompt = `Product: ${product}`
  logMsg(`Generating metadata...`)
  const rawMetadata = await callAi(channel, null, metadataPromptRow.content.replace('{product}', product), userPrompt)
  logMsg(`Metadata AI Response received.`)
  
  let metadata
  try {
    metadata = JSON.parse(cleanJsonString(rawMetadata))
  } catch (e) {
    throw new Error('Failed to parse AI JSON response for metadata. Output was: ' + rawMetadata)
  }

  // Step 2: Fetch Cover Image
  // Use product terms to match media_groups
  let coverImage = ''
  let fetchedMediaList = []
  if (product) {
    const terms = product.split('|').map(s => s.trim()).filter(Boolean)
    const allGroups = getAll('SELECT id, name FROM media_groups')
    const matchedGroupIds = new Set()

    terms.forEach(term => {
      const t = term.toLowerCase()
      allGroups.forEach(g => {
        const gName = g.name.toLowerCase()
        if (t === gName) {
          matchedGroupIds.add(g.id)
        } else {
          try {
            // Use word boundary to ensure "GI" doesn't match inside "PPGI"
            const regex = new RegExp(`\\b${gName}\\b`, 'i')
            if (regex.test(t)) {
              matchedGroupIds.add(g.id)
            }
          } catch(e){} // Ignore regex errors for special chars
        }
      })
    })

    let where = "WHERE status=1 AND mimetype LIKE 'image/%'"
    const params = []
    
    if (matchedGroupIds.size > 0) {
      const ids = Array.from(matchedGroupIds)
      const placeholders = ids.map(() => '?').join(',')
      where += ` AND group_id IN (${placeholders})`
      params.push(...ids)
    } else if (terms.length > 0) {
      // Fallback: if no group matched, search filename with exact word match trick
      const ors = terms.map(() => '(original_filename LIKE ? OR alt LIKE ?)').join(' OR ')
      where += ` AND (${ors})`
      terms.forEach(term => {
        params.push(`%${term}%`, `%${term}%`)
      })
    }

    // Fetch up to 4 random images
    const mediaList = getAll(`SELECT * FROM media ${where} ORDER BY RANDOM() LIMIT 4`, params)
    logMsg(`Fetched ${mediaList?.length || 0} images for product from media library.`)
    if (mediaList && mediaList.length > 0) {
      coverImage = settings.apply_watermark ? await applyWatermark(mediaList[0].filepath) : mediaList[0].filepath
    }
    // Make mediaList available to next step
    fetchedMediaList = mediaList || []
  }

  // Step 3: Generate Body
  const mediaList = fetchedMediaList
  const numBodyImages = Math.max(0, mediaList.length - 1)
  let imageInstruction = ''
  if (numBodyImages > 0) {
    const placeholders = Array.from({ length: numBodyImages }, (_, i) => `[IMAGE_${i + 1}]`).join(', ')
    imageInstruction = `\n\nIMPORTANT: You MUST insert exactly ${numBodyImages} image placeholders formatted exactly as ${placeholders} at appropriate semantic positions within the article body (e.g., evenly spaced between paragraphs). Do not use real <img> tags, only these exact text placeholders.`
  }

  const bodySysPrompt = bodyPromptRow.content
    .replace('{product}', product)
    .replace('{title}', metadata.title || '')
    .replace('{summary}', metadata.summary || '') + imageInstruction
  
  logMsg(`Generating article body...`)
  let bodyContent = await callAi(channel, null, bodySysPrompt, `Please write the article now.`)
  logMsg(`Body AI Response received.`)
  if (bodyContent.startsWith('```html')) bodyContent = bodyContent.slice(7)
  else if (bodyContent.startsWith('```')) bodyContent = bodyContent.slice(3)
  if (bodyContent.endsWith('```')) bodyContent = bodyContent.slice(0, -3)
  bodyContent = bodyContent.trim()

  // Replace placeholders with actual HTML image tags
  for (let i = 1; i <= numBodyImages; i++) {
    const m = mediaList[i]
    if (m) {
      const imgPath = settings.apply_watermark ? await applyWatermark(m.filepath) : m.filepath
      const imgHtml = `<figure class="article-image" style="text-align: center; margin: 20px 0;"><img src="${imgPath}" alt="${metadata.title || product}" style="max-width: 100%; height: auto; border-radius: 8px;" /><figcaption style="color: #666; font-size: 14px; margin-top: 8px;">${metadata.title || product}</figcaption></figure>`
      bodyContent = bodyContent.replace(`[IMAGE_${i}]`, imgHtml)
    }
  }
  // Remove any leftover unused placeholders
  bodyContent = bodyContent.replace(/\[IMAGE_\d+\]/g, '')

  // Generate slug
  const slug = (metadata.title || product || `post-${Date.now()}`).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 60) + '-' + Date.now()

  // Step 4: Insert News Post
  const catId = settings.category_id || 1
  const result = run(`
    INSERT INTO news (title, title_en, slug, summary, summary_en, content, cover_image, seo_title, seo_description, seo_keywords, status, category_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `, [
    metadata.title || product, metadata.title || product, slug,
    metadata.summary || '', metadata.summary || '',
    bodyContent, coverImage,
    metadata.seo_title || '', metadata.seo_description || '', metadata.seo_keywords || '',
    catId
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
    try {
      logMsg(`Triggering background translation queue...`)
      processTranslationQueue()
    } catch (e) {
      logMsg(`Failed to trigger translation queue: ${e.message}`)
    }
  }


  // If not test, update index and next run time
  if (!isTest) {
    const nextRun = new Date(Date.now() + (settings.frequency_days || 1) * 24 * 60 * 60 * 1000)
    run('UPDATE ai_post_settings SET current_product_index = ?, next_run_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1', 
      [nextIndex, nextRun.toISOString()]
    )
    logMsg(`Updated next_run_at to ${nextRun.toISOString()}`)
  }

  logMsg(`Generation complete. Post ID: ${newId}`)
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
  const { frequency_days, articles_per_run, products_json, translate_all, apply_watermark, channel_id, metadata_prompt_id, body_prompt_id, category_id } = req.body
  console.log('[DEBUG] POST /settings body received:', req.body)
  run(`
    UPDATE ai_post_settings 
    SET frequency_days=?, articles_per_run=?, products_json=?, translate_all=?, apply_watermark=?, channel_id=?, metadata_prompt_id=?, body_prompt_id=?, category_id=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=1
  `, [frequency_days, articles_per_run, products_json, translate_all ? 1 : 0, apply_watermark ? 1 : 0, channel_id, metadata_prompt_id, body_prompt_id, category_id || 1])
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

router.get('/logs', authMiddleware, (req, res) => {
  try {
    const logPath = join(ROOT_DIR, 'data/ai-post.log')
    if (fs.existsSync(logPath)) {
      const logs = fs.readFileSync(logPath, 'utf8')
      res.json({ logs })
    } else {
      res.json({ logs: '暂无日志记录 (No logs yet)' })
    }
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.delete('/logs', authMiddleware, (req, res) => {
  try {
    const logPath = join(ROOT_DIR, 'data/ai-post.log')
    if (fs.existsSync(logPath)) {
      fs.writeFileSync(logPath, '') // Clear file content
    }
    res.json({ success: true })
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
