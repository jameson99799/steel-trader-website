<template>
  <div class="admin-page">
    <div class="page-header">
      <h2>📰 新闻管理</h2>
      <div style="display:flex;gap:8px;">
        <div style="display:flex;align-items:center;background:#f8fafc;padding:2px 8px;border-radius:6px;border:1px solid #e2e8f0;">
          <span style="font-size:13px;color:#64748b;margin-right:6px;">文章作者:</span>
          <input v-model="defaultAuthor" @blur="saveAuthor" class="form-control" style="width:180px;height:28px;padding:2px 8px;font-size:13px;" placeholder="全局作者名称" />
        </div>
        <button class="btn btn-outline" @click="showCatModal = true" style="color:#7c3aed;border-color:#c4b5fd;">📂 分组管理</button>
        <button class="btn btn-outline" @click="showRoofingModal = true" style="color:#d97706;border-color:#fcd34d;">📐 3D瓦型图管理</button>
        <button class="btn btn-primary" @click="openCreate">+ 新建文章</button>
      </div>
    </div>

    <!-- Category tabs -->
    <div class="cat-tabs">
      <span :class="['cat-tab', !filterCatId ? 'active' : '']" @click="filterCatId = null; loadNews()">全部 ({{ totalCount }})</span>
      <span v-for="c in categories" :key="c.id" :class="['cat-tab', filterCatId === c.id ? 'active' : '']" @click="filterCatId = c.id; loadNews()">
        {{ c.name }} ({{ c.count || 0 }})
      </span>
    </div>

    <!-- Batch action bar -->
    <div v-if="selectedIds.length" class="batch-bar">
      <span>已选 <b>{{ selectedIds.length }}</b> 篇文章</span>
      <select v-model="batchMoveTo" class="form-control" style="max-width:180px;padding:6px 10px;font-size:13px;">
        <option value="">移动到分组...</option>
        <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
      <button class="btn btn-sm btn-primary" :disabled="!batchMoveTo" @click="batchMove">确定移动</button>
      <button class="btn btn-sm btn-outline" @click="selectedIds = []">取消选择</button>
    </div>

    <div class="news-list">
      <table class="data-table" v-if="newsList.length">
        <thead>
          <tr>
            <th style="width:36px;"><input type="checkbox" :checked="allChecked" @change="toggleAll" /></th>
            <th>封面</th><th>标题</th><th>分组</th><th>状态</th><th>排序</th><th>创建时间</th><th>操作</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="item in newsList" :key="item.id">
            <tr>
              <td><input type="checkbox" :value="item.id" v-model="selectedIds" /></td>
              <td><img v-if="item.cover_image" :src="item.cover_image" class="thumb" /></td>
              <td>
                <div class="title-wrap">{{ item.title }}</div>
                <div class="title-en">{{ item.title_en }}</div>
              </td>
              <td><span class="cat-badge" v-if="item.category_name">{{ item.category_name }}</span></td>
              <td><span :class="['status-badge', item.status ? 'active' : 'inactive']">{{ item.status ? '已发布' : '草稿' }}</span></td>
              <td>{{ item.sort_order }}</td>
              <td>{{ item.created_at?.substring(0,10) }}</td>
              <td class="actions">
                <button class="btn btn-sm btn-outline" @click="openEdit(item)">编辑</button>
                
                <div class="translation-dropdown" style="position:relative;display:inline-block" @click.stop>
                  <button class="btn btn-sm btn-outline" @click="toggleTranslateMenu(item)" style="color:#059669;border-color:#059669;" :disabled="translatingId === item.id">
                    {{ translatingId === item.id ? '翻译中...' : '🌐 翻译 ▼' }}
                  </button>
                  <div v-if="activeTranslateMenu === item.id" class="dropdown-menu shadow" style="position:absolute;top:100%;right:0;background:white;border:1px solid #ddd;border-radius:6px;z-index:100;min-width:180px;padding:8px 0;margin-top:4px;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
                    <div v-if="item._loadingStatus" style="padding:8px 12px;font-size:13px;color:#666;text-align:center;">正在检测状态...</div>
                    <div v-else class="lang-list">
                      <div style="padding:0 8px 8px;border-bottom:1px solid #f1f5f9;"><button class="btn btn-primary btn-sm" @click="translateNews(item)" style="width:100%">一键翻译所有语言</button></div>
                      <div v-for="l in item._translationStatus" :key="l.code" 
                           @click="translateNews(item, l.code, l.name)" 
                           :style="{ color: l.translated ? '#16a34a' : '#2563eb', cursor: 'pointer', padding: '8px 12px', borderBottom: '1px solid #f8fafc', fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center' }">
                        <span style="display:inline-block;width:6px;height:6px;border-radius:50%;margin-right:8px;" :style="{ background: l.translated ? '#16a34a' : '#2563eb' }"></span>
                        {{ l.name }} <span style="margin-left:auto;font-size:11px;opacity:0.8;">{{ l.translated ? '已翻译' : '未翻译' }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <button class="btn btn-sm btn-danger" @click="deleteItem(item.id)">删除</button>
              </td>
            </tr>
            <tr v-if="translatingItemLog && translatingItemLog.id === item.id" class="log-row">
              <td colspan="8" style="padding: 0; border: none;">
                <div style="background: #1e293b; color: #a5b4fc; padding: 12px 16px; margin: 0 16px 16px; border-radius: 6px; font-family: 'Fira Mono', monospace; font-size: 13px; max-height: 250px; overflow-y: auto;">
                  <div style="color: white; margin-bottom: 8px; font-weight: 600; display:flex; justify-content:space-between;">
                    <span>📡 翻译日志 - {{ translatingItemLog.langName }}</span>
                    <div>
                      <button v-if="translatingId === item.id" @click="translatingItemLog.aborted = true" style="background:transparent;border:1px solid #ef4444;color:#ef4444;cursor:pointer;margin-right:16px;border-radius:4px;padding:2px 8px;font-size:12px;">🛑 中止翻译</button>
                      <button @click="translatingItemLog = null" style="background:none;border:none;color:#94a3b8;cursor:pointer;">✕ 关闭</button>
                    </div>
                  </div>
                  <pre style="margin:0;white-space:pre-wrap;line-height:1.5;">{{ translatingItemLog.log }}</pre>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
      <div v-else class="empty">暂无文章，点击"新建文章"开始创建</div>
    </div>

    <!-- Article Create/Edit Modal -->
    <div class="modal-overlay" v-if="showModal" @click.self="showModal = false">
      <div class="modal-wrap">
        <div class="modal-header">
          <h3>{{ editId ? '编辑文章' : '新建文章' }}</h3>
          <button class="modal-close" @click="showModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-tabs">
            <button :class="['tab', activeTab === 'basic' ? 'active' : '']" @click="activeTab = 'basic'">基本信息</button>
            <button :class="['tab', activeTab === 'content' ? 'active' : '']" @click="activeTab = 'content'">文章内容</button>
            <button :class="['tab', activeTab === 'seo' ? 'active' : '']" @click="activeTab = 'seo'">SEO设置</button>
          </div>

          <!-- Basic Tab -->
          <div v-show="activeTab === 'basic'" class="tab-content">
            <div class="form-group">
              <label>文章分组</label>
              <select v-model="form.category_id" class="form-control">
                <option :value="null">未分组</option>
                <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>标题（中文）<span class="req">*</span></label>
              <input v-model="form.title" class="form-control" placeholder="文章标题" />
            </div>
            <div class="form-group">
              <label>标题（英文）</label>
              <input v-model="form.title_en" class="form-control" placeholder="Article title in English" />
            </div>
            <div class="form-group">
              <label>摘要（中文）</label>
              <textarea v-model="form.summary" class="form-control" rows="3" placeholder="文章简介"></textarea>
            </div>
            <div class="form-group">
              <label>摘要（英文）</label>
              <textarea v-model="form.summary_en" class="form-control" rows="3" placeholder="Article summary in English"></textarea>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>封面图片</label>
                <div style="display:flex;gap:8px;align-items:center;">
                  <input type="file" @change="handleCoverUpload" accept="image/*" class="form-control" style="flex:1" />
                  <button type="button" class="btn btn-sm btn-outline" @click="pickCoverFromLib" style="white-space:nowrap;color:#7c3aed;border-color:#c4b5fd;">📂 从图库选择</button>
                </div>
                <img v-if="form.cover_preview" :src="form.cover_preview" class="preview-img" />
              </div>
              <div class="form-group">
                <label>发布状态</label>
                <select v-model="form.status" class="form-control">
                  <option :value="1">已发布</option>
                  <option :value="0">草稿</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label>排序（数字越小越靠前）</label>
              <input v-model.number="form.sort_order" type="number" class="form-control" />
            </div>
            <div class="form-group">
              <label>前台渲染模式</label>
              <select v-model="form.render_mode" class="form-control">
                <option value="direct">📄 直接渲染（推荐 SEO）— 忽略文章内置 &lt;style&gt; 标签</option>
                <option value="iframe">🖼 iframe 隔离（支持完整 HTML 页面样式）</option>
              </select>
              <p class="form-hint" style="margin-top:6px">
                <strong>直接渲染</strong>：文章内容 HTML 直接输出到页面，Google 可完整收录，适合纯文字/图文内容。<br/>
                <strong>iframe 隔离</strong>：如果你粘贴了带 &lt;style&gt; 标签的完整 HTML 页面，选此项，样式不影响网站其他部分，但 SEO 效果略低。
              </p>
            </div>
          </div>


          <!-- Content Tab -->
          <div v-show="activeTab === 'content'" class="tab-content">
            <p class="form-hint">支持粘贴 HTML 代码、可视化编辑、点击图片替换、上传图片</p>
            <div class="editor-mode-bar">
              <div class="mode-tabs">
                <span :class="['mode-tab', newsEditorMode === 'visual' ? 'active' : '']" @click="switchNewsMode('visual')">✏️ 可视化编辑</span>
                <span :class="['mode-tab', newsEditorMode === 'html' ? 'active' : '']" @click="switchNewsMode('html')">📝 HTML代码</span>
                <span :class="['mode-tab', newsEditorMode === 'preview' ? 'active' : '']" @click="switchNewsMode('preview')">👁 预览</span>
              </div>
              <div class="editor-actions">
                <button type="button" class="editor-btn" @click="insertNewsImage">📷 插入图片</button>
                <button type="button" class="fullscreen-btn" @click="isFullscreen = !isFullscreen">
                  {{ isFullscreen ? '✕ 退出全屏' : '⛶ 全屏' }}
                </button>
              </div>
            </div>

            <div :class="['editor-wrap', isFullscreen ? 'is-fullscreen' : '']">
              <textarea
                v-if="newsEditorMode === 'html'"
                v-model="form.content"
                class="html-editor"
                placeholder="<div>&#10;  <h2>文章内容</h2>&#10;  <p>在此处粘贴 HTML 内容...</p>&#10;</div>"
                spellcheck="false"
              ></textarea>
              <div
                v-else-if="newsEditorMode === 'visual'"
                ref="newsVisualEl"
                class="visual-editor"
                contenteditable="true"
                @input="onNewsVisualInput"
                @click="onNewsVisualClick"
                @paste="onNewsVisualPaste"
              ></div>
              <div v-else class="html-preview" v-html="form.content"></div>
            </div>
            <input type="file" ref="newsImgInput" accept="image/*" style="display:none" @change="handleNewsImgUpload" />
          </div>

          <!-- SEO Tab -->
          <div v-show="activeTab === 'seo'" class="tab-content">
            <div class="form-group">
              <label>SEO标题</label>
              <input v-model="form.seo_title" class="form-control" placeholder="页面SEO标题，留空则使用文章标题" />
            </div>
            <div class="form-group">
              <label>SEO描述</label>
              <textarea v-model="form.seo_description" class="form-control" rows="3" placeholder="页面meta description（150字以内效果最佳）"></textarea>
              <small>{{ (form.seo_description || '').length }}/160 字符</small>
            </div>
            <div class="form-group">
              <label>SEO关键词</label>
              <input v-model="form.seo_keywords" class="form-control" placeholder="关键词1, 关键词2, 关键词3" />
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="showModal = false">取消</button>
          <button class="btn btn-primary" @click="save" :disabled="saving">{{ saving ? '保存中...' : '保存文章' }}</button>
        </div>
      </div>
    </div>

    <!-- Category Management Modal -->
    <div class="modal-overlay" v-if="showCatModal" @click.self="showCatModal = false" style="z-index:10050">
      <div class="modal-wrap" style="max-width:520px;">
        <div class="modal-header" style="background:#f5f3ff;color:#7c3aed;">
          <h3>📂 文章分组管理</h3>
          <button class="modal-close" @click="showCatModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div style="display:flex;gap:8px;margin-bottom:16px;">
            <input v-model="newCatName" class="form-control" placeholder="分组名称（中文）" style="flex:1" />
            <input v-model="newCatNameEn" class="form-control" placeholder="English name" style="flex:1" />
            <button class="btn btn-primary btn-sm" @click="addCategory" :disabled="!newCatName.trim()">添加</button>
          </div>
          <div v-if="categories.length" class="cat-list">
            <div v-for="c in categories" :key="c.id" class="cat-item">
              <div v-if="editingCatId !== c.id" class="cat-info">
                <span class="cat-name">{{ c.name }} <small style="color:#94a3b8;">{{ c.name_en }}</small></span>
                <span class="cat-count">{{ c.count || 0 }} 篇</span>
              </div>
              <div v-else class="cat-edit-row">
                <input v-model="editCatName" class="form-control" style="flex:1;padding:6px 10px;" />
                <input v-model="editCatNameEn" class="form-control" style="flex:1;padding:6px 10px;" placeholder="English" />
              </div>
              <div class="cat-actions">
                <template v-if="editingCatId !== c.id">
                  <button class="btn btn-sm btn-outline" @click="startEditCat(c)">编辑</button>
                  <button class="btn btn-sm btn-danger" @click="deleteCat(c)">删除</button>
                </template>
                <template v-else>
                  <button class="btn btn-sm btn-primary" @click="saveEditCat(c.id)">保存</button>
                  <button class="btn btn-sm btn-outline" @click="editingCatId = null">取消</button>
                </template>
              </div>
            </div>
          </div>
          <p v-else style="color:#94a3b8;text-align:center;padding:20px;">暂无分组，请添加</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="showCatModal = false">关闭</button>
        </div>
      </div>
    </div>

    <!-- Image Source Chooser (for news content visual editor) -->
    <div v-if="showNewsImgChooser" class="modal-overlay" @click.self="showNewsImgChooser=false" style="z-index:10100">
      <div class="modal-wrap" style="max-width:360px;">
        <div class="modal-header" style="background:#f0fdf4;color:#16a34a;">
          <h3>🖼️ 选择图片来源</h3>
          <button class="modal-close" @click="showNewsImgChooser=false">✕</button>
        </div>
        <div class="modal-body" style="padding:24px;">
          <div class="img-chooser-grid">
            <button class="img-chooser-btn" @click="newsPickFromComputer">
              <span style="font-size:32px;">💻</span>
              <span style="font-size:14px;font-weight:600;">从电脑上传</span>
              <span style="font-size:12px;color:#94a3b8;">选择本地文件上传</span>
            </button>
            <button class="img-chooser-btn" @click="newsPickFromMediaLib">
              <span style="font-size:32px;">📂</span>
              <span style="font-size:14px;font-weight:600;">从图库选择</span>
              <span style="font-size:12px;color:#94a3b8;">使用后台图库图片</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- News Media Library Browser -->
    <div v-if="showNewsMediaBrowser" class="modal-overlay" @click.self="showNewsMediaBrowser=false" style="z-index:10200">
      <div class="modal-wrap" style="max-width:750px;">
        <div class="modal-header" style="background:#f0fdf4;color:#16a34a;">
          <h3>📂 从图库选择图片</h3>
          <button class="modal-close" @click="showNewsMediaBrowser=false">✕</button>
        </div>
        <div class="modal-body">
          <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
            <input v-model="newsMediaSearch" class="form-control" placeholder="搜索文件名..." @input="loadNewsMedia" style="max-width:200px;" />
            <select v-model="newsMediaGroup" class="form-control" @change="loadNewsMedia" style="max-width:140px;">
              <option value="">全部分组</option>
              <option v-for="g in newsMediaGroups" :key="g.id" :value="g.id">{{ g.name }}</option>
            </select>
          </div>
          <div v-if="newsMediaItems.length" class="news-media-grid">
            <div v-for="item in newsMediaItems" :key="item.id" class="news-media-item" @click="selectNewsMediaImage(item)">
              <img :src="item.filepath" />
              <div class="news-media-name">{{ item.original_filename || item.filename }}</div>
            </div>
          </div>
          <p v-else style="color:#94a3b8;text-align:center;padding:20px;">暂无图片</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" @click="showNewsMediaBrowser=false">取消</button>
        </div>
      </div>
    </div>
    
    

    <!-- Roofing Profiles Modal -->
    <Teleport to="body">
      <div class="modal-overlay" v-if="showRoofingModal" @click.self="showRoofingModal = false" style="z-index: 10050">
        <div class="modal-wrap" style="max-width:1200px; width: 95%; height: 85vh; display: flex; flex-direction: column; padding: 0;">
          <div class="modal-header" style="padding: 15px 20px;">
            <h3 style="margin:0;">📐 3D 瓦型图管理与生成器</h3>
            <button class="modal-close" @click="showRoofingModal = false">✕</button>
          </div>
          <div class="modal-body" style="flex: 1; overflow-y: auto; padding: 20px;">
            <RoofingProfileManager />
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import api from '../../api'
import RoofingProfileManager from '../../components/admin/RoofingProfileManager.vue'

const newsList = ref([])
const showModal = ref(false)
const editId = ref(null)
const saving = ref(false)
const activeTab = ref('basic')
const isFullscreen = ref(false)
const translatingId = ref(null)
const showRoofingModal = ref(false)

// ─── Category state ──────────────────────────────────────────────────────────
const categories = ref([])
const filterCatId = ref(null)
const totalCount = ref(0)
const selectedIds = ref([])
const batchMoveTo = ref('')
const showCatModal = ref(false)
const newCatName = ref('')
const newCatNameEn = ref('')
const editingCatId = ref(null)
const editCatName = ref('')
const editCatNameEn = ref('')

const allChecked = computed(() => newsList.value.length > 0 && selectedIds.value.length === newsList.value.length)
function toggleAll(e) {
  selectedIds.value = e.target.checked ? newsList.value.map(n => n.id) : []
}

async function loadCategories() {
  try { categories.value = await api.getNewsCategories() } catch (e) { console.error(e) }
}
async function addCategory() {
  if (!newCatName.value.trim()) return
  await api.createNewsCategory({ name: newCatName.value.trim(), name_en: newCatNameEn.value.trim() })
  newCatName.value = ''
  newCatNameEn.value = ''
  await loadCategories()
}
function startEditCat(c) {
  editingCatId.value = c.id
  editCatName.value = c.name
  editCatNameEn.value = c.name_en || ''
}
async function saveEditCat(id) {
  await api.updateNewsCategory(id, { name: editCatName.value, name_en: editCatNameEn.value })
  editingCatId.value = null
  await loadCategories()
}
async function deleteCat(c) {
  if (!confirm(`确认删除分组「${c.name}」吗？其中的文章会移至其他分组。`)) return
  await api.deleteNewsCategory(c.id)
  if (filterCatId.value === c.id) filterCatId.value = null
  await loadCategories()
  await loadNews()
}
async function batchMove() {
  if (!batchMoveTo.value || !selectedIds.value.length) return
  await api.moveArticles(selectedIds.value, parseInt(batchMoveTo.value))
  selectedIds.value = []
  batchMoveTo.value = ''
  await loadCategories()
  await loadNews()
}

// Dropdown and Log state
const activeTranslateMenu = ref(null)
const translatingItemLog = ref(null)

const defaultAuthor = ref('Jameson-SUNSEA STEEL')

// Close menu when clicking outside
onMounted(async () => {
  document.addEventListener('click', () => {
    activeTranslateMenu.value = null
  })
  loadCategories()
  loadNews()
  try {
    const seoRes = await fetch('/api/seo', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('adminToken') } }).then(r => r.json())
    if (seoRes && seoRes.default_news_author !== undefined) {
      defaultAuthor.value = seoRes.default_news_author || 'Jameson-SUNSEA STEEL'
    }
  } catch (e) {
    console.error('Failed to load author', e)
  }
})

