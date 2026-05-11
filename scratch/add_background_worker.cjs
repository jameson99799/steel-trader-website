const fs = require('fs')
const path = require('path')

const file = path.join(__dirname, '../server/routes/translation.js')
let code = fs.readFileSync(file, 'utf8')

const workerCode = `

// ─── Background Translation Worker ───────────────────────────────────────────

let workerRunning = false;
let workerPaused = false;
let activeWorkers = 0;
let workerConcurrency = 3;

async function executeTranslationTask(targetLang, contentType, contentId) {
    const langRow = getOne('SELECT * FROM languages WHERE code=?', [targetLang])
    if (!langRow) throw new Error(\`Language "\${targetLang}" not found\`)

    const s = getOne('SELECT * FROM translation_settings WHERE id=1')
    if (!s?.api_key && !getOne('SELECT api_key FROM ai_channels WHERE is_default = 1')?.api_key) {
        throw new Error('AI API key not configured.')
    }

    const TYPE_TO_PAGE = { product: 'products', news: 'news', company: 'company', page_text: 'page_texts', category: 'categories', news_category: 'news_categories', hero: 'hero', ui_text: 'ui_texts_static', ral_color: 'ral_colors' }
    const pageKey = TYPE_TO_PAGE[contentType] || contentType
    if (!PAGES[pageKey]) throw new Error(\`Unknown content type: \${contentType}\`)
    
    const allItems = PAGES[pageKey]()
    const items = allItems.filter(i => String(i.id) === String(contentId))

    if (items.length === 0) return { results: [], errors: [] }

    const manualOverrides = getAll('SELECT original_text, translated_text FROM translations WHERE language_code=? AND is_manual=1', [targetLang])
    const overrideNote = manualOverrides.length > 0
        ? '\\n\\nUse these approved translations as reference:\\n' +
        manualOverrides.slice(0, 8).map(o => \`"\${o.original_text}" → "\${o.translated_text}"\`).join('\\n')
        : ''

    const { results, errors } = await translateBatch(enhanceWithDefaultChannel(s), items, targetLang, langRow.name, overrideNote)
    if (results.length > 0) {
        run('UPDATE languages SET ai_translated=1 WHERE code=?', [targetLang])
    }
    return { results, errors }
}

async function processTranslationQueue() {
    if (workerRunning) return;
    workerRunning = true;
    
    try {
        while (!workerPaused) {
            if (activeWorkers >= workerConcurrency) {
                await new Promise(r => setTimeout(r, 1000));
                continue;
            }
            
            // Fetch next task
            const task = getOne("SELECT * FROM translation_tasks WHERE status='pending' ORDER BY id ASC LIMIT 1");
            if (!task) {
                // If no pending, check if we should auto-retry failed ones
                const allFinished = getOne("SELECT count(*) as c FROM translation_tasks WHERE status='pending' OR status='running'");
                if (allFinished && allFinished.c === 0) {
                    // Try to auto-retry errors once
                    const errorCount = run("UPDATE translation_tasks SET status='error', status='pending', retry_count = retry_count + 1 WHERE status='error' AND retry_count = 0");
                    if (errorCount && errorCount.changes > 0) {
                        continue; // loop again to pick up the newly pending tasks
                    }
                }
                break; // queue truly empty
            }

            // Mark running
            run("UPDATE translation_tasks SET status='running', updated_at=CURRENT_TIMESTAMP WHERE id=?", [task.id]);
            activeWorkers++;

            (async () => {
                try {
                    const result = await executeTranslationTask(task.target_lang, task.item_type, task.item_id);
                    if (result.errors && result.errors.length > 0 && (!result.results || result.results.length === 0)) {
                        const errMsg = (result.errors[0].error || 'Unknown error').slice(0, 500);
                        run("UPDATE translation_tasks SET status='error', error_message=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", [errMsg, task.id]);
                    } else {
                        run("UPDATE translation_tasks SET status='success', error_message=NULL, updated_at=CURRENT_TIMESTAMP WHERE id=?", [task.id]);
                    }
                } catch (e) {
                    run("UPDATE translation_tasks SET status='error', error_message=?, updated_at=CURRENT_TIMESTAMP WHERE id=?", [(e.message || 'Error').slice(0, 500), task.id]);
                } finally {
                    activeWorkers--;
                }
            })();
        }
    } finally {
        workerRunning = false;
    }
}

// ─── Background Batch API ────────────────────────────────────────────────────

router.post('/batch-start', authMiddleware, async (req, res) => {
    const { pages, lang, concurrency } = req.body;
    if (!pages || !lang) return res.status(400).json({ error: 'pages and lang are required' });
    
    if (concurrency) workerConcurrency = parseInt(concurrency) || 3;
    workerPaused = false;
    
    // Auto clear >3 days old logs before starting new batch
    run("DELETE FROM translation_tasks WHERE created_at < datetime('now', '-3 days')");

    const targetLangs = [];
    if (lang === 'all') {
        const langs = getAll("SELECT code FROM languages WHERE code != 'en' AND status = 1");
        targetLangs.push(...langs.map(l => l.code));
    } else {
        targetLangs.push(lang);
    }

    const allItemsList = [];
    for (const page of pages) {
        if (!PAGES[page]) continue;
        const items = PAGES[page]();
        // Check untranslated
        for (const item of items) {
            if (item.long_html) continue;
            for (const tLang of targetLangs) {
                const t = getOne(
                    'SELECT translated_text FROM translations WHERE language_code=? AND content_type=? AND content_id=? AND content_field=?',
                    [tLang, item.type, item.id, item.field]
                );
                if (!t?.translated_text) {
                    // Unique check using composite string
                    const uniqueKey = \`\${tLang}_\${item.type}_\${item.id}\`;
                    if (!allItemsList.find(x => x.uniqueKey === uniqueKey)) {
                        allItemsList.push({ ...item, targetLang: tLang, uniqueKey });
                    }
                }
            }
        }
    }

    let inserted = 0;
    for (const item of allItemsList) {
        // avoid duplicating pending tasks
        const exist = getOne("SELECT id FROM translation_tasks WHERE target_lang=? AND item_type=? AND item_id=? AND (status='pending' OR status='running')", [item.targetLang, item.type, item.id]);
        if (!exist) {
            run("INSERT INTO translation_tasks (target_lang, item_type, item_id, item_name, status) VALUES (?, ?, ?, ?, 'pending')", 
            [item.targetLang, item.type, item.id, item.itemName || \`\${item.type}_\${item.id}\`]);
            inserted++;
        }
    }

    processTranslationQueue();
    res.json({ success: true, message: \`Added \${inserted} tasks to queue.\`, totalAdded: inserted });
});

router.get('/batch-status', authMiddleware, (req, res) => {
    const total = getOne("SELECT COUNT(*) as c FROM translation_tasks")?.c || 0;
    const pending = getOne("SELECT COUNT(*) as c FROM translation_tasks WHERE status='pending'")?.c || 0;
    const running = getOne("SELECT COUNT(*) as c FROM translation_tasks WHERE status='running'")?.c || 0;
    const success = getOne("SELECT COUNT(*) as c FROM translation_tasks WHERE status='success'")?.c || 0;
    const error = getOne("SELECT COUNT(*) as c FROM translation_tasks WHERE status='error'")?.c || 0;
    
    const logs = getAll("SELECT * FROM translation_tasks ORDER BY updated_at DESC LIMIT 100");
    
    res.json({ total, pending, running, success, error, workerRunning, workerPaused, logs });
});

router.post('/batch-action', authMiddleware, (req, res) => {
    const { action } = req.body;
    if (action === 'pause') {
        workerPaused = true;
    } else if (action === 'resume') {
        workerPaused = false;
        processTranslationQueue();
    } else if (action === 'retry_failed') {
        run("UPDATE translation_tasks SET status='pending', retry_count=0 WHERE status='error'");
        workerPaused = false;
        processTranslationQueue();
    } else if (action === 'clear_logs') {
        run("DELETE FROM translation_tasks");
    }
    res.json({ success: true });
});

`

if (!code.includes('processTranslationQueue')) {
    code = code.replace('export default router', workerCode + '\nexport default router')
    fs.writeFileSync(file, code)
    console.log('Successfully injected background worker code')
} else {
    console.log('Already injected')
}
