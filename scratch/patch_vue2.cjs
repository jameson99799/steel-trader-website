const fs = require('fs')
const path = require('path')

const file = path.join(__dirname, '../src/views/admin/Translations.vue')
let code = fs.readFileSync(file, 'utf8')

// We want to replace `async function runPages(pages)` down to `languages.value = await api.getLanguages()\n}` with our new logic.
const runPagesIndex = code.indexOf('async function runPages(pages) {')
const startSearchIndex = code.indexOf('// ── Search mode: untranslated or translated content ──')

if (runPagesIndex !== -1 && startSearchIndex !== -1) {
  const originalLogic = code.substring(runPagesIndex, startSearchIndex)
  
  const newLogic = `let pollTimer = null;

async function fetchStatus() {
  try {
    const res = await api.httpRequest('/api/translation/batch-status');
    if (res) {
      progressTotal.value = res.total;
      progressDone.value = res.success + res.error; 
      progressOk.value = res.success;
      progressErrors.value = res.error;
      
      translating.value = res.workerRunning && !res.workerPaused;
      
      if (res.logs) {
        logEntries.value = res.logs.map(log => ({
          time: log.updated_at.split(' ')[1] || log.updated_at,
          type: log.status === 'success' ? 'ok' : (log.status === 'error' ? 'error' : (log.status === 'running' ? 'info' : 'warn')),
          msg: \`[\${log.target_lang}] \${log.item_name} \${log.status === 'error' ? '❌ ' + log.error_message : (log.status === 'success' ? '✅ 完成' : '⏳ ' + log.status)}\`
        }));
      }
      
      failedItems.value = new Array(res.error).fill(1);
      
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
      body: JSON.stringify({ pages, lang: selectedLang.value, concurrency: concurrency.value }),
      headers: { 'Content-Type': 'application/json' }
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
      body: JSON.stringify({ explicitItems: itemsList, lang: selectedLang.value, concurrency: concurrency.value }),
      headers: { 'Content-Type': 'application/json' }
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
      body: JSON.stringify({ action }),
      headers: { 'Content-Type': 'application/json' }
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
  code = code.replace(originalLogic, newLogic)
  
  // Now replace UI buttons inside template.
  const btnRowIndex = code.indexOf('<div class="btn-row" style="gap:8px">')
  const progressBarIndex = code.indexOf('<!-- Real-time Progress Bar -->')
  if (btnRowIndex !== -1 && progressBarIndex !== -1) {
      const oldBtnRow = code.substring(btnRowIndex, progressBarIndex)
      const newBtnRow = `<div class="btn-row" style="gap:8px">
            <button class="btn btn-primary" @click="startTranslate" :disabled="translating || !selectedLang">
              {{ translating ? '⏳ 翻译中...' : '🚀 开始翻译' }}
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
            </button>
          </div>

          `
      code = code.replace(oldBtnRow, newBtnRow)
  }

  // Also replace granular buttons
  const gtBtnRowIndex = code.indexOf('<!-- Action Buttons -->')
  const gtProgressIndex = code.indexOf('<!-- Real-time Progress -->')
  if (gtBtnRowIndex !== -1 && gtProgressIndex !== -1) {
      const oldGtBtnRow = code.substring(gtBtnRowIndex, gtProgressIndex)
      const newGtBtnRow = `<!-- Action Buttons -->
        <div class="gt-actions">
          <button class="btn btn-primary" @click="startGranularTranslation" :disabled="translating || gtSelectedItems.length === 0">
            {{ translating ? '⏳ 翻译中...' : '🚀 开始翻译选中项' }}
          </button>
          <button v-if="translating" class="btn btn-outline" @click="abortTranslation">
            ⏸ 暂停
          </button>
        </div>

        `
      code = code.replace(oldGtBtnRow, newGtBtnRow)
  }
  
  fs.writeFileSync(file, code)
  console.log('Successfully patched Translations.vue')
} else {
  console.log('Could not find anchor points in Translations.vue')
}
