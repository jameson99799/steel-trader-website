<template>
  <div class="page-texts-page">
    <h1>页面文字管理</h1>
    <p class="page-desc">在这里修改网站各页面的文字内容，支持中英文配置。</p>

    <div class="card">
      <div class="card-body">
        <form @submit.prevent="handleSubmit">

          <h3 class="section-title">Logo / 品牌标语</h3>
          <div class="form-group">
            <label>Logo 副标题（英文）<span class="hint">显示在 Logo 名称下方</span></label>
            <input v-model="form.logo_subtitle" type="text" class="form-control" placeholder="Professional LED Solutions" />
          </div>

          <h3 class="section-title">首页 - 精选产品区域</h3>
          <div class="grid grid-2">
            <div class="form-group">
              <label>副标题（中文）</label>
              <input v-model="form.featured_subtitle" type="text" class="form-control" />
            </div>
            <div class="form-group">
              <label>副标题（英文）</label>
              <input v-model="form.featured_subtitle_en" type="text" class="form-control" />
            </div>
          </div>

          <h3 class="section-title">首页 - 产品分类区域</h3>
          <div class="grid grid-2">
            <div class="form-group">
              <label>副标题（中文）</label>
              <input v-model="form.categories_subtitle" type="text" class="form-control" />
            </div>
            <div class="form-group">
              <label>副标题（英文）</label>
              <input v-model="form.categories_subtitle_en" type="text" class="form-control" />
            </div>
          </div>

          <h3 class="section-title">首页 - 企业优势区域</h3>
          <div class="grid grid-2">
            <div class="form-group">
              <label>副标题（中文）</label>
              <input v-model="form.advantages_subtitle" type="text" class="form-control" />
            </div>
            <div class="form-group">
              <label>副标题（英文）</label>
              <input v-model="form.advantages_subtitle_en" type="text" class="form-control" />
            </div>
          </div>

          <h3 class="section-title">首页 - CTA 行动号召区域</h3>
          <div class="grid grid-2">
            <div class="form-group">
              <label>标题（中文）</label>
              <input v-model="form.cta_title" type="text" class="form-control" />
            </div>
            <div class="form-group">
              <label>标题（英文）</label>
              <input v-model="form.cta_title_en" type="text" class="form-control" />
            </div>
          </div>
          <div class="grid grid-2">
            <div class="form-group">
              <label>副标题（中文）</label>
              <input v-model="form.cta_subtitle" type="text" class="form-control" />
            </div>
            <div class="form-group">
              <label>副标题（英文）</label>
              <input v-model="form.cta_subtitle_en" type="text" class="form-control" />
            </div>
          </div>

          <h3 class="section-title">产品列表页</h3>
          <div class="grid grid-2">
            <div class="form-group">
              <label>副标题（中文）</label>
              <input v-model="form.products_page_subtitle" type="text" class="form-control" />
            </div>
            <div class="form-group">
              <label>副标题（英文）</label>
              <input v-model="form.products_page_subtitle_en" type="text" class="form-control" />
            </div>
          </div>

          <h3 class="section-title">联系我们页面</h3>
          <div class="grid grid-2">
            <div class="form-group">
              <label>页面标题（中文）</label>
              <input v-model="form.contact_page_title" type="text" class="form-control" />
            </div>
            <div class="form-group">
              <label>页面标题（英文）</label>
              <input v-model="form.contact_page_title_en" type="text" class="form-control" />
            </div>
          </div>
          <div class="grid grid-2">
            <div class="form-group">
              <label>页面副标题（中文）</label>
              <input v-model="form.contact_page_subtitle" type="text" class="form-control" />
            </div>
            <div class="form-group">
              <label>页面副标题（英文）</label>
              <input v-model="form.contact_page_subtitle_en" type="text" class="form-control" />
            </div>
          </div>
          <div class="grid grid-2">
            <div class="form-group">
              <label>表单说明（中文）</label>
              <textarea v-model="form.contact_form_desc" class="form-control" rows="2"></textarea>
            </div>
            <div class="form-group">
              <label>表单说明（英文）</label>
              <textarea v-model="form.contact_form_desc_en" class="form-control" rows="2"></textarea>
            </div>
          </div>

          <h3 class="section-title">产品详情页 - 联系面板</h3>
          <div class="grid grid-2">
            <div class="form-group">
              <label>面板标题（中文）</label>
              <input v-model="form.inquiry_panel_title" type="text" class="form-control" />
            </div>
            <div class="form-group">
              <label>面板标题（英文）</label>
              <input v-model="form.inquiry_panel_title_en" type="text" class="form-control" />
            </div>
          </div>
          <div class="grid grid-2">
            <div class="form-group">
              <label>询盘弹窗副标题（中文）<span class="hint">显示在询盘弹窗标题下方，如：Get a quote for your LED requirements</span></label>
              <input v-model="form.inquiry_subtitle" type="text" class="form-control" placeholder="Get a quote for your LED requirements" />
            </div>
            <div class="form-group">
              <label>询盘弹窗副标题（英文）</label>
              <input v-model="form.inquiry_subtitle_en" type="text" class="form-control" placeholder="Get a quote for your LED requirements" />
            </div>
          </div>

          <h3 class="section-title">联系我们页面 - 额外文字</h3>
          <div class="grid grid-2">
            <div class="form-group">
              <label>联系信息区域标语（中文）<span class="hint">显示在联系人名称下方</span></label>
              <input v-model="form.contact_tagline" type="text" class="form-control" placeholder="Professional LED Solutions Provider" />
            </div>
            <div class="form-group">
              <label>联系信息区域标语（英文）</label>
              <input v-model="form.contact_tagline_en" type="text" class="form-control" />
            </div>
          </div>

          <h3 class="section-title">关于我们页面</h3>
          <div class="grid grid-2">
            <div class="form-group">
              <label>图片上标语（中文）<span class="hint">about_overlay_text</span></label>
              <input v-model="form.about_overlay_text" type="text" class="form-control" placeholder="Professional LED Solutions" />
            </div>
            <div class="form-group">
              <label>图片上标语（英文）</label>
              <input v-model="form.about_overlay_text_en" type="text" class="form-control" />
            </div>
          </div>
          <div class="grid grid-2">
            <div class="form-group">
              <label>公司副标题/口号（中文）<span class="hint">如：Trusted LED Manufacturer</span></label>
              <input v-model="form.about_tagline" type="text" class="form-control" />
            </div>
            <div class="form-group">
              <label>公司副标题/口号（英文）</label>
              <input v-model="form.about_tagline_en" type="text" class="form-control" />
            </div>
          </div>
          <div class="grid grid-2">
            <div class="form-group">
              <label>ISO认证文字（中文）</label>
              <input v-model="form.about_iso" type="text" class="form-control" placeholder="ISO Certified Quality" />
            </div>
            <div class="form-group">
              <label>ISO认证文字（英文）</label>
              <input v-model="form.about_iso_en" type="text" class="form-control" />
            </div>
          </div>
          <div class="grid grid-2">
            <div class="form-group">
              <label>出口经验文字（中文）</label>
              <input v-model="form.about_global" type="text" class="form-control" placeholder="Global Export Experience" />
            </div>
            <div class="form-group">
              <label>出口经验文字（英文）</label>
              <input v-model="form.about_global_en" type="text" class="form-control" />
            </div>
          </div>
          <div class="grid grid-2">
            <div class="form-group">
              <label>创新技术文字（中文）</label>
              <input v-model="form.about_innovation" type="text" class="form-control" placeholder="Innovation & Technology" />
            </div>
            <div class="form-group">
              <label>创新技术文字（英文）</label>
              <input v-model="form.about_innovation_en" type="text" class="form-control" />
            </div>
          </div>
          <div class="grid grid-2">
            <div class="form-group">
              <label>CTA 副标题（中文）<span class="hint">关于我们页面底部联系号召</span></label>
              <textarea v-model="form.about_cta_subtitle" class="form-control" rows="2"></textarea>
            </div>
            <div class="form-group">
              <label>CTA 副标题（英文）</label>
              <textarea v-model="form.about_cta_subtitle_en" class="form-control" rows="2"></textarea>
            </div>
          </div>

          <button type="submit" class="btn btn-primary" :disabled="loading">
            {{ loading ? '保存中...' : '保存所有文字' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import api from '../../api'

const loading = ref(false)

const form = reactive({
  logo_subtitle: '',
  featured_subtitle: '', featured_subtitle_en: '',
  categories_subtitle: '', categories_subtitle_en: '',
  advantages_subtitle: '', advantages_subtitle_en: '',
  cta_title: '', cta_title_en: '',
  cta_subtitle: '', cta_subtitle_en: '',
  products_page_subtitle: '', products_page_subtitle_en: '',
  contact_page_title: '', contact_page_title_en: '',
  contact_page_subtitle: '', contact_page_subtitle_en: '',
  contact_form_desc: '', contact_form_desc_en: '',
  inquiry_panel_title: '', inquiry_panel_title_en: '',
  contact_tagline: '', contact_tagline_en: '',
  about_overlay_text: '', about_overlay_text_en: '',
  about_tagline: '', about_tagline_en: '',
  about_cta_subtitle: '', about_cta_subtitle_en: '',
  about_iso: '', about_iso_en: '',
  about_global: '', about_global_en: '',
  about_innovation: '', about_innovation_en: ''
})

const handleSubmit = async () => {
  loading.value = true
  try {
    await api.updatePageTexts({ ...form })
    alert('保存成功')
  } catch (e) {
    alert(e.message)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  try {
    const data = await api.getPageTexts()
    Object.keys(form).forEach(key => {
      if (data[key] !== undefined && data[key] !== null) form[key] = data[key]
    })
  } catch (e) {
    console.error(e)
  }
})
</script>

<style scoped>
.page-texts-page h1 {
  margin-bottom: 8px;
}

.page-desc {
  color: var(--secondary);
  margin-bottom: 24px;
  font-size: 14px;
}

.section-title {
  margin: 28px 0 16px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.hint {
  font-size: 12px;
  color: var(--secondary);
  font-weight: normal;
  margin-left: 8px;
}
</style>
