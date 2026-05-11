const fs = require('fs')
const path = require('path')

const file = path.join(__dirname, '../src/views/admin/Translations.vue')
let code = fs.readFileSync(file, 'utf8')

// 1. Replace runPages/runItems logic
const start1 = code.indexOf('function abortTranslation() {')
const end1 = code.indexOf('// ── Search mode: untranslated or translated content ──')

const newLogic1 = `let pollTimer = null;

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

const failedItems = ref([])
const channelCollapsed = ref(true)

const startTranslate = async () => {
  if (!selectedLang.value) return alert('请选择目标语言')
  if (!selectedPages.value.length) return alert('请至少选择一个翻译范围')
  aborted = false
  const pages = [...selectedPages.value]
  await runPages(pages)
}

`

code = code.substring(0, start1) + newLogic1 + code.substring(end1)

// 2. Replace granular translation
const start2 = code.indexOf('async function startGranularTranslation() {')
const end2 = code.indexOf('function stopGranularTranslation() {')

const newLogic2 = `async function startGranularTranslation() {
  if (!gtSelectedIds.value.length) return alert('请选择要翻译的项目')
  const itemsList = gtSelectedIds.value.map(id => {
     const item = gtAllItems.value.find(i => i.id === id)
     return { type: granularTab.value, id, itemName: item?.name || item?.name_en || ('#'+id) }
  })
  try {
    await api.httpRequest('/api/translation/batch-start', {
      method: 'POST',
      body: JSON.stringify({ explicitItems: itemsList, lang: gtSelectedLang.value, concurrency: gtConcurrency.value }),
      headers: { 'Content-Type': 'application/json' }
    });
    gtTranslating.value = true;
    translating.value = true;
    gtAddLog('info', \`🚀 精细翻译后台任务已启动！进度请查看上方【全站后台翻译】面板！\`);
    fetchStatus();
    
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (e) {
    gtAddLog('error', \`❌ 启动失败: \${e.message}\`);
  }
}

`

code = code.substring(0, start2) + newLogic2 + code.substring(end2)

// 3. Replace Template UI buttons for full site
const btnRowStart = code.indexOf('<div class="btn-row" style="gap:8px">')
const btnRowEnd = code.indexOf('<!-- Real-time Progress Bar -->')

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

code = code.substring(0, btnRowStart) + newBtnRow + code.substring(btnRowEnd)

fs.writeFileSync(file, code)
console.log('Translations.vue fully patched successfully!')