async function saveAuthor() {
  try {
    const seoRes = await fetch('/api/seo', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('adminToken') } }).then(r => r.json())
    const formData = new FormData()
    // Append all existing fields so we don't overwrite them
    Object.keys(seoRes).forEach(k => {
      if (k !== 'id' && k !== 'updated_at' && seoRes[k] !== null && seoRes[k] !== undefined) {
        formData.append(k, seoRes[k])
      }
    })
    formData.set('default_news_author', defaultAuthor.value)
    
    await fetch('/api/seo', {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + localStorage.getItem('adminToken') },
      body: formData
    })
  } catch (e) {
    console.error('Failed to save author', e)
    alert('保存作者失败')
  }
}

async function toggleTranslateMenu(item) {
  if (activeTranslateMenu.value === item.id) {
    activeTranslateMenu.value = null
    return
  }
  activeTranslateMenu.value = item.id
  if (item._translationStatus) return // Already loaded

  item._loadingStatus = true
  try {
    const res = await api.getItemTranslationStatus('news', item.id)
    item._translationStatus = res.status || []
  } catch (e) {
    console.error('Failed to load status', e)
  }
  item._loadingStatus = false
}

async function translateNews(item, targetLangCode = null, targetLangName = null) {
  const langLabel = targetLangName ? targetLangName : '所有未翻译的语言'
  if (!confirm(`开始翻译文章「${item.title_en || item.title}」(${langLabel})？`)) return
  
  translatingId.value = item.id
  activeTranslateMenu.value = null
  translatingItemLog.value = { id: item.id, langName: targetLangName || '全部语言', log: '🚀 开始执行底层翻译引擎...\n' }
  const logAppend = (msg) => { translatingItemLog.value.log += msg + '\n' }
  
  try {
    let langsToRun = []
    if (targetLangCode) {
      langsToRun.push({ code: targetLangCode, name: targetLangName })
    } else {
      if (item._translationStatus) {
        langsToRun = [...item._translationStatus]
      } else {
        const statusRes = await api.getItemTranslationStatus('news', item.id)
        langsToRun = statusRes.status || []
        item._translationStatus = statusRes.status || []
      }
    }

    if (langsToRun.length === 0) {
      logAppend('✅ 所有语言均已翻译，无需重复操作。')
      translatingId.value = null
      return
    }

    logAppend(`📋 准备翻译 ${langsToRun.length} 种语言...`)
    
    let CONCURRENCY = 3
    try {
      const resC = await api.getTranslationConcurrency()
      if (resC && resC.concurrency) CONCURRENCY = resC.concurrency
    } catch(e) {}
    
    let qIdx = 0
    let totalOk = 0
    let totalErrs = 0

    async function worker() {
      while (qIdx < langsToRun.length) {
        const idx = qIdx++
        if (idx >= langsToRun.length) break
        if (translatingItemLog.value?.aborted) {
          logAppend('🛑 翻译已被中止')
          break
        }
        const l = langsToRun[idx]
        logAppend(`  🔄 [${l.name}] 翻译中...`)
        
        try {
          const res = await api.runTranslationOne(l.code, 'news', item.id, null)
          const ok = res.results?.length || 0
          const errs = res.errors?.length || 0
          
          if (errs > 0) {
            logAppend(`  ⚠️ [${l.name}] 部分/全部失败，错误 ${errs} 个：`)
            res.errors.forEach(e => logAppend(`     - 字段 ${e.field}: ${e.error.slice(0,100)}`))
            totalErrs += errs
          }
          if (ok > 0) {
            logAppend(`  ✅ [${l.name}] 成功翻译 ${ok} 个字段`)
            totalOk += ok
          }
          if (ok === 0 && errs === 0) {
            logAppend(`  ✔ [${l.name}] 无需翻译`)
          }
          
          if (errs === 0 && item._translationStatus) {
            const s = item._translationStatus.find(x => x.code === l.code)
            if (s) s.translated = true
          }
        } catch (e) {
          logAppend(`  ❌ [${l.name}] 翻译异常: ${e.message}`)
          totalErrs++
        }
      }
    }

    const workers = Array.from({ length: Math.min(CONCURRENCY, langsToRun.length) }, () => worker())
    await Promise.all(workers)

    logAppend(`\n🏁 翻译执行完毕！成功字段: ${totalOk}, 错误数: ${totalErrs}`)
  } catch (e) {
    logAppend(`\n❌ 执行失败: ${e.message}`)
  } finally {
    translatingId.value = null
  }
}

