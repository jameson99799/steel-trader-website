<template>
  <div class="settings-page">
    <h1>系统设置</h1>
    
    <div class="card">
      <div class="card-header">修改密码</div>
      <div class="card-body">
        <form @submit.prevent="handleSubmit" style="max-width: 400px;">
          <div class="form-group">
            <label>原密码</label>
            <input v-model="form.oldPassword" type="password" class="form-control" required />
          </div>
          <div class="form-group">
            <label>新密码</label>
            <input v-model="form.newPassword" type="password" class="form-control" required />
          </div>
          <div class="form-group">
            <label>确认新密码</label>
            <input v-model="form.confirmPassword" type="password" class="form-control" required />
          </div>
          <button type="submit" class="btn btn-primary" :disabled="loading">保存</button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import api from '../../api'

const loading = ref(false)
const form = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const handleSubmit = async () => {
  if (form.newPassword !== form.confirmPassword) {
    alert('两次输入的密码不一致')
    return
  }

  loading.value = true
  try {
    await api.changePassword({
      oldPassword: form.oldPassword,
      newPassword: form.newPassword
    })
    alert('密码修改成功')
    form.oldPassword = ''
    form.newPassword = ''
    form.confirmPassword = ''
  } catch (e) {
    alert(e.message)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.settings-page h1 {
  margin-bottom: 24px;
}
</style>
