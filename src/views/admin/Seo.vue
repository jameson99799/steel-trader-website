<template>
  <div class="seo-page">
    <div class="page-header">
      <h2>🔍 SEO设置</h2>
      <div class="header-actions">
        <button class="btn btn-audit" @click="runAudit" :disabled="auditing">
          {{ auditing ? '检测中...' : '🔎 SEO检测' }}
        </button>
        <button class="btn btn-primary" @click="save" :disabled="saving">{{ saving ? '保存中...' : '保存设置' }}</button>
      </div>
    </div>

    <!-- Audit Results -->
    <div v-if="auditResult" class="audit-section">
      <div class="audit-score-card">
        <div class="score-ring" :class="scoreClass">
          <span class="score-number">{{ auditResult.score }}</span>
          <span class="score-label">分</span>
        </div>
        <div class="score-info">
          <h3>SEO健康度评分</h3>
          <div class="score-stats">
            <span class="stat pass">✅ 通过 {{ auditResult.passed }}</span>
            <span class="stat warn">⚠️ 警告 {{ auditResult.warnings }}</span>
            <span class="stat fail">❌ 失败 {{ auditResult.failed }}</span>
          </div>
          <p class="score-desc">{{ scoreDesc }}</p>
        </div>
        <button class="close-audit" @click="auditResult = null">✕</button>
      </div>

      <div class="audit-categories">
        <div v-for="(items, cat) in auditResult.categories" :key="cat" class="audit-cat">
          <h4>{{ cat }}</h4>
          <div v-for="item in items" :key="item.name" :class="['audit-item', item.status]">
            <span class="audit-icon">
              {{ item.status === 'pass' ? '✅' : item.status === 'warn' ? '⚠️' : '❌' }}
            </span>
            <span class="audit-name">{{ item.name }}</span>
            <span v-if="item.suggestion" class="audit-suggestion" v-html="item.suggestion"></span>
          </div>
        </div>
      </div>

      <div class="audit-tips" v-if="auditResult.topTips">
        <h4>💡 Google SEO 核心建议</h4>
        <ul>
          <li v-for="(tip, i) in auditResult.topTips" :key="i">{{ tip }}</li>
        </ul>
      </div>
    </div>

    <div class="seo-cards">
      <!-- Site Basic SEO -->
      <div class="seo-card">
        <h3>基础SEO信息</h3>
        <div class="form-group">
          <label>网站标题（Page Title）</label>
          <input v-model="form.site_title" class="form-control" placeholder="网站标题 - 副标题" />
          <small>建议60字符以内，会显示在浏览器标签页和搜索结果中</small>
        </div>
        <div class="form-group">
          <label>网站描述（Meta Description）</label>
          <textarea v-model="form.site_description" class="form-control" rows="3" placeholder="一句话描述网站内容，150-160字符最佳"></textarea>
          <small>{{ (form.site_description||'').length }}/160 字符</small>
        </div>
        <div class="form-group">
          <label>关键词（Keywords）</label>
          <input v-model="form.site_keywords" class="form-control" placeholder="关键词1, 关键词2, 关键词3 (英文逗号分隔)" />
        </div>
      </div>

      <!-- Open Graph -->
      <div class="seo-card">
        <h3>社交分享 (Open Graph)</h3>
        <div class="form-group">
          <label>OG图片（分享时显示的封面图）</label>
          <div style="display:flex;gap:8px;align-items:center;">
            <input type="file" @change="handleOgImage" accept="image/*" class="form-control" style="flex:1;" />
            <span style="color:#64748b;">或</span>
            <button class="btn btn-outline" @click="showMediaPicker = true">📷 从图库选择</button>
          </div>
          <img v-if="ogPreview" :src="ogPreview" class="og-preview" />
          <small>建议尺寸 1200×630px</small>
        </div>
      </div>

      <!-- Google Tools -->
      <div class="seo-card">
        <h3>Google工具集成</h3>
        <div class="form-group">
          <label>Google Analytics 跟踪ID</label>
          <input v-model="form.google_analytics" class="form-control" placeholder="G-XXXXXXXXXX 或 UA-XXXXXXXX-X" />
          <small>填入后将自动在每个页面注入GA统计代码</small>
        </div>
        <div class="form-group">
          <label>Google Search Console 验证码</label>
          <input v-model="form.google_search_console" class="form-control" placeholder="content 属性的值，例如：abc123xyz" />
          <small>Google Search Console → 验证方式 → HTML标签 → 复制content值</small>
        </div>
      </div>

      <!-- Robots -->
      <div class="seo-card">
        <h3>Robots.txt 内容</h3>
        <div class="form-group">
          <textarea v-model="form.robots_txt" class="form-control" rows="8" placeholder="User-agent: *&#10;Allow: /&#10;Sitemap: https://yourdomain.com/sitemap.xml"></textarea>
          <small>设置搜索引擎爬虫访问规则。默认允许所有爬虫。</small>
        </div>
      </div>

      <!-- GEO SEO Card -->
      <div class="seo-card geo-card" style="grid-column: 1 / -1;">
        <h3>🤖 GEO 生成式引擎优化（Generative Engine Optimization）</h3>
        <p style="color:#64748b;font-size:13px;margin-bottom:16px;">GEO 优化让 AI 搜索引擎（Google AI Overviews、Bing Copilot、ChatGPT Search、Perplexity 等）更好地理解和引用您的网站内容。系统自动注入 Product / Article / FAQ 结构化数据（JSON-LD）以及地理信号（geo.region、hreflang、LocalBusiness），帮助 AI 搜索引擎生成更权威的回答并引用您的网站。<br/><strong>产品页还可单独添加 FAQ 问答数据</strong>（编辑产品 → GEO FAQ 区域），AI 引擎会优先引用包含 FAQ 的内容。</p>
        <div class="grid grid-3">
          <div class="form-group">
            <label>🏳 地区代码（geo.region）</label>
            <input v-model="form.geo_region" class="form-control" placeholder="CN-GD" />
            <small>格式：国家代码-省份代码，如 CN-GD（广东）、US-CA（加州）、GB（英国）</small>
          </div>
          <div class="form-group">
            <label>🏙 城市名称（geo.placename）</label>
            <input v-model="form.geo_placename" class="form-control" placeholder="Guangzhou, China" />
            <small>英文城市名，如 Guangzhou, China</small>
          </div>
          <div class="form-group">
            <label>🏭 业务类型</label>
            <select v-model="form.local_business_type" class="form-control">
              <option value="Manufacturer">制造商（Manufacturer）</option>
              <option value="WholesaleStore">批发商（WholesaleStore）</option>
              <option value="Store">零售商（Store）</option>
              <option value="LocalBusiness">本地业务（LocalBusiness）</option>
              <option value="Organization">组织机构（Organization）</option>
              <option value="Corporation">公司（Corporation）</option>
            </select>
            <small>用于 Google LocalBusiness 结构化数据</small>
          </div>
        </div>
        <div class="grid grid-3">
          <div class="form-group">
            <label>📍 纬度（Latitude）</label>
            <input v-model="form.geo_lat" class="form-control" placeholder="23.1291" />
            <small>如：23.1291（可在 Google Maps 查询）</small>
          </div>
          <div class="form-group">
            <label>📍 经度（Longitude）</label>
            <input v-model="form.geo_lng" class="form-control" placeholder="113.2644" />
            <small>如：113.2644</small>
          </div>
          <div class="form-group">
            <label>📍 完整地址（英文）</label>
            <input v-model="form.local_business_address" class="form-control" placeholder="123 Steel Road, Guangzhou, Guangdong, China" />
            <small>详细英文地址，用于 LocalBusiness JSON-LD</small>
          </div>
        </div>
        <div class="grid grid-2">
          <div class="form-group">
            <label>🇴🌐 hreflang 英文代码</label>
            <input v-model="form.hreflang_en" class="form-control" placeholder="en" />
            <small>英文语言标签，如 en、en-US、en-GB（默认 en）</small>
          </div>
          <div class="form-group">
            <label>🇨🇳 hreflang 中文代码</label>
            <input v-model="form.hreflang_zh" class="form-control" placeholder="zh-CN" />
            <small>中文语言标签，如 zh-CN、zh-TW（默认 zh-CN）</small>
          </div>
        </div>
        <div class="geo-preview" v-if="form.geo_lat && form.geo_lng">
          <p>✅ 预览将注入的 Meta 标签：</p>
          <code>&lt;meta name="geo.region" content="{{ form.geo_region }}" /&gt;</code><br/>
          <code>&lt;meta name="geo.placename" content="{{ form.geo_placename }}" /&gt;</code><br/>
          <code>&lt;meta name="geo.position" content="{{ form.geo_lat }};{{ form.geo_lng }}" /&gt;</code><br/>
          <code>&lt;meta name="ICBM" content="{{ form.geo_lat }}, {{ form.geo_lng }}" /&gt;</code><br/>
          <code>&lt;link rel="alternate" hreflang="{{ form.hreflang_en }}" href="..." /&gt;</code>
        </div>
      </div>
    </div>

    <!-- Auto Freshness Refresh Card -->
    <div class="seo-card refresh-card" style="grid-column: 1 / -1;">
      <h3>⏰ 内容自动刷新日期（SEO 鲜度信号）</h3>
      <p class="refresh-desc">
        <strong>什么是内容鲜度？</strong> Google 会根据内容的更新时间判断“新鲜度”（Freshness），更新时间越近的页面越容易被优先抚取和排名。
        设置后，系统每 6 小时自动将超过指定天数的产品 / 文章的 <code>updated_at</code> 刷新为当前时间，同时更新 Sitemap 中的 <code>lastmod</code>，让 Google 更频繁地重新抚取。
        <br/><strong style="color:#dc2626;">注意：</strong> 此功能适用于内容本身定期有效但不常编辑的页面（如产品规格页）。设为 0 表示不启用。
      </p>
      <div class="grid grid-2">
        <div class="form-group">
          <label>📰 文章自动刷新间隔（天）</label>
          <input type="number" v-model.number="form.article_refresh_days" class="form-control" min="0" max="365" placeholder="0" />
          <small>超过此天数的文章将自动刷新更新时间。0 = 不启用。建议值：30-90 天</small>
        </div>
        <div class="form-group">
          <label>📦 产品自动刷新间隔（天）</label>
          <input type="number" v-model.number="form.product_refresh_days" class="form-control" min="0" max="365" placeholder="0" />
          <small>超过此天数的产品页将自动刷新更新时间。0 = 不启用。建议值：60-90 天</small>
        </div>
      </div>
      <div class="refresh-actions">
        <button class="btn btn-refresh" @click="triggerRefresh" :disabled="refreshing">
          {{ refreshing ? '刷新中...' : '⚡ 立即应用并刷新超期内容' }}
        </button>
        <span v-if="refreshResult" class="refresh-result">
          ✅ 已刷新 {{ refreshResult.articlesUpdated }} 篇文章、{{ refreshResult.productsUpdated }} 个产品
        </span>
      </div>
    </div>

    <!-- Media Library Picker -->
    <div v-if="showMediaPicker" class="modal-overlay" @click.self="showMediaPicker=false">
      <div class="modal" style="max-width:700px;">
        <div class="modal-header" style="background:#f5f3ff;color:#7c3aed;">
          <h3>📷 从图库选择</h3>
          <button class="modal-close" @click="showMediaPicker=false">&times;</button>
        </div>
        <div class="modal-body">
          <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
            <input v-model="mediaPickerSearch" class="form-control" placeholder="搜索文件名..." @input="loadMediaPicker" style="max-width:200px;" />
            <select v-model="mediaPickerGroup" class="form-control" @change="loadMediaPicker" style="max-width:140px;">
              <option value="">全部分组</option>
              <option v-for="g in mediaGroups" :key="g.id" :value="g.id">{{ g.name }}</option>
            </select>
            <select v-model="mediaPickerWatermark" class="form-control" style="max-width:140px;">
              <option value="">不添加水印</option>
              <option v-for="t in watermarkTemplates" :key="t.id" :value="t.id">{{ t.name }}</option>
            </select>
          </div>
          <div v-if="mediaPickerItems.length" class="lib-grid">
            <div v-for="item in mediaPickerItems" :key="item.id" 
                 class="lib-item"
                 @click="selectMediaFromLibrary(item.filepath)">
              <img :src="item.filepath" @error="item.filepath='/placeholder.png'" />
            </div>
          </div>
          <p v-else style="color:#94a3b8;text-align:center;padding:20px;">暂无图片</p>
        </div>
      </div>
    </div>

    <!-- Global Loading Overlay -->
    <div v-if="globalProcessing" class="loading-overlay">
      <div class="loader"></div>
      <div style="margin-top:16px;color:white;">系统处理中，请稍候...</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import api from '../../api'

