const fs = require('fs')
const path = require('path')

const file = path.join(__dirname, '../src/views/admin/Translations.vue')
let code = fs.readFileSync(file, 'utf8')

const targetFnStart = code.indexOf('async function startGranularTranslation() {')
const targetFnEnd = code.indexOf('const gtAllSelected = computed(() => gtFilteredItems.value.length > 0', targetFnStart)

if (targetFnStart !== -1) {
    // Find the end of startGranularTranslation by searching for the start of the next logical block or end of function
    // In Translations.vue, startGranularTranslation is followed by toggleGtSelectAll or something?
    // Let's just find the closing bracket of startGranularTranslation.
    // Since it's huge, I'll use regex.
    
    // Instead of regex, let's look for:
    const searchString = `async function startGranularTranslation() {
  if (!gtSelectedIds.value.length) return alert('请选择要翻译的项目')
  const ids = [...gtSelectedIds.value]`
    
    // Wait, let's just replace the body of startGranularTranslation completely.
    const startIdx = code.indexOf(searchString)
    const endIdx = code.indexOf('function abortGtTranslation()', startIdx)
    
    if (startIdx !== -1 && endIdx !== -1) {
        const replacement = `async function startGranularTranslation() {
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
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (e) {
    gtAddLog('error', \`❌ 启动失败: \${e.message}\`);
  }
}

`
        code = code.substring(0, startIdx) + replacement + code.substring(endIdx)
        fs.writeFileSync(file, code)
        console.log('patched granular translation')
    } else {
        console.log('could not find bounds')
    }
} else {
    console.log('could not find startGranularTranslation')
}
