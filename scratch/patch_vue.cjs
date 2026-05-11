const fs = require('fs')
const path = require('path')

const file = path.join(__dirname, '../src/views/admin/Translations.vue')
let code = fs.readFileSync(file, 'utf8')

// Replace runPages and runItems with batch start logic
const targetLogic = `async function runPages(pages) {
  translating.value = true
  translateResult.value = null
  failedPages.value = []
  failedItems.value = []
  progressTotal.value = 0
  progressDone.value = 0
  progressOk.value = 0
  progressErrors.value = 0

  addLog('info', \`开始翻译 → 目标语言: \${selectedLang.value === 'all' ? '全部语言' : selectedLang.value}，范围: \${pages.map(p => pageLabels[p] || p).join(', ')}\`)

  addLog('info', \`📋 正在获取待翻译内容列表...\`)
  let allItemsList = []
  try {
    for (const page of pages) {
      const items = await api.getTranslationItems(page)
      allItemsList.push(...(items || []))
    }
    addLog('ok', \`📋 共发现 \${allItemsList.length} 个基础待翻译项目\`)
  } catch (e) {
    addLog('error', \`❌ 获取翻译列表失败: \${e.message}\`)
    translating.value = false
    return
  }

  if (allItemsList.length === 0) {
    addLog('ok', \`✔ 无需翻译（已全部翻译）\`)
    translating.value = false
    return
  }

  let finalItems = []
  if (selectedLang.value === 'all') {
    const langs = nonEnLangs.value.map(l => l.code)
    for (const item of allItemsList) {
      for (const lang of langs) {
        finalItems.push({ ...item, targetLang: lang })
      }
    }
  } else {
    for (const item of allItemsList) {
      finalItems.push({ ...item, targetLang: selectedLang.value })
    }
  }

  await runItems(finalItems)
}

async function runItems(itemsList) {
  translating.value = true
  progressTotal.value = itemsList.length
  progressDone.value = 0
  progressOk.value = 0
  progressErrors.value = 0
  const allResults = []
  const allErrors = []
  const newFailed = []

  const CONCURRENCY = concurrency.value || 3
  const BULK_SIZE = 1

  addLog('info', \`⚡ 陪读蛙模式: \${CONCURRENCY} 个项目同时翻译, 每个项目内部多段并发\`)

  let queueIdx = 0
  let consecutiveFailures = 0
  const MAX_CONSECUTIVE_FAILURES = 3

  async function worker() {
    while (queueIdx < itemsList.length) {
      if (aborted) break
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) break

      const chunk = []
      while (queueIdx < itemsList.length && chunk.length < BULK_SIZE) {
        chunk.push(itemsList[queueIdx++])
      }
      if (chunk.length === 0) break

      if (aborted || consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        for (const item of chunk) { newFailed.push(item); progressDone.value++ }
        addLog('warn', \`⏭ 跳过 \${chunk.length} 个项目（已停止）\`)
        continue
      }

      const totalFields = chunk.reduce((s, c) => s + (c.fields?.length || 0), 0)
      addLog('info', \`→ 正在翻译: [\${chunk[0].targetLang}] \${chunk[0].itemName} (\${totalFields} 个字段)...\`)

      try {
        const item = chunk[0]
        const res = await api.runTranslationOne(item.targetLang, item.type, item.id)
        const ok = res.results?.length || 0
        const errs = res.errors?.length || 0
        progressOk.value += ok
        progressErrors.value += errs

        if (res.results) allResults.push(...res.results.map(r => ({ ...r, targetLang: item.targetLang })))
        if (res.errors) allErrors.push(...res.errors.map(e => ({ ...e, targetLang: item.targetLang })))

        if (errs > 0 && ok === 0) {
          consecutiveFailures++
          for (const e of res.errors) {
            const code = e.errorCode ? \`[\${e.errorCode}]\` : ''
            addLog('error', \`   ❌ [\${item.targetLang}] \${e.itemName || ''} \${code}: \${(e.error || '').slice(0, 120)}\`)
          }
          for (const it of chunk) newFailed.push(it)
          if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            addLog('error', \`🛑 连续 \${MAX_CONSECUTIVE_FAILURES} 次失败，自动停止翻译！请检查API密钥或网络连接\`)
            aborted = true
          }
        } else if (errs > 0) {
          consecutiveFailures = 0  // 有成功就重置
          if (ok > 0) addLog('warn', \`   ⚠️ [\${item.targetLang}]「\${chunk[0].itemName}」: \${ok} 成功, \${errs} 错误\`)
          for (const it of chunk) newFailed.push(it)
        } else if (ok === 0) {
          consecutiveFailures = 0
          addLog('ok', \`   ✔ [\${item.targetLang}]「\${chunk[0].itemName}」无需翻译\`)
        } else {
          consecutiveFailures = 0
          addLog('ok', \`   ✅ [\${item.targetLang}]「\${chunk[0].itemName}」翻译成功: \${ok} 个字段\`)
        }
      } catch (e) {
        consecutiveFailures++
        progressErrors.value += chunk.length
        for (const it of chunk) {
          allErrors.push({ item: it.itemName, error: e.message, errorCode: 'ERR_API', targetLang: it.targetLang })
          newFailed.push(it)
        }
        addLog('error', \`   ❌ [\${chunk[0].targetLang}]「\${chunk[0].itemName}」翻译失败 (\${consecutiveFailures}/\${MAX_CONSECUTIVE_FAILURES}): \${e.message}\`)
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          addLog('error', \`🛑 连续 \${MAX_CONSECUTIVE_FAILURES} 次失败，自动停止翻译！请检查API密钥或网络连接\`)
          aborted = true
        }
      }

      progressDone.value += chunk.length
    }
  }

  const workers = []
  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push(worker())
  }
  await Promise.all(workers)

  translating.value = false
  aborted = false
  failedItems.value = newFailed
  translateResult.value = {
    translated: allResults.length,
    total: allResults.length + allErrors.length,
    errors: allErrors
  }
  if (allErrors.length > 0) {
    addLog('error', \`翻译完成，存在 \${allErrors.length} 个错误\`)
  } else {
    addLog('ok', \`🎉 所有翻译任务已完成！\`)
  }
}`