const saving = ref(false)
const auditing = ref(false)
const refreshing = ref(false)
const refreshResult = ref(null)
const ogFile = ref(null)
const ogPreview = ref(null)
const auditResult = ref(null)

const showMediaPicker = ref(false)
const mediaPickerSearch = ref('')
const mediaPickerGroup = ref('')
const mediaPickerWatermark = ref('')
const mediaPickerItems = ref([])
const mediaGroups = ref([])

watch(showMediaPicker, (v) => {
  if (v) {
    mediaPickerGroup.value = localStorage.getItem('_lastMediaGroup') || ''
    mediaPickerWatermark.value = localStorage.getItem('_lastWatermarkTemplate') || ''
  }
})
watch(mediaPickerGroup, v => { if (v !== undefined) localStorage.setItem('_lastMediaGroup', v) })
watch(mediaPickerWatermark, v => { if (v !== undefined) localStorage.setItem('_lastWatermarkTemplate', v) })

const globalProcessing = ref(false)
const watermarkTemplates = ref([])

async function loadWatermarkTemplates() {
  if (watermarkTemplates.value.length) return
  try {
    const res = await fetch('/api/media/watermark-templates', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    watermarkTemplates.value = await res.json()
  } catch (e) { console.error(e) }
}

const form = ref({
  site_title: '',
  site_description: '',
  site_keywords: '',
  google_analytics: '',
  google_search_console: '',
  robots_txt: 'User-agent: *\nAllow: /\n',
  geo_region: '',
  geo_placename: '',
  geo_lat: '',
  geo_lng: '',
  hreflang_en: 'en',
  hreflang_zh: 'zh-CN',
  local_business_type: 'Manufacturer',
  local_business_address: '',
  article_refresh_days: 0,
  product_refresh_days: 0
})

const scoreClass = computed(() => {
  if (!auditResult.value) return ''
  const s = auditResult.value.score
  if (s >= 80) return 'score-good'
  if (s >= 50) return 'score-ok'
  return 'score-bad'
})

const scoreDesc = computed(() => {
  if (!auditResult.value) return ''
  const s = auditResult.value.score
  if (s >= 90) return '🎉 非常棒！SEO设置很完善，继续保持！'
  if (s >= 70) return '👍 不错！还有一些细节可以优化'
  if (s >= 50) return '⚠️ 需要改进，请按照建议逐项修复'
  return '❌ SEO设置严重不足，请尽快按照建议优化'
})

function handleOgImage(e) {
  const file = e.target.files[0]
  if (!file) return
  ogFile.value = file
  ogPreview.value = URL.createObjectURL(file)
}

async function load() {
  try {
    const data = await api.getSeoSettings()
    if (data && data.id) {
      form.value = {
        site_title: data.site_title || '',
        site_description: data.site_description || '',
        site_keywords: data.site_keywords || '',
        google_analytics: data.google_analytics || '',
        google_search_console: data.google_search_console || '',
        robots_txt: data.robots_txt || 'User-agent: *\nAllow: /\n',
        geo_region: data.geo_region || '',
        geo_placename: data.geo_placename || '',
        geo_lat: data.geo_lat || '',
        geo_lng: data.geo_lng || '',
        hreflang_en: data.hreflang_en || 'en',
        hreflang_zh: data.hreflang_zh || 'zh-CN',
        local_business_type: data.local_business_type || 'Manufacturer',
        local_business_address: data.local_business_address || '',
        article_refresh_days: data.article_refresh_days || 0,
        product_refresh_days: data.product_refresh_days || 0
      }
      if (data.og_image) ogPreview.value = data.og_image
    }
  } catch(e) { console.error(e) }
}

async function save() {
  saving.value = true
  try {
    const fd = new FormData()
    Object.entries(form.value).forEach(([k,v]) => fd.append(k, v !== null && v !== undefined ? v : ''))
    if (ogFile.value) {
      fd.append('og_image', ogFile.value)
    } else if (ogPreview.value && ogPreview.value.startsWith('/')) {
      fd.append('og_image', ogPreview.value)
    }
    await api.updateSeoSettings(fd)
    alert('SEO设置保存成功！')
  } catch(e) { alert(e.message) }
  saving.value = false
}

const loadMediaPicker = async () => {
  try {
    const res = await fetch(`/api/media?search=${encodeURIComponent(mediaPickerSearch.value)}&group_id=${mediaPickerGroup.value}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    mediaPickerItems.value = await res.json()
  } catch (e) { console.error(e) }
}

const loadMediaGroups = async () => {
  try {
    const res = await fetch('/api/media/groups', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    mediaGroups.value = await res.json()
  } catch (e) { console.error(e) }
}

const selectMediaFromLibrary = async (filepath) => {
  let url = filepath
  
  if (mediaPickerWatermark.value) {
    globalProcessing.value = true
    try {
      const res = await fetch('/api/media/apply-watermark-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ urls: [url], template_id: mediaPickerWatermark.value })
      })
      const data = await res.json()
      if (res.ok && data.urls?.length) url = data.urls[0]
    } catch (e) { console.error(e) }
    globalProcessing.value = false
  }

  ogFile.value = null // clear file
  ogPreview.value = url // set to url
  showMediaPicker.value = false
}

async function runAudit() {
  auditing.value = true
  try {
    auditResult.value = await api.seoAudit()
  } catch(e) { alert('检测失败: ' + e.message) }
  auditing.value = false
}

async function triggerRefresh() {
  await save() // Auto save the values first
  refreshing.value = true
  refreshResult.value = null
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    const res = await fetch('/api/seo/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        article_refresh_days: form.value.article_refresh_days,
        product_refresh_days: form.value.product_refresh_days
      })
    })
    refreshResult.value = await res.json()
  } catch(e) { alert('刷新失败: ' + e.message) }
  refreshing.value = false
}

onMounted(() => {
  load()
  loadMediaGroups()
  loadWatermarkTemplates()
  loadMediaPicker()
})
</script>

<style scoped>
.seo-page { padding: 0; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-header h2 { font-size: 22px; font-weight: 700; }
.header-actions { display: flex; gap: 10px; }

.seo-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }

.seo-card {
  background: white; border-radius: 12px;
  box-shadow: 0 1px 8px rgba(0,0,0,0.08);
  padding: 24px;
}

.seo-card h3 {
  font-size: 16px; font-weight: 700;
  color: var(--text-primary); margin-bottom: 16px;
  padding-bottom: 10px; border-bottom: 1px solid var(--border);
}

.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-weight: 600; font-size: 14px; margin-bottom: 6px; color: var(--text-primary); }
.form-group small { color: var(--text-muted); font-size: 12px; margin-top: 4px; display: block; }
.form-control { width: 100%; padding: 10px 12px; border: 2px solid var(--border); border-radius: 6px; font-size: 14px; box-sizing: border-box; font-family: inherit; }
.form-control:focus { outline: none; border-color: var(--primary); }

.og-preview { width: 100%; max-height: 160px; object-fit: cover; border-radius: 6px; margin-top: 8px; }

.btn { padding: 10px 20px; border-radius: 6px; font-weight: 600; cursor: pointer; border: none; font-size: 14px; }
.btn-primary { background: var(--primary); color: white; }
.btn-audit { background: linear-gradient(135deg, #f59e0b, #ef4444); color: white; }
.btn-audit:hover { opacity: 0.9; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── Audit Section ──────────────────────────────── */
.audit-section { margin-bottom: 28px; }

.audit-score-card {
  display: flex; align-items: center; gap: 24px;
  background: white; border-radius: 12px; padding: 24px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.1);
  margin-bottom: 20px; position: relative;
}

.close-audit {
  position: absolute; top: 12px; right: 14px;
  background: none; border: none; font-size: 18px; cursor: pointer; color: var(--text-muted);
}

.score-ring {
  width: 90px; height: 90px; border-radius: 50%;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.score-ring.score-good { background: linear-gradient(135deg, #22c55e, #16a34a); color: white; }
.score-ring.score-ok { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; }
.score-ring.score-bad { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; }
.score-number { font-size: 32px; font-weight: 800; line-height: 1; }
.score-label { font-size: 12px; opacity: 0.9; }

.score-info h3 { font-size: 18px; font-weight: 700; margin-bottom: 8px; }
.score-stats { display: flex; gap: 14px; margin-bottom: 6px; }
.stat { font-size: 13px; font-weight: 600; }
.stat.pass { color: #22c55e; }
.stat.warn { color: #f59e0b; }
.stat.fail { color: #ef4444; }
.score-desc { font-size: 14px; color: var(--text-secondary); margin: 0; }

.audit-categories {
  display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
  margin-bottom: 20px;
}

.audit-cat {
  background: white; border-radius: 10px; padding: 16px;
  box-shadow: 0 1px 6px rgba(0,0,0,0.06);
}

.audit-cat h4 {
  font-size: 14px; font-weight: 700; margin-bottom: 10px;
  padding-bottom: 8px; border-bottom: 1px solid var(--border);
  color: var(--text-primary);
}

.audit-item {
  display: flex; flex-wrap: wrap; align-items: flex-start; gap: 6px;
  padding: 6px 0; font-size: 13px;
  border-bottom: 1px solid #f5f5f5;
}
.audit-item:last-child { border-bottom: none; }
.audit-icon { flex-shrink: 0; }
.audit-name { font-weight: 600; color: var(--text-primary); }
.audit-suggestion {
  width: 100%; font-size: 12px; color: var(--text-secondary);
  padding-left: 22px; margin-top: 2px;
}
.audit-item.fail .audit-name { color: #dc2626; }
.audit-item.warn .audit-name { color: #d97706; }
.audit-item.pass .audit-name { color: #16a34a; }

.audit-tips {
  background: linear-gradient(135deg, #eff6ff, #eef2ff);
  border: 1px solid #c7d2fe; border-radius: 10px; padding: 18px 22px;
}
.audit-tips h4 { font-size: 15px; font-weight: 700; margin-bottom: 10px; color: #4338ca; }
.audit-tips ul { list-style: none; padding: 0; margin: 0; }
.audit-tips li { font-size: 13px; color: #3730a3; padding: 4px 0; }

@media (max-width: 768px) {
  .seo-cards { grid-template-columns: 1fr; }
  .audit-categories { grid-template-columns: 1fr; }
  .audit-score-card { flex-direction: column; text-align: center; }
}

/* ── Grid utilities ─────────────────────────────── */
.grid { display: grid; gap: 16px; }
.grid-2 { grid-template-columns: 1fr 1fr; }
.grid-3 { grid-template-columns: 1fr 1fr 1fr; }
@media (max-width: 768px) { .grid-2, .grid-3 { grid-template-columns: 1fr; } }

/* ── Refresh Card ──────────────────────────────── */
.refresh-card { border-top: 3px solid #f59e0b; }
.refresh-desc {
  font-size: 13px; color: var(--text-secondary);
  background: #fffbeb; border: 1px solid #fde68a;
  border-radius: 8px; padding: 12px 16px; margin-bottom: 18px; line-height: 1.7;
}
.refresh-desc code { background: #fef3c7; padding: 1px 4px; border-radius: 3px; font-size: 12px; color: #92400e; }
.refresh-actions { display: flex; align-items: center; gap: 16px; margin-top: 8px; }
.btn-refresh { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; }
.btn-refresh:hover { opacity: 0.9; }
.btn-refresh:disabled { opacity: 0.5; cursor: not-allowed; }
.refresh-result { font-size: 14px; color: #16a34a; font-weight: 600; }

/* ── Modal & Library ──────────────────────────────── */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center; z-index: 1000; padding: 20px; }
.modal { background: white; border-radius: 12px; width: 100%; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.2); }
.modal-header { padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; }
.modal-header h3 { font-size: 18px; font-weight: 700; margin: 0; }
.modal-close { background: none; border: none; font-size: 24px; cursor: pointer; color: inherit; opacity: 0.6; transition: opacity 0.2s; line-height: 1; }
.modal-close:hover { opacity: 1; }
.modal-body { padding: 20px; overflow-y: auto; flex: 1; }
.btn-outline { background: white; border: 1px solid var(--border); color: var(--text-primary); }
.btn-outline:hover { background: #f8fafc; border-color: #cbd5e1; }

.lib-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 12px; }
.lib-item { position: relative; border-radius: 8px; overflow: hidden; cursor: pointer; border: 2px solid transparent; box-sizing: border-box; transition: all 0.2s; aspect-ratio: 1; background: #f8fafc; }
.lib-item:hover { border-color: #cbd5e1; }
.lib-item img { width: 100%; height: 100%; object-fit: cover; }

.loading-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.loader {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #7c3aed;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
