<template>
  <div class="languages-page">
    <div class="page-header">
      <h1>🌍 语言管理</h1>
      <button class="btn btn-primary" @click="openAdd">+ 添加语言</button>
    </div>

    <div class="card">
      <div class="card-body">
        <table class="table" v-if="languages.length">
          <thead>
            <tr>
              <th>旗帜</th>
              <th>语言名称</th>
              <th>代码</th>
              <th>排序 (1-10)</th>
              <th>AI已翻译</th>
              <th>启用前台</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="lang in languages" :key="lang.id" :class="{ 'row-disabled': !lang.status }">
              <td style="font-size:22px">{{ lang.flag }}</td>
              <td><strong>{{ lang.name }}</strong></td>
              <td><code class="code-tag">{{ lang.code }}</code></td>
              <td>
                <select class="select-sm" v-model="lang.sort_order" @change="saveLang(lang)">
                  <option v-for="n in 10" :key="n" :value="n">{{ n }}</option>
                </select>
              </td>
              <td>
                <span v-if="lang.ai_translated" class="badge badge-success">✓ 已翻译</span>
                <span v-else class="badge badge-gray">未翻译</span>
              </td>
              <td>
                <label class="switch">
                  <input type="checkbox" :checked="!!lang.status" :disabled="lang.code === 'en'"
                         @change="e => toggleStatus(lang, e.target.checked)" />
                  <span class="slider"></span>
                </label>
              </td>
              <td>
                <button v-if="lang.code !== 'en'" class="btn btn-sm btn-danger" @click="deleteLang(lang)">删除</button>
                <span v-else class="default-tag">默认</span>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else class="empty-tip">暂无语言，点击「添加语言」开始配置</p>
      </div>
    </div>

    <!-- Add Language Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal" style="max-width:500px">
        <div class="modal-header">
          <h3>添加语言</h3>
          <button class="modal-close" @click="showModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <!-- Smart search input -->
          <div class="form-group">
            <label>语言 / 国家名称 <span class="hint">支持中文或英文搜索，如「美」「法」「Spain」</span></label>
            <div class="autocomplete-wrap">
              <input
                v-model="searchText"
                class="form-control"
                placeholder="输入国家/语言名称搜索..."
                @input="onSearchInput"
                @keydown.down.prevent="moveDown"
                @keydown.up.prevent="moveUp"
                @keydown.enter.prevent="selectHighlighted"
                autocomplete="off"
              />
              <div v-if="suggestions.length" class="suggestion-list">
                <div
                  v-for="(s, i) in suggestions"
                  :key="s.code"
                  class="suggestion-item"
                  :class="{ highlighted: i === highlightIdx }"
                  @mousedown.prevent="selectSuggestion(s)"
                >
                  <span class="s-flag">{{ s.flag }}</span>
                  <span class="s-name">{{ s.zh }} / {{ s.en }}</span>
                  <span class="s-code">{{ s.code }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="grid-3">
            <div class="form-group">
              <label>显示名称 *</label>
              <input v-model="form.name" class="form-control" placeholder="如 Chinese" />
            </div>
            <div class="form-group">
              <label>代码 * <span class="hint">ISO</span></label>
              <input v-model="form.code" class="form-control" placeholder="zh" maxlength="8" />
            </div>
            <div class="form-group">
              <label>旗帜 Emoji</label>
              <input v-model="form.flag" class="form-control" placeholder="🇨🇳" maxlength="4" />
            </div>
          </div>

          <div class="form-group">
            <label>排序 (1 = 最前)</label>
            <select v-model="form.sort_order" class="form-control">
              <option v-for="n in 10" :key="n" :value="n">{{ n }}</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showModal = false">取消</button>
          <button class="btn btn-primary" :disabled="loading" @click="addLang">
            {{ loading ? '添加中...' : '添加语言' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../../api'

// ─── Built-in country/language database ───────────────────────────────────────
const COUNTRY_DB = [
  { zh:'英国', en:'English (UK)', code:'en-gb', flag:'🇬🇧' },
  { zh:'美国', en:'English (US)', code:'en-us', flag:'🇺🇸' },
  { zh:'中国', en:'Chinese (Simplified)', code:'zh', flag:'🇨🇳' },
  { zh:'台湾', en:'Chinese (Traditional)', code:'zh-tw', flag:'🇹🇼' },
  { zh:'日本', en:'Japanese', code:'ja', flag:'🇯🇵' },
  { zh:'韩国', en:'Korean', code:'ko', flag:'🇰🇷' },
  { zh:'法国', en:'French', code:'fr', flag:'🇫🇷' },
  { zh:'德国', en:'German', code:'de', flag:'🇩🇪' },
  { zh:'西班牙', en:'Spanish', code:'es', flag:'🇪🇸' },
  { zh:'葡萄牙', en:'Portuguese', code:'pt', flag:'🇵🇹' },
  { zh:'巴西', en:'Portuguese (Brazil)', code:'pt-br', flag:'🇧🇷' },
  { zh:'意大利', en:'Italian', code:'it', flag:'🇮🇹' },
  { zh:'俄罗斯', en:'Russian', code:'ru', flag:'🇷🇺' },
  { zh:'阿拉伯', en:'Arabic', code:'ar', flag:'🇸🇦' },
  { zh:'沙特阿拉伯', en:'Arabic (Saudi)', code:'ar-sa', flag:'🇸🇦' },
  { zh:'阿联酋', en:'Arabic (UAE)', code:'ar-ae', flag:'🇦🇪' },
  { zh:'荷兰', en:'Dutch', code:'nl', flag:'🇳🇱' },
  { zh:'波兰', en:'Polish', code:'pl', flag:'🇵🇱' },
  { zh:'土耳其', en:'Turkish', code:'tr', flag:'🇹🇷' },
  { zh:'印度', en:'Hindi', code:'hi', flag:'🇮🇳' },
  { zh:'印度尼西亚', en:'Indonesian', code:'id', flag:'🇮🇩' },
  { zh:'马来西亚', en:'Malay', code:'ms', flag:'🇲🇾' },
  { zh:'越南', en:'Vietnamese', code:'vi', flag:'🇻🇳' },
  { zh:'泰国', en:'Thai', code:'th', flag:'🇹🇭' },
  { zh:'菲律宾', en:'Filipino', code:'fil', flag:'🇵🇭' },
  { zh:'以色列', en:'Hebrew', code:'he', flag:'🇮🇱' },
  { zh:'伊朗', en:'Persian (Farsi)', code:'fa', flag:'🇮🇷' },
  { zh:'希腊', en:'Greek', code:'el', flag:'🇬🇷' },
  { zh:'捷克', en:'Czech', code:'cs', flag:'🇨🇿' },
  { zh:'罗马尼亚', en:'Romanian', code:'ro', flag:'🇷🇴' },
  { zh:'匈牙利', en:'Hungarian', code:'hu', flag:'🇭🇺' },
  { zh:'瑞典', en:'Swedish', code:'sv', flag:'🇸🇪' },
  { zh:'挪威', en:'Norwegian', code:'no', flag:'🇳🇴' },
  { zh:'丹麦', en:'Danish', code:'da', flag:'🇩🇰' },
  { zh:'芬兰', en:'Finnish', code:'fi', flag:'🇫🇮' },
  { zh:'乌克兰', en:'Ukrainian', code:'uk', flag:'🇺🇦' },
  { zh:'巴基斯坦', en:'Urdu', code:'ur', flag:'🇵🇰' },
  { zh:'孟加拉国', en:'Bengali', code:'bn', flag:'🇧🇩' },
  { zh:'墨西哥', en:'Spanish (Mexico)', code:'es-mx', flag:'🇲🇽' },
  { zh:'阿根廷', en:'Spanish (Argentina)', code:'es-ar', flag:'🇦🇷' },
  { zh:'哥伦比亚', en:'Spanish (Colombia)', code:'es-co', flag:'🇨🇴' },
  { zh:'智利', en:'Spanish (Chile)', code:'es-cl', flag:'🇨🇱' },
  { zh:'埃及', en:'Arabic (Egypt)', code:'ar-eg', flag:'🇪🇬' },
  { zh:'南非', en:'Afrikaans', code:'af', flag:'🇿🇦' },
  { zh:'尼日利亚', en:'Yoruba', code:'yo', flag:'🇳🇬' },
  { zh:'肯尼亚', en:'Swahili', code:'sw', flag:'🇰🇪' },
  { zh:'斯洛伐克', en:'Slovak', code:'sk', flag:'🇸🇰' },
  { zh:'保加利亚', en:'Bulgarian', code:'bg', flag:'🇧🇬' },
  { zh:'克罗地亚', en:'Croatian', code:'hr', flag:'🇭🇷' },
  { zh:'塞尔维亚', en:'Serbian', code:'sr', flag:'🇷🇸' },
  { zh:'立陶宛', en:'Lithuanian', code:'lt', flag:'🇱🇹' },
  { zh:'拉脱维亚', en:'Latvian', code:'lv', flag:'🇱🇻' },
  { zh:'爱沙尼亚', en:'Estonian', code:'et', flag:'🇪🇪' },
  { zh:'冰岛', en:'Icelandic', code:'is', flag:'🇮🇸' },
  { zh:'斯洛文尼亚', en:'Slovenian', code:'sl', flag:'🇸🇮' },
  { zh:'澳大利亚', en:'English (Australia)', code:'en-au', flag:'🇦🇺' },
  { zh:'加拿大', en:'English (Canada)', code:'en-ca', flag:'🇨🇦' },
  { zh:'新西兰', en:'English (New Zealand)', code:'en-nz', flag:'🇳🇿' },
  { zh:'新加坡', en:'English (Singapore)', code:'en-sg', flag:'🇸🇬' },
  { zh:'卡塔尔', en:'Arabic (Qatar)', code:'ar-qa', flag:'🇶🇦' },
  { zh:'科威特', en:'Arabic (Kuwait)', code:'ar-kw', flag:'🇰🇼' },
  { zh:'伊拉克', en:'Arabic (Iraq)', code:'ar-iq', flag:'🇮🇶' },
  { zh:'约旦', en:'Arabic (Jordan)', code:'ar-jo', flag:'🇯🇴' },
  { zh:'黎巴嫩', en:'Arabic (Lebanon)', code:'ar-lb', flag:'🇱🇧' },
  { zh:'摩洛哥', en:'Arabic (Morocco)', code:'ar-ma', flag:'🇲🇦' },
  { zh:'瑞士', en:'German (Switzerland)', code:'de-ch', flag:'🇨🇭' },
  { zh:'奥地利', en:'German (Austria)', code:'de-at', flag:'🇦🇹' },
  { zh:'比利时', en:'French (Belgium)', code:'fr-be', flag:'🇧🇪' },
]

const languages = ref([])
const showModal = ref(false)
const loading = ref(false)
const form = ref({ name: '', code: '', flag: '', sort_order: 5 })
const searchText = ref('')
const suggestions = ref([])
const highlightIdx = ref(-1)

const load = async () => {
  languages.value = await api.getLanguages()
}
onMounted(load)

const openAdd = () => {
  form.value = { name: '', code: '', flag: '', sort_order: 5 }
  searchText.value = ''
  suggestions.value = []
  highlightIdx.value = -1
  showModal.value = true
}

const onSearchInput = () => {
  highlightIdx.value = -1
  const q = searchText.value.trim().toLowerCase()
  if (!q) { suggestions.value = []; return }
  suggestions.value = COUNTRY_DB.filter(c =>
    c.zh.includes(searchText.value) ||
    c.en.toLowerCase().includes(q) ||
    c.code.toLowerCase().includes(q)
  ).slice(0, 10)
}

const selectSuggestion = (s) => {
  form.value.name = s.en
  form.value.code = s.code
  form.value.flag = s.flag
  searchText.value = `${s.flag} ${s.zh} / ${s.en}`
  suggestions.value = []
}

const moveDown = () => {
  if (highlightIdx.value < suggestions.value.length - 1) highlightIdx.value++
}
const moveUp = () => {
  if (highlightIdx.value > 0) highlightIdx.value--
}
const selectHighlighted = () => {
  if (highlightIdx.value >= 0 && suggestions.value[highlightIdx.value]) {
    selectSuggestion(suggestions.value[highlightIdx.value])
  }
}

const addLang = async () => {
  if (!form.value.name.trim() || !form.value.code.trim()) return alert('请填写语言名称和代码')
  loading.value = true
  try {
    await api.createLanguage({ ...form.value, code: form.value.code.toLowerCase() })
    showModal.value = false
    await load()
  } catch (e) {
    alert(e.message)
  } finally {
    loading.value = false
  }
}

const saveLang = async (lang) => {
  try { await api.updateLanguage(lang.id, lang) } catch (e) { console.error(e) }
}

const toggleStatus = async (lang, checked) => {
  lang.status = checked ? 1 : 0
  await saveLang(lang)
}

const deleteLang = async (lang) => {
  if (!confirm(`确定删除语言「${lang.name}」吗？\n该语言的所有翻译数据也将一并删除。`)) return
  try {
    await api.deleteLanguage(lang.id)
    await load()
  } catch (e) { alert(e.message) }
}
</script>

<style scoped>
.languages-page { }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-header h1 { margin: 0; font-size: 22px; }

.card { background: white; border-radius: 12px; box-shadow: 0 1px 6px rgba(0,0,0,0.07); }
.card-body { padding: 20px; }

.table { width: 100%; border-collapse: collapse; }
.table th, .table td { padding: 12px 14px; text-align: left; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
.table th { background: #f8fafc; font-weight: 700; color: #64748b; font-size: 12px; text-transform: uppercase; }
.row-disabled td { opacity: 0.45; }

.code-tag { background: #f1f5f9; padding: 2px 7px; border-radius: 4px; font-size: 12px; font-family: monospace; }
.select-sm { padding: 4px 8px; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 13px; }
.badge { padding: 3px 10px; border-radius: 100px; font-size: 12px; font-weight: 600; }
.badge-success { background: #dcfce7; color: #166534; }
.badge-gray { background: #f1f5f9; color: #94a3b8; }
.default-tag { font-size: 12px; color: #94a3b8; }
.empty-tip { color: #94a3b8; text-align: center; padding: 30px; font-size: 14px; }

/* Toggle switch */
.switch { position: relative; display: inline-block; width: 40px; height: 22px; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; inset: 0; background: #cbd5e1; border-radius: 22px; transition: .3s; }
.slider:before { position: absolute; content: ''; height: 16px; width: 16px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: .3s; }
input:checked + .slider { background: #22c55e; }
input:checked + .slider:before { transform: translateX(18px); }
input:disabled + .slider { opacity: 0.5; cursor: not-allowed; }

/* Modal form */
.grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
@media(max-width:600px){ .grid-3 { grid-template-columns: 1fr; } }
.form-group { margin-bottom: 14px; }
.form-group label { display: block; font-weight: 600; font-size: 14px; margin-bottom: 5px; color: #334155; }
.form-control { width: 100%; padding: 9px 12px; border: 2px solid #e2e8f0; border-radius: 6px; font-size: 14px; box-sizing: border-box; }
.form-control:focus { outline: none; border-color: #3b82f6; }
.hint { color: #94a3b8; font-size: 12px; font-weight: 400; }

/* Autocomplete */
.autocomplete-wrap { position: relative; }
.suggestion-list { position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1.5px solid #e2e8f0; border-radius: 8px; box-shadow: 0 6px 24px rgba(0,0,0,0.1); z-index: 100; max-height: 260px; overflow-y: auto; }
.suggestion-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px; cursor: pointer; font-size: 14px; border-bottom: 1px solid #f1f5f9; }
.suggestion-item:hover, .suggestion-item.highlighted { background: #eff6ff; }
.s-flag { font-size: 20px; flex-shrink: 0; }
.s-name { flex: 1; color: #334155; }
.s-code { font-size: 11px; font-family: monospace; background: #f1f5f9; padding: 2px 6px; border-radius: 3px; color: #64748b; }

/* Buttons */
.btn { padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; border: none; font-size: 14px; transition: all .2s; }
.btn-primary { background: #2563eb; color: white; }
.btn-primary:hover { background: #1d4ed8; }
.btn-secondary { background: #f1f5f9; color: #334155; }
.btn-danger { background: white; color: #ef4444; border: 1.5px solid #ef4444; }
.btn-danger:hover { background: #fef2f2; }
.btn-sm { padding: 4px 10px; font-size: 12px; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