// ─── Editor state ────────────────────────────────────────────────────────────
const newsEditorMode = ref('visual')
const newsVisualEl = ref(null)
const newsImgInput = ref(null)
let newsReplacingImg = null

// Image chooser state for news content editor
const showNewsImgChooser = ref(false)
const showNewsMediaBrowser = ref(false)
const newsMediaSearch = ref('')
const newsMediaGroup = ref('')
const newsMediaItems = ref([])
const newsMediaGroups = ref([])
let newsImgChooserMode = 'content' // 'content' or 'cover'

const form = ref({
  title: '', title_en: '',
  summary: '', summary_en: '',
  cover_image: null, cover_preview: null,
  status: 1, sort_order: 0,
  seo_title: '', seo_description: '', seo_keywords: '',
  content: '',
  render_mode: 'direct',
  category_id: null
})

async function loadNews() {
  try {
    const params = { status: 'all', limit: 200 }
    if (filterCatId.value) params.category_id = filterCatId.value
    const res = await api.getNews(params)
    newsList.value = res.data
    selectedIds.value = []
    // Get total unfiltered count for "全部" tab
    if (!filterCatId.value) {
      totalCount.value = res.total
    } else {
      const allRes = await api.getNews({ status: 'all', limit: 1 })
      totalCount.value = allRes.total
    }
  } catch(e) { console.error(e) }
}

