<template>
  <div class="company-page">
    <h1>公司信息管理</h1>
    
    <div class="card">
      <div class="card-body">
        <form @submit.prevent="handleSubmit">
          <div class="grid grid-2">
            <div class="form-group">
              <label>公司名称（中文）</label>
              <input v-model="form.name" type="text" class="form-control" />
            </div>
            <div class="form-group">
              <label>公司名称（英文）</label>
              <input v-model="form.name_en" type="text" class="form-control" />
            </div>
          </div>

          <div class="grid grid-2">
            <div class="form-group">
              <label>公司简介（中文）</label>
              <textarea v-model="form.description" class="form-control" rows="4"></textarea>
            </div>
            <div class="form-group">
              <label>公司简介（英文）</label>
              <textarea v-model="form.description_en" class="form-control" rows="4"></textarea>
            </div>
          </div>

          <div class="grid grid-2">
            <div class="form-group">
              <label>联系电话</label>
              <input v-model="form.phone" type="text" class="form-control" />
            </div>
            <div class="form-group">
              <label>邮箱地址</label>
              <input v-model="form.email" type="email" class="form-control" />
            </div>
          </div>

          <div class="grid grid-2">
            <div class="form-group">
              <label>WhatsApp</label>
              <input v-model="form.whatsapp" type="text" class="form-control" />
            </div>
            <div class="form-group">
              <label>微信号</label>
              <input v-model="form.wechat" type="text" class="form-control" />
            </div>
          </div>

          <div class="grid grid-2">
            <div class="form-group">
              <label>公司地址（中文）</label>
              <input v-model="form.address" type="text" class="form-control" />
            </div>
            <div class="form-group">
              <label>公司地址（英文）</label>
              <input v-model="form.address_en" type="text" class="form-control" />
            </div>
          </div>

          <div class="grid grid-2">
            <div class="form-group">
              <label>企业优势（中文，每行一条）</label>
              <textarea v-model="form.advantages" class="form-control" rows="4"></textarea>
            </div>
            <div class="form-group">
              <label>企业优势（英文，每行一条）</label>
              <textarea v-model="form.advantages_en" class="form-control" rows="4"></textarea>
            </div>
          </div>

          <h3 class="section-title">社交媒体链接</h3>
          <p class="form-hint">填写完整链接，例如：https://www.facebook.com/yourpage</p>

          <div class="grid grid-2">
            <div class="form-group">
              <label>Facebook 链接</label>
              <input v-model="form.facebook" type="url" class="form-control" placeholder="https://www.facebook.com/..." />
            </div>
            <div class="form-group">
              <label>LinkedIn 链接</label>
              <input v-model="form.linkedin" type="url" class="form-control" placeholder="https://www.linkedin.com/..." />
            </div>
          </div>

          <div class="grid grid-2">
            <div class="form-group">
              <label>Instagram 链接</label>
              <input v-model="form.instagram" type="url" class="form-control" placeholder="https://www.instagram.com/..." />
            </div>
            <div class="form-group">
              <label>TikTok 链接</label>
              <input v-model="form.tiktok" type="url" class="form-control" placeholder="https://www.tiktok.com/..." />
            </div>
          </div>

          <div class="grid grid-2">
            <div class="form-group">
              <label>X (Twitter) 链接</label>
              <input v-model="form.twitter" type="url" class="form-control" placeholder="https://x.com/..." />
            </div>
            <div class="form-group">
              <label>YouTube 链接</label>
              <input v-model="form.youtube" type="url" class="form-control" placeholder="https://www.youtube.com/@yourchannel" />
            </div>
          </div>

          <h3 class="section-title">图片设置</h3>

          <div class="grid grid-3">
            <div class="form-group">
              <label>公司 Logo</label>
              <p class="form-hint">建议尺寸：200×60px，PNG/SVG格式，透明背景</p>
              <input type="file" @change="e => logoFile = e.target.files[0]" accept="image/*" />
              <div class="preview-box" v-if="form.logo || logoFile">
                <img :src="logoFile ? getPreviewUrl(logoFile) : form.logo" />
              </div>
            </div>
            <div class="form-group">
              <label>网站图标 (Favicon)</label>
              <p class="form-hint">建议尺寸：32×32px 或 64×64px，ICO/PNG格式</p>
              <input type="file" @change="e => faviconFile = e.target.files[0]" accept=".ico,.png,.svg,image/*" />
              <div class="preview-box preview-small" v-if="form.favicon || faviconFile">
                <img :src="faviconFile ? getPreviewUrl(faviconFile) : form.favicon" />
              </div>
            </div>
            <div class="form-group">
              <label>关于我们页面图片</label>
              <p class="form-hint">建议尺寸：800×600px，JPG/PNG格式</p>
              <input type="file" @change="e => aboutImageFile = e.target.files[0]" accept="image/*" />
              <div class="preview-box" v-if="form.about_image || aboutImageFile">
                <img :src="aboutImageFile ? getPreviewUrl(aboutImageFile) : form.about_image" />
              </div>
            </div>
          </div>

          <h3 class="section-title">二维码图片</h3>

          <div class="grid grid-2">
            <div class="form-group">
              <label>WhatsApp 二维码</label>
              <p class="form-hint">上传 WhatsApp 二维码图片，显示在产品详情页联系面板中</p>
              <input type="file" @change="e => whatsappQrFile = e.target.files[0]" accept="image/*" />
              <div class="preview-box" v-if="form.whatsapp_qr || whatsappQrFile">
                <img :src="whatsappQrFile ? getPreviewUrl(whatsappQrFile) : form.whatsapp_qr" />
              </div>
            </div>
            <div class="form-group">
              <label>微信 二维码</label>
              <p class="form-hint">上传微信二维码图片，显示在产品详情页联系面板中</p>
              <input type="file" @change="e => wechatQrFile = e.target.files[0]" accept="image/*" />
              <div class="preview-box" v-if="form.wechat_qr || wechatQrFile">
                <img :src="wechatQrFile ? getPreviewUrl(wechatQrFile) : form.wechat_qr" />
              </div>
            </div>
          </div>

          <h3 class="section-title">📍 Google 地图嵌入</h3>
          <div class="form-group">
            <label>Google Maps 嵌入链接 <span class="form-hint-inline">（从 Google Maps → 分享 → 嵌入地图 → 复制 src="" 里的链接）</span></label>
            <input v-model="form.map_embed_url" type="url" class="form-control" placeholder="https://www.google.com/maps/embed?pb=..." />
            <p class="form-hint">填写后，联系我们页面会显示一个嵌入式 Google 地图，方便客户定位。如果不填，则不显示地图。</p>
            <div v-if="form.map_embed_url" class="map-preview">
              <iframe :src="form.map_embed_url" width="100%" height="200" style="border:0;border-radius:8px;" allowfullscreen="" loading="lazy"></iframe>
            </div>
          </div>

          <button type="submit" class="btn btn-primary" :disabled="loading">
            {{ loading ? '保存中...' : '保存' }}
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
const logoFile = ref(null)
const faviconFile = ref(null)
const aboutImageFile = ref(null)
const whatsappQrFile = ref(null)
const wechatQrFile = ref(null)

