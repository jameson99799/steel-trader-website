<template>
  <div class="indexing-page">
    <h1>🔍 Google / Bing 收录提交</h1>

    <div class="card">
      <div class="card-body">
        <div class="info-box">
          <strong>💡 工作原理：</strong>点击提交后，系统会通知 Google 和 Bing 抓取您的网站地图，加快搜索引擎收录速度。
          <br><strong>注意：</strong>提交后搜索引擎通常需要 <strong>1-4 周</strong>才会完成收录，这是正常现象。
        </div>

        <div class="form-group">
          <label>网站地图 URL</label>
          <div style="display:flex;gap:8px">
            <input v-model="sitemapUrl" class="form-control" placeholder="https://www.sunseasteel.com/sitemap.xml" readonly />
            <a :href="sitemapUrl" target="_blank" class="btn btn-outline" style="white-space:nowrap">预览</a>
          </div>
        </div>

        <div class="submit-actions">
          <button class="btn btn-primary" @click="submitToAll" :disabled="submitting">
            {{ submitting ? '提交中...' : '🚀 提交到 Google + Bing' }}
          </button>
          <span class="last-submit" v-if="lastSubmit">上次提交：{{ lastSubmit }}</span>
        </div>

        <div v-if="results.length" class="results">
          <div v-for="r in results" :key="r.engine" :class="['result-row', r.success ? 'ok' : 'err']">
            <span class="engine">{{ r.engine }}</span>
            <span>{{ r.message }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Google Search Console Guide -->
    <div class="card">
      <div class="card-header"><h3>🎯 提高 Google 排名 — 操作清单</h3></div>
      <div class="card-body">
        <div class="checklist">
          <div class="checklist-item" v-for="item in seoChecklist" :key="item.text">
            <span class="check-icon" @click="item.done = !item.done">{{ item.done ? '✅' : '⬜' }}</span>
            <div>
              <strong>{{ item.text }}</strong>
              <p>{{ item.desc }}</p>
              <a v-if="item.link" :href="item.link" target="_blank" class="action-link">{{ item.linkText }} →</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '../../api'

const submitting = ref(false)
const lastSubmit = ref('')
const results = ref([])
const sitemapUrl = ref('https://www.sunseasteel.com/sitemap.xml')

const seoChecklist = reactive([
  { text: '注册 Google Search Console', desc: '在 Google Search Console 验证网站所有权，提交 Sitemap，查看收录状态和搜索数据。', link: 'https://search.google.com/search-console', linkText: '打开 Google Search Console', done: false },
  { text: '提交网站地图到 Search Console', desc: '在 Search Console → 站点地图 → 输入 sitemap.xml 并提交。', done: false },
  { text: '填写完整的 SEO 设置', desc: '在「SEO 设置」中填写网站标题、描述和关键词，每个产品也要填写 SEO 信息。', done: false },
  { text: '添加公司基本信息', desc: '确保公司名称、地址、电话、邮箱等信息完整，有助于 Google 商家收录。', done: false },
  { text: '上传产品图片并添加描述', desc: '高质量的图片和详细的产品描述会提高页面排名。', done: false },
  { text: '在后台发布至少 3 篇新闻/文章', desc: '定期更新内容能让 Google 更频繁地抓取您的网站。', done: false },
  { text: '安装 SSL 证书（HTTPS）', desc: '已完成 ✅ Google 优先收录 HTTPS 网站。', done: true },
  { text: '安装 Google Analytics', desc: '已完成 ✅ 追踪网站流量和用户行为。', done: true },
])

const submitToAll = async () => {
  submitting.value = true
  results.value = []
  try {
    const token = localStorage.getItem('token')
    const res = await fetch('/api/indexing/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ sitemapUrl: sitemapUrl.value })
    })
    const data = await res.json()
    results.value = data.results || []
    lastSubmit.value = new Date().toLocaleString('zh-CN')
  } catch (e) {
    results.value = [{ engine: '错误', success: false, message: e.message }]
  } finally { submitting.value = false }
}
</script>

<style scoped>
.indexing-page { padding: 0 }
h1 { font-size: 24px; font-weight: 700; margin-bottom: 24px; color: #1e293b }
.card { background: #fff; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 20px }
.card-header { padding: 16px 20px; border-bottom: 1px solid #e2e8f0 }
.card-header h3 { margin: 0; font-size: 16px }
.card-body { padding: 20px }
.info-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; font-size: 14px; color: #1e40af; line-height: 1.6 }
.form-group { margin-bottom: 16px }
.form-group label { display: block; font-size: 13px; font-weight: 500; margin-bottom: 6px; color: #374151 }
.form-control { flex: 1; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; background: #f8fafc }
.submit-actions { display: flex; align-items: center; gap: 16px; margin-bottom: 16px }
.btn { padding: 8px 20px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; border: none; text-decoration: none; display: inline-block }
.btn-primary { background: #3b82f6; color: #fff }
.btn-primary:hover { background: #2563eb }
.btn-outline { background: #fff; color: #374151; border: 1px solid #d1d5db }
.btn:disabled { opacity: 0.6; cursor: not-allowed }
.last-submit { font-size: 13px; color: #94a3b8 }
.results { display: flex; flex-direction: column; gap: 8px }
.result-row { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 8px; font-size: 14px }
.result-row.ok { background: #dcfce7; color: #15803d }
.result-row.err { background: #fee2e2; color: #b91c1c }
.engine { font-weight: 700; min-width: 50px }
.checklist { display: flex; flex-direction: column; gap: 16px }
.checklist-item { display: flex; gap: 12px }
.check-icon { font-size: 20px; cursor: pointer; flex-shrink: 0; margin-top: 1px }
.checklist-item strong { display: block; font-size: 14px; color: #1e293b; margin-bottom: 4px }
.checklist-item p { margin: 0 0 4px; font-size: 13px; color: #64748b }
.action-link { font-size: 13px; color: #3b82f6; text-decoration: none }
.action-link:hover { text-decoration: underline }
</style>