// When switching to content tab, sync the saved content into the visual editor
// When switching AWAY from content tab, save visual editor content back to form
watch(activeTab, async (tab, oldTab) => {
  // Leaving content tab → save visual editor content first
  if (oldTab === 'content' && newsEditorMode.value === 'visual') {
    syncNewsFromVisual()
  }
  // Entering content tab → load content into visual editor
  if (tab === 'content' && newsEditorMode.value === 'visual') {
    await nextTick()
    syncNewsToVisual()
  }
})

// ─── Visual editor helpers ────────────────────────────────────────────────────
function syncNewsToVisual() {
  if (newsVisualEl.value) {
    newsVisualEl.value.innerHTML = form.value.content || '<p>在此处编辑文章内容，或切换到 HTML 代码模式粘贴 HTML...</p>'
  }
}

function syncNewsFromVisual() {
  // Only sync back if we're on the content tab AND editor exists AND has real content
  if (!newsVisualEl.value) return
  const html = newsVisualEl.value.innerHTML
  // Avoid overwriting with empty or placeholder text
  const PLACEHOLDER = '<p>在此处编辑文章内容，或切换到 HTML 代码模式粘贴 HTML...</p>'
  if (html && html.trim() !== '' && html !== '<br>' && html !== PLACEHOLDER) {
    form.value.content = html
  }
}