const form = reactive({
  name: '', name_en: '',
  description: '', description_en: '',
  phone: '', email: '',
  address: '', address_en: '',
  whatsapp: '', wechat: '',
  facebook: '', linkedin: '', instagram: '', tiktok: '', twitter: '', youtube: '',
  logo: '', favicon: '', about_image: '',
  whatsapp_qr: '', wechat_qr: '',
  advantages: '', advantages_en: '',
  map_embed_url: ''
})

const getPreviewUrl = (file) => {
  return URL.createObjectURL(file)
}

const handleSubmit = async () => {
  loading.value = true
  try {
    const formData = new FormData()
    Object.keys(form).forEach(key => {
      if (!['logo', 'favicon', 'about_image', 'whatsapp_qr', 'wechat_qr'].includes(key)) {
        formData.append(key, form[key] || '')
      }
    })
    if (logoFile.value) formData.append('logo', logoFile.value)
    if (faviconFile.value) formData.append('favicon', faviconFile.value)
    if (aboutImageFile.value) formData.append('about_image', aboutImageFile.value)
    if (whatsappQrFile.value) formData.append('whatsapp_qr', whatsappQrFile.value)
    if (wechatQrFile.value) formData.append('wechat_qr', wechatQrFile.value)

    await api.updateCompany(formData)
    alert('保存成功')
    // 刷新数据
    const data = await api.getCompany()
    Object.keys(form).forEach(key => {
      form[key] = data[key] || ''
    })
    logoFile.value = null
    faviconFile.value = null
    aboutImageFile.value = null
    whatsappQrFile.value = null
    wechatQrFile.value = null
  } catch (e) {
    alert(e.message)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  try {
    const data = await api.getCompany()
    Object.keys(form).forEach(key => {
      if (data[key]) form[key] = data[key]
    })
  } catch (e) {
    console.error(e)
  }
})
</script>

<style scoped>
.company-page h1 {
  margin-bottom: 24px;
}

.section-title {
  margin: 30px 0 20px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
  font-size: 18px;
}

.form-hint {
  font-size: 12px;
  color: var(--secondary);
  margin: 4px 0 8px;
}

.preview-box {
  margin-top: 10px;
  width: 120px;
  height: 90px;
  border: 1px solid var(--border);
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
}

.preview-box.preview-small {
  width: 64px;
  height: 64px;
}

.preview-box img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
</style>
