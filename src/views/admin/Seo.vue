<template>
  <div class="seo-page">
    <div class="page-header">
      <h2>🔍 SEO设置</h2>
      <button class="btn btn-primary" @click="save" :disabled="saving">{{ saving ? '保存中...' : '保存设置' }}</button>
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
          <input type="file" @change="handleOgImage" accept="image/*" class="form-control" />
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

      <!-- SEO Checklist -->
      <div class="seo-card seo-tips">
        <h3>Google SEO 优化建议</h3>
        <ul class="tips-list">
          <li>✅ 每个产品页面都有独立的标题和描述</li>
          <li>✅ 新闻文章支持独立的SEO标题/描述</li>
          <li>⭐ 确保网站标题包含主要关键词</li>
          <li>⭐ Meta描述要有吸引力，推动用户点击</li>
          <li>⭐ 图片都有alt属性</li>
          <li>⭐ 保持网站加载速度快（图片压缩，缓存）</li>
          <li>⭐ 定期发布高质量的新闻/文章</li>
          <li>⭐ 确保网站移动端友好（已响应式）</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '../../api'

const saving = ref(false)
const ogFile = ref(null)
const ogPreview = ref(null)

const form = ref({
  site_title: '',
  site_description: '',
  site_keywords: '',
  google_analytics: '',
  google_search_console: '',
  robots_txt: 'User-agent: *\nAllow: /\n'
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
        robots_txt: data.robots_txt || 'User-agent: *\nAllow: /\n'
      }
      if (data.og_image) ogPreview.value = data.og_image
    }
  } catch(e) { console.error(e) }
}

async function save() {
  saving.value = true
  try {
    const fd = new FormData()
    Object.entries(form.value).forEach(([k,v]) => fd.append(k, v || ''))
    if (ogFile.value) fd.append('og_image', ogFile.value)
    await api.updateSeoSettings(fd)
    alert('SEO设置保存成功！')
  } catch(e) { alert(e.message) }
  saving.value = false
}

onMounted(load)
</script>

<style scoped>
.seo-page { padding: 0; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.page-header h2 { font-size: 22px; font-weight: 700; }

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

.seo-tips { grid-column: 1 / -1; }

.tips-list { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.tips-list li { font-size: 14px; color: var(--text-secondary); padding: 8px 12px; background: var(--gray-50); border-radius: 6px; }

.btn { padding: 10px 20px; border-radius: 6px; font-weight: 600; cursor: pointer; border: none; font-size: 14px; }
.btn-primary { background: var(--primary); color: white; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

@media (max-width: 768px) { .seo-cards { grid-template-columns: 1fr; } }
</style>