async function switchNewsMode(mode) {
  if (newsEditorMode.value === 'visual') syncNewsFromVisual()
  newsEditorMode.value = mode
  if (mode === 'visual') {
    await nextTick()
    syncNewsToVisual()
  }
}

function onNewsVisualInput() { syncNewsFromVisual() }

function onNewsVisualClick(e) {
  const img = e.target.closest('img')
  const tip = e.target.closest('.replace-tip')
  if (tip) {
    e.preventDefault()
    const parent = tip.parentElement
    const nearImg = parent ? parent.querySelector('img') : null
    if (nearImg) {
      newsVisualEl.value.querySelectorAll('img').forEach(i => i.style.outline = '')
      nearImg.style.outline = '3px solid #3b82f6'
      newsReplacingImg = nearImg
      newsReplacingImg._replaceTipEl = tip
      openNewsImgChooser('content')
    }
    return
  }
  if (img) {
    e.preventDefault()
    newsVisualEl.value.querySelectorAll('img').forEach(i => i.style.outline = '')
    img.style.outline = '3px solid #3b82f6'
    newsReplacingImg = img
    openNewsImgChooser('content')
  }
}

async function onNewsVisualPaste(e) {
  const items = e.clipboardData?.items
  if (!items) return
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault()
      const file = item.getAsFile()
      if (file) {
        try {
          const res = await api.upload(file)
          document.execCommand('insertImage', false, res.url)
          syncNewsFromVisual()
        } catch (err) { alert('图片上传失败: ' + err.message) }
      }
      return
    }
  }
  setTimeout(() => syncNewsFromVisual(), 50)
}

function insertNewsImage() {
  newsReplacingImg = null
  openNewsImgChooser('content')
}

function openNewsImgChooser(mode) {
  newsImgChooserMode = mode
  showNewsImgChooser.value = true
}

function newsPickFromComputer() {
  showNewsImgChooser.value = false
  if (newsImgChooserMode === 'cover') {
    // Trigger file input for cover — the existing handleCoverUpload on the input handles it
    // We just close the chooser, user clicks the file input directly
    return
  }
  newsImgInput.value?.click()
}

async function loadNewsMedia() {
  try {
    const token = localStorage.getItem('token')
    const params = new URLSearchParams({ per_page: '200' })
    if (newsMediaGroup.value) params.set('group_id', newsMediaGroup.value)
    if (newsMediaSearch.value) params.set('search', newsMediaSearch.value)
    const res = await fetch(`/api/media?${params}`, { headers: { 'Authorization': `Bearer ${token}` } })
    const data = await res.json()
    newsMediaItems.value = data.items || []
  } catch (e) { console.error(e) }
}

async function loadNewsMediaGroups() {
  try {
    const token = localStorage.getItem('token')
    const res = await fetch('/api/media/groups', { headers: { 'Authorization': `Bearer ${token}` } })
    newsMediaGroups.value = await res.json()
  } catch (e) { console.error(e) }
}

function newsPickFromMediaLib() {
  showNewsImgChooser.value = false
  newsMediaSearch.value = ''
  newsMediaGroup.value = localStorage.getItem('_lastMediaGroup') || ''
  loadNewsMediaGroups()
  loadNewsMedia()
  showNewsMediaBrowser.value = true
}
// Remember selected group
watch(newsMediaGroup, v => { if (v) localStorage.setItem('_lastMediaGroup', v) })

function selectNewsMediaImage(item) {
  const url = item.filepath
  showNewsMediaBrowser.value = false

  if (newsImgChooserMode === 'cover') {
    form.value.cover_preview = url
    form.value.cover_image = null // not a file, it's a URL
    form.value.cover_url = url   // store URL separately for save
    return
  }

  // Content mode
  if (newsReplacingImg && newsReplacingImg.parentElement) {
    newsReplacingImg.src = url
    newsReplacingImg.style.outline = ''
    if (newsReplacingImg._replaceTipEl) {
      newsReplacingImg._replaceTipEl.remove()
      delete newsReplacingImg._replaceTipEl
    } else {
      let nextEl = newsReplacingImg.nextElementSibling
      if (!nextEl && newsReplacingImg.parentElement) nextEl = newsReplacingImg.parentElement.querySelector('.replace-tip')
      if (nextEl && nextEl.classList?.contains('replace-tip')) nextEl.remove()
    }
    newsReplacingImg = null
    syncNewsFromVisual()
  } else {
    newsReplacingImg = null
    if (newsEditorMode.value === 'visual' && newsVisualEl.value) {
      newsVisualEl.value.focus()
      document.execCommand('insertImage', false, url)
      syncNewsFromVisual()
    } else {
      form.value.content = (form.value.content || '') + `\n<img src="${url}" style="max-width:100%" />\n`
    }
  }
}

