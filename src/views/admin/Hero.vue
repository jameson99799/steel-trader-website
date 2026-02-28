<template>
  <div class="hero-page">
    <h1>首页内容管理</h1>
    
    <div class="card">
      <div class="card-body">
        <form @submit.prevent="handleSubmit">
          <div class="grid grid-2">
            <div class="form-group">
              <label>标签（中文）</label>
              <input v-model="form.tag" type="text" class="form-control" />
            </div>
            <div class="form-group">
              <label>标签（英文）</label>
              <input v-model="form.tag_en" type="text" class="form-control" />
            </div>
          </div>

          <div class="grid grid-2">
            <div class="form-group">
              <label>主标题（中文）</label>
              <input v-model="form.title" type="text" class="form-control" />
            </div>
            <div class="form-group">
              <label>主标题（英文）</label>
              <input v-model="form.title_en" type="text" class="form-control" />
            </div>
          </div>

          <div class="grid grid-2">
            <div class="form-group">
              <label>副标题（中文）</label>
              <input v-model="form.subtitle" type="text" class="form-control" />
            </div>
            <div class="form-group">
              <label>副标题（英文）</label>
              <input v-model="form.subtitle_en" type="text" class="form-control" />
            </div>
          </div>

          <h3 style="margin: 20px 0 16px;">统计数据</h3>

          <div class="grid grid-3">
            <div class="form-group">
              <label>数字1</label>
              <input v-model="form.stat1_num" type="text" class="form-control" placeholder="如：10+" />
            </div>
            <div class="form-group">
              <label>标签1（中文）</label>
              <input v-model="form.stat1_label" type="text" class="form-control" />
            </div>
            <div class="form-group">
              <label>标签1（英文）</label>
              <input v-model="form.stat1_label_en" type="text" class="form-control" />
            </div>
          </div>

          <div class="grid grid-3">
            <div class="form-group">
              <label>数字2</label>
              <input v-model="form.stat2_num" type="text" class="form-control" />
            </div>
            <div class="form-group">
              <label>标签2（中文）</label>
              <input v-model="form.stat2_label" type="text" class="form-control" />
            </div>
            <div class="form-group">
              <label>标签2（英文）</label>
              <input v-model="form.stat2_label_en" type="text" class="form-control" />
            </div>
          </div>

          <div class="grid grid-3">
            <div class="form-group">
              <label>数字3</label>
              <input v-model="form.stat3_num" type="text" class="form-control" />
            </div>
            <div class="form-group">
              <label>标签3（中文）</label>
              <input v-model="form.stat3_label" type="text" class="form-control" />
            </div>
            <div class="form-group">
              <label>标签3（英文）</label>
              <input v-model="form.stat3_label_en" type="text" class="form-control" />
            </div>
          </div>

          <button type="submit" class="btn btn-primary" :disabled="loading">保存</button>
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
  tag: '', tag_en: '',
  title: '', title_en: '',
  subtitle: '', subtitle_en: '',
  stat1_num: '', stat1_label: '', stat1_label_en: '',
  stat2_num: '', stat2_label: '', stat2_label_en: '',
  stat3_num: '', stat3_label: '', stat3_label_en: ''
})

const handleSubmit = async () => {
  loading.value = true
  try {
    await api.updateHero(form)
    alert('保存成功')
  } catch (e) {
    alert(e.message)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  try {
    const data = await api.getHero()
    Object.keys(form).forEach(key => {
      if (data[key]) form[key] = data[key]
    })
  } catch (e) {
    console.error(e)
  }
})
</script>

<style scoped>
.hero-page h1 {
  margin-bottom: 24px;
}
</style>