const newLogic = `
let pollTimer = null;

async function fetchStatus() {
    try {
        const res = await api.httpRequest('/api/translation/batch-status');
        if (res) {
            progressTotal.value = res.total;
            progressDone.value = res.success + res.error; // Not exact but indicates processed
            progressOk.value = res.success;
            progressErrors.value = res.error;
            
            translating.value = res.workerRunning && !res.workerPaused;
            
            // Map logs
            if (res.logs) {
                logEntries.value = res.logs.map(log => ({
                    time: log.updated_at.split(' ')[1] || log.updated_at,
                    type: log.status === 'success' ? 'ok' : (log.status === 'error' ? 'error' : (log.status === 'running' ? 'info' : 'warn')),
                    msg: \`[\${log.target_lang}] \${log.item_name} \${log.status === 'error' ? '❌ ' + log.error_message : (log.status === 'success' ? '✅ 完成' : '⏳ ' + log.status)}\`
                }));
            }
            
            failedItems.value = new Array(res.error).fill(1); // Mock array to trigger buttons
            
            if (translating.value) {
                if (!pollTimer) pollTimer = setInterval(fetchStatus, 2000);
            } else {
                if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
            }
        }
    } catch(e) {
        console.error(e);
    }
}

onMounted(() => {
    fetchStatus();
});

onUnmounted(() => {
    if (pollTimer) clearInterval(pollTimer);
});

async function runPages(pages) {
    try {
        await api.httpRequest('/api/translation/batch-start', {
            method: 'POST',
            body: { pages, lang: selectedLang.value, concurrency: concurrency.value }
        });
        translating.value = true;
        addLog('info', \`🚀 后台翻译已启动！请等待...\`);
        fetchStatus();
    } catch (e) {
        addLog('error', \`❌ 启动失败: \${e.message}\`);
    }
}

async function runItems(itemsList) {
    try {
        await api.httpRequest('/api/translation/batch-start', {
            method: 'POST',
            body: { explicitItems: itemsList, lang: selectedLang.value, concurrency: concurrency.value }
        });
        translating.value = true;
        addLog('info', \`🚀 精细翻译后台任务已启动！\`);
        fetchStatus();
    } catch (e) {
        addLog('error', \`❌ 启动失败: \${e.message}\`);
    }
}

async function actionBatch(action) {
    try {
        await api.httpRequest('/api/translation/batch-action', {
            method: 'POST',
            body: { action }
        });
        fetchStatus();
    } catch (e) {
        console.error(e);
    }
}

function abortTranslation() {
    actionBatch('pause');
}

function resumeTranslation() {
    actionBatch('resume');
}

function retryFailed() {
    actionBatch('retry_failed');
}

function clearLogs() {
    actionBatch('clear_logs');
    logEntries.value = [];
    progressTotal.value = 0;
    progressDone.value = 0;
    progressOk.value = 0;
    progressErrors.value = 0;
    failedItems.value = [];
}
`

if (code.includes(targetLogic)) {
    code = code.replace(targetLogic, newLogic)
    
    // Also patch UI buttons
    const btnRow = `<button class="btn btn-primary" @click="startTranslate" :disabled="translating || !selectedLang">
              {{ translating ? '⏳ 翻译中...' : '🚀 开始全站翻译' }}
            </button>
            <button v-if="translating" class="btn btn-outline" @click="abortTranslation">
              ⏸ 暂停
            </button>
            <button v-if="!translating && progressTotal > 0 && progressDone < progressTotal" class="btn btn-primary" @click="resumeTranslation">
              ▶ 继续
            </button>
            <button v-if="failedItems.length" class="btn btn-warning" @click="retryFailed" :disabled="translating">
              🔄 重新翻译失败项 ({{ progressErrors }})
            </button>
            <button class="btn btn-outline btn-danger" @click="clearLogs">
              🗑 清空日志
            </button>`
            
    const oldBtnRow = `<button class="btn btn-primary" @click="startTranslate" :disabled="translating || !selectedLang">
              {{ translating ? '⏳ 翻译中...' : '🚀 开始翻译' }}
            </button>
            <button v-if="failedItems.length" class="btn btn-warning" @click="retryFailed" :disabled="translating">
              🔄 重新翻译全部未完成 ({{ failedItems.length }})
            </button>
            <button v-if="translating" class="btn btn-outline" @click="abortTranslation">
              ⛔ 停止
            </button>`

    if (code.includes(oldBtnRow)) {
        code = code.replace(oldBtnRow, btnRow)
    }

    fs.writeFileSync(file, code)
    console.log('patched Translations.vue')
} else {
    console.log('target not found')
}