function pickCoverFromLib() {
  openNewsImgChooser('cover')
}

async function handleNewsImgUpload(e) {
  const file = e.target.files?.[0]
  if (!file) return
  try {
    const res = await api.upload(file)
    if (newsReplacingImg) {
      newsReplacingImg.src = res.url
      newsReplacingImg.style.outline = ''
      // Auto-remove the associated replace-tip span
      if (newsReplacingImg._replaceTipEl) {
        newsReplacingImg._replaceTipEl.remove()
        delete newsReplacingImg._replaceTipEl
      } else {
        let nextEl = newsReplacingImg.nextElementSibling
        if (!nextEl && newsReplacingImg.parentElement) nextEl = newsReplacingImg.parentElement.querySelector('.replace-tip')
        if (nextEl && nextEl.classList?.contains('replace-tip')) nextEl.remove()
      }
      newsReplacingImg = null
      syncNewsFromVisual()
    } else if (newsEditorMode.value === 'visual' && newsVisualEl.value) {
      newsVisualEl.value.focus()
      document.execCommand('insertImage', false, res.url)
      syncNewsFromVisual()
    } else {
      form.value.content = (form.value.content || '') + `\n<img src="${res.url}" style="max-width:100%" />\n`
    }
  } catch (err) { alert('图片上传失败: ' + err.message) }
  if (newsImgInput.value) newsImgInput.value.value = ''
}

// ─── Modal open/close ─────────────────────────────────────────────────────────
async function openCreate() {
  editId.value = null
  form.value = { title: '', title_en: '', summary: '', summary_en: '', cover_image: null, cover_preview: null, status: 1, sort_order: 0, seo_title: '', seo_description: '', seo_keywords: '', content: '', render_mode: 'direct', category_id: filterCatId.value || null }
  activeTab.value = 'basic'
  newsEditorMode.value = 'visual'
  newsReplacingImg = null
  isFullscreen.value = false
  showModal.value = true
}

async function openEdit(item) {
  editId.value = item.id
  let fullItem = item
  try {
    fullItem = await api.getNewsItem(item.id)
  } catch(e) {
    console.error('Failed to fetch full article', e)
  }

  form.value = {
    title: fullItem.title || '', title_en: fullItem.title_en || '',
    summary: fullItem.summary || '', summary_en: fullItem.summary_en || '',
    cover_image: null, cover_preview: fullItem.cover_image || null,
    status: fullItem.status ?? 1, sort_order: fullItem.sort_order || 0,
    seo_title: fullItem.seo_title || '', seo_description: fullItem.seo_description || '',
    seo_keywords: fullItem.seo_keywords || '', content: fullItem.content || '',
    render_mode: fullItem.render_mode || 'direct',
    category_id: fullItem.category_id || null
  }
  activeTab.value = 'basic'
  newsEditorMode.value = 'visual'
  newsReplacingImg = null
  isFullscreen.value = false
  showModal.value = true
}

function handleCoverUpload(e) {
  const file = e.target.files[0]
  if (!file) return
  form.value.cover_image = file
  form.value.cover_preview = URL.createObjectURL(file)
}

async function save() {
  if (!form.value.title) return alert('请填写文章标题')
  // Only sync from visual editor if content tab is currently active
  if (newsEditorMode.value === 'visual' && activeTab.value === 'content') syncNewsFromVisual()
  saving.value = true
  try {
    const fd = new FormData()
    fd.append('title', form.value.title)
    fd.append('title_en', form.value.title_en || '')
    fd.append('summary', form.value.summary || '')
    fd.append('summary_en', form.value.summary_en || '')
    fd.append('content', form.value.content || '')
    fd.append('status', form.value.status)
    fd.append('sort_order', form.value.sort_order)
    fd.append('seo_title', form.value.seo_title || '')
    fd.append('seo_description', form.value.seo_description || '')
    fd.append('seo_keywords', form.value.seo_keywords || '')
    if (form.value.cover_image) fd.append('cover_image', form.value.cover_image)
    else if (form.value.cover_url) fd.append('cover_url', form.value.cover_url)
    fd.append('render_mode', form.value.render_mode || 'direct')
    if (form.value.category_id) fd.append('category_id', form.value.category_id)

    if (editId.value) {
      await api.updateNews(editId.value, fd)
    } else {
      await api.createNews(fd)
    }
    showModal.value = false
    await loadCategories()
    await loadNews()
  } catch(e) { alert(e.message) }
  saving.value = false
}

async function deleteItem(id) {
  if (!confirm('确认删除这篇文章吗？')) return
  await api.deleteNews(id)
  await loadNews()
}

onMounted(() => {
  loadCategories()
  loadNews()
})
</script>

<style scoped>
.admin-page { padding: 0; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-header h2 { font-size: 22px; font-weight: 700; }

/* Category tabs */
.cat-tabs { display: flex; gap: 4px; margin-bottom: 16px; border-bottom: 2px solid var(--border); flex-wrap: wrap; }
.cat-tab {
  padding: 8px 16px; cursor: pointer; font-size: 13px; font-weight: 600;
  color: var(--text-muted); border-bottom: 2px solid transparent; margin-bottom: -2px;
  transition: all 0.2s; white-space: nowrap;
}
.cat-tab:hover { color: var(--text-primary); }
.cat-tab.active { color: #7c3aed; border-bottom-color: #7c3aed; }

/* Batch action bar */
.batch-bar {
  display: flex; align-items: center; gap: 10px; padding: 10px 16px;
  background: #f5f3ff; border: 1px solid #c4b5fd; border-radius: 8px; margin-bottom: 12px;
  font-size: 13px; color: #5b21b6;
}

/* Category badge in table */
.cat-badge {
  padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 600;
  background: #f0f9ff; color: #0369a1; border: 1px solid #bae6fd;
}

/* Category management modal */
.cat-list { display: flex; flex-direction: column; gap: 8px; }
.cat-item {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 10px 14px; background: #fafafa; border-radius: 8px; border: 1px solid #e5e7eb;
}
.cat-info { display: flex; align-items: center; gap: 10px; flex: 1; }
.cat-name { font-weight: 600; font-size: 14px; }
.cat-count { font-size: 12px; color: #94a3b8; }
.cat-actions { display: flex; gap: 6px; }
.cat-edit-row { display: flex; gap: 8px; flex: 1; }

.data-table { width: 100%; border-collapse: collapse; }
.data-table th, .data-table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--border); font-size: 14px; }
.data-table th { background: var(--gray-50); font-weight: 600; }
.thumb { width: 60px; height: 40px; object-fit: cover; border-radius: 4px; }
.title-wrap { font-weight: 600; color: var(--text-primary); }
.title-en { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.status-badge { padding: 3px 8px; border-radius: 99px; font-size: 12px; font-weight: 600; }
.active { background: #dcfce7; color: #15803d; }
.inactive { background: var(--gray-100); color: var(--text-muted); }
.actions { display: flex; gap: 8px; }
.empty { text-align: center; padding: 40px; color: var(--text-muted); }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px; }
.modal-wrap { background: white; border-radius: 12px; width: 100%; max-width: 860px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; }
.modal-header { padding: 20px 24px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
.modal-header h3 { font-size: 18px; font-weight: 700; }
.modal-close { background: none; border: none; font-size: 20px; cursor: pointer; color: var(--text-muted); }
.modal-body { padding: 24px; overflow-y: auto; flex: 1; }
.modal-footer { padding: 16px 24px; border-top: 1px solid var(--border); display: flex; gap: 12px; justify-content: flex-end; }

.form-tabs { display: flex; gap: 4px; margin-bottom: 20px; border-bottom: 2px solid var(--border); }
.tab { padding: 8px 18px; border: none; background: none; cursor: pointer; font-weight: 600; color: var(--text-muted); border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 0.2s; }
.tab.active { color: var(--primary); border-bottom-color: var(--primary); }

.tab-content { min-height: 300px; }
.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-weight: 600; font-size: 14px; margin-bottom: 6px; color: var(--text-primary); }
.form-group small { color: var(--text-muted); font-size: 12px; }
.form-control { width: 100%; padding: 10px 12px; border: 2px solid var(--border); border-radius: 6px; font-size: 14px; box-sizing: border-box; }
.form-control:focus { outline: none; border-color: var(--primary); }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.req { color: red; }
.preview-img { width: 100%; max-height: 140px; object-fit: cover; margin-top: 8px; border-radius: 6px; }

/* Quill wrapper — kept for backward compat but not actively used */
.quill-wrap { min-height: 280px; }
:deep(.ql-container) { min-height: 240px; font-size: 15px; }

/* ── HTML source editor ──────────────────────────────────── */
.html-editor {
  width: 100%; box-sizing: border-box;
  min-height: 480px; height: 480px;
  padding: 14px; font-family: 'Fira Mono', 'Consolas', monospace;
  font-size: 13px; line-height: 1.6; color: #e2e8f0;
  background: #1e293b; border: none; border-radius: 0 0 8px 8px;
  resize: vertical; outline: none;
}

/* ── Visual/contenteditable editor ──────────────────────── */
.visual-editor {
  min-height: 480px; max-height: 70vh; overflow-y: auto;
  padding: 16px; outline: none;
  font-size: 15px; line-height: 1.7; color: var(--text-primary);
  background: #fff; border-radius: 0 0 8px 8px;
}
.visual-editor img { max-width: 100%; height: auto; cursor: pointer; }
.visual-editor img:hover { outline: 2px dashed #3b82f6; }

/* Replace-tip: clickable yellow prompt in admin visual editor */
.visual-editor .replace-tip {
  display: block; background: #fffbeb; color: #d97706; font-weight: bold;
  padding: 10px; margin-top: 8px; border-radius: 6px;
  border: 1px dashed #fbbf24; font-size: 13px; cursor: pointer;
  transition: all 0.15s;
}
.visual-editor .replace-tip:hover { background: #fef3c7; border-color: #f59e0b; }

/* Hide replace-tip in preview mode */
.html-preview .replace-tip { display: none !important; }

/* ── Preview ─────────────────────────────────────────────── */
.html-preview {
  min-height: 480px; max-height: 70vh; overflow-y: auto;
  padding: 16px; background: #f8fafc;
  border-radius: 0 0 8px 8px;
  font-size: 15px; line-height: 1.7;
}
.html-preview img { max-width: 100%; height: auto; }

/* ── Editor action buttons ───────────────────────────────── */
.editor-actions { display: flex; align-items: center; gap: 8px; }
.editor-btn {
  padding: 5px 12px; border: 1.5px solid var(--border); border-radius: 6px;
  background: white; font-size: 12px; font-weight: 600;
  cursor: pointer; color: var(--text-muted); transition: all 0.18s;
}
.editor-btn:hover { border-color: var(--primary); color: var(--primary); }

/* Fullscreen: expand html-editor / visual-editor to fill screen */
.editor-wrap.is-fullscreen .html-editor,
.editor-wrap.is-fullscreen .visual-editor,
.editor-wrap.is-fullscreen .html-preview {
  height: calc(100vh - 60px);
  max-height: none;
  border-radius: 0;
}

/* Form hint text */
.form-hint { font-size: 12px; color: var(--text-muted); margin: 0 0 8px; }

/* ── Editor mode bar ──────────────────────────────────────── */
.editor-mode-bar {
  display: flex; align-items: center; justify-content: space-between;
  background: #f8fafc; border: 1px solid var(--border);
  border-radius: 8px 8px 0 0; padding: 8px 12px;
  margin-bottom: 0;
}

.mode-tabs { display: flex; gap: 4px; }
.mode-tab {
  padding: 6px 14px; border: none; background: transparent;
  border-radius: 6px; font-size: 13px; font-weight: 600;
  cursor: pointer; color: var(--text-muted); transition: all 0.18s;
}
.mode-tab.active { background: white; color: var(--primary); box-shadow: 0 1px 4px rgba(0,0,0,.1); }

.fullscreen-btn {
  padding: 5px 12px; border: 1.5px solid var(--border); border-radius: 6px;
  background: white; font-size: 12px; font-weight: 600;
  cursor: pointer; color: var(--text-muted); transition: all 0.18s;
}
.fullscreen-btn:hover { border-color: var(--primary); color: var(--primary); }

/* ── Editor wrap — normal and fullscreen ─────────────────── */
.editor-wrap { border: 1px solid var(--border); border-top: none; border-radius: 0 0 8px 8px; }

.editor-wrap.is-fullscreen {
  position: fixed; inset: 0; z-index: 99999;
  border-radius: 0; border: none;
  display: flex; flex-direction: column;
  background: white; padding: 20px;
  overflow-y: auto;
}

.editor-wrap.is-fullscreen .quill-wrap,
.editor-wrap.is-fullscreen .block-editor {
  flex: 1; height: calc(100vh - 100px);
}

.editor-wrap.is-fullscreen :deep(.ql-container) {
  max-height: none; height: 100%;
}

/* ── Block editor ─────────────────────────────────────────── */
.block-editor {
  padding: 16px; min-height: 400px;
  display: flex; flex-direction: column; gap: 8px;
}

.block-row { position: relative; }

.block-controls-row {
  display: flex; align-items: flex-start; gap: 8px;
}

.block-handle {
  flex-shrink: 0; width: 20px; padding-top: 10px;
  color: #cbd5e1; cursor: grab; font-size: 12px;
  letter-spacing: -3px; user-select: none;
}

.block-del {
  flex-shrink: 0; width: 26px; height: 26px; margin-top: 6px;
  background: none; border: 1px solid #e5e7eb; border-radius: 50%;
  cursor: pointer; color: #94a3b8; font-size: 14px;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s; flex-shrink: 0;
}
.block-del:hover { background: #fee2e2; border-color: #ef4444; color: #ef4444; }

.block-input {
  flex: 1; border: none; outline: none; resize: none;
  font-family: inherit; width: 100%;
  padding: 8px 0; background: transparent;
  border-bottom: 1px solid transparent;
  transition: border-color 0.15s;
}
.block-input:focus { border-bottom-color: var(--primary); }

.block-h1 { font-size: 26px; font-weight: 700; color: #0f172a; }
.block-h2 { font-size: 20px; font-weight: 700; color: #1e293b; }
.block-p { font-size: 16px; line-height: 1.7; color: #374151; }
.block-quote {
  font-size: 16px; line-height: 1.6; color: #475569;
  padding-left: 16px; border-left: 4px solid #0077b5;
  font-style: italic;
}
.block-hr { flex: 1; height: 2px; background: #e5e7eb; border: none; margin-top: 12px; }

/* Image block */
.block-image-row { flex-direction: column; padding: 8px 0; }
.block-image-wrap { width: 100%; display: flex; flex-direction: column; align-items: center; }
.block-img { max-width: 100%; max-height: 400px; object-fit: contain; border-radius: 6px; }
.block-img-caption-wrap { width: 100%; text-align: center; margin-top: 6px; }
.block-caption-input {
  text-align: center; border: none; border-bottom: 1px dashed #cbd5e1;
  outline: none; font-size: 13px; color: #64748b; width: 60%;
  padding: 4px 0; background: transparent;
}
.block-caption-input:focus { border-bottom-color: var(--primary); }
.block-caption-input::placeholder { color: #cbd5e1; }

/* Add block row */
.add-block-row {
  display: flex; flex-wrap: wrap; gap: 8px;
  padding: 12px 0; border-top: 1px dashed #e2e8f0; margin-top: 8px;
}
.add-block-btn {
  padding: 6px 14px; border: 1.5px dashed #cbd5e1; border-radius: 20px;
  background: transparent; font-size: 13px; color: #64748b;
  cursor: pointer; transition: all 0.15s; font-weight: 500;
}
.add-block-btn:hover { border-color: #0077b5; color: #0077b5; background: #eff8ff; }


/* Sticky Quill toolbar — stays at top of modal body when scrolling */
:deep(.ql-toolbar.ql-snow) {
  position: sticky;
  top: 0;
  z-index: 10;
  background: #fff;
  border-bottom: 2px solid #e5e7eb;
  border-top: none;
  border-left: none;
  border-right: none;
  box-shadow: 0 2px 8px rgba(0,0,0,0.07);
}

/* Image grid buttons labels */
:deep(.ql-image-grid-2::before) { content: '2⊞'; font-size: 13px; font-weight: 700; }
:deep(.ql-image-grid-3::before) { content: '3⊞'; font-size: 13px; font-weight: 700; }
:deep(.ql-image-grid-4::before) { content: '4⊞'; font-size: 13px; font-weight: 700; }
:deep(.ql-image-grid-2),
:deep(.ql-image-grid-3),
:deep(.ql-image-grid-4) {
  width: auto !important;
  padding: 2px 6px !important;
  border-radius: 4px;
  background: #f0f4ff;
  color: #3b82f6 !important;
  font-weight: 700;
  margin: 0 1px;
}
:deep(.ql-image-grid-2:hover),
:deep(.ql-image-grid-3:hover),
:deep(.ql-image-grid-4:hover) { background: #3b82f6; color: white !important; }

/* Images auto-fit container */
:deep(.ql-editor) img {
  max-width: 100%;
  height: auto;
}

/* Tables display with borders */
:deep(.ql-editor) table,
:deep(.ql-editor) td,
:deep(.ql-editor) th {
  border: 1px solid #d1d5db;
  border-collapse: collapse;
  padding: 6px 10px;
}

/* Limit editor height so toolbar stays visible */
:deep(.ql-container) {
  max-height: 60vh;
  overflow-y: auto;
}

.btn { padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; border: none; font-size: 14px; transition: all 0.2s; }
.btn-primary { background: var(--primary); color: white; }
.btn-outline { background: white; color: var(--primary); border: 2px solid var(--primary); }
.btn-danger { background: white; color: var(--danger); border: 2px solid var(--danger); }
.btn-sm { padding: 5px 10px; font-size: 12px; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Image source chooser */
.img-chooser-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.img-chooser-btn { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 28px 16px;
  border: 2px solid #e2e8f0; border-radius: 12px; background: #fff; cursor: pointer; transition: all 0.2s; }
.img-chooser-btn:hover { border-color: #16a34a; background: #f0fdf4; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }

/* News media library browser grid */
.news-media-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 8px; max-height: 450px; overflow-y: auto; }
.news-media-item { border: 2px solid #e2e8f0; border-radius: 8px; overflow: hidden; cursor: pointer; transition: all 0.15s; }
.news-media-item:hover { border-color: #16a34a; transform: scale(1.02); }
.news-media-item img { width: 100%; aspect-ratio: 1; object-fit: cover; display: block; }
.news-media-name { font-size: 10px; padding: 4px 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #475569; text-align: center; }
</style>
