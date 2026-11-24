<template>
  <div class="crm-login crm-scope">
    <div class="login-card">
      <div class="login-header">
        <div class="logo-mark">S</div>
        <h1>SunSea CRM</h1>
        <p>客户关系管理系统</p>
      </div>
      <form @submit.prevent="handleLogin">
        <div class="crm-field">
          <label>用户名</label>
          <input class="crm-input" v-model="username" type="text" placeholder="请输入用户名" required autofocus />
        </div>
        <div class="crm-field">
          <label>密码</label>
          <input class="crm-input" v-model="password" type="password" placeholder="请输入密码" required />
        </div>
        <div v-if="error" class="error-msg">{{ error }}</div>
        <button type="submit" :disabled="loading" class="crm-btn crm-btn-primary crm-btn-lg crm-btn-block">
          {{ loading ? '登录中…' : '登 录' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import crmApi from '../../api/crm'

const router = useRouter()
const route = useRoute()
const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleLogin() {
  error.value = ''
  loading.value = true
  try {
    const data = await crmApi.login({ username: username.value, password: password.value })
    crmApi.setToken(data.token)
    const userKey = crmApi.getUserKey()
    localStorage.setItem(userKey, JSON.stringify(data.user))
    const basePath = route.path.startsWith('/crm/sub') ? '/crm/sub' : '/crm'
    router.push(basePath)
  } catch (e) {
    error.value = e.message || '登录失败'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.crm-login {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background:
    radial-gradient(1200px 600px at 20% -10%, rgba(30, 64, 175, 0.35), transparent 60%),
    radial-gradient(900px 500px at 100% 110%, rgba(14, 116, 144, 0.25), transparent 60%),
    linear-gradient(160deg, #0b1f4b 0%, #14306e 55%, #0b1f4b 100%);
}
.login-card {
  background: var(--crm-card);
  border-radius: 18px;
  box-shadow: 0 24px 64px rgba(11, 31, 75, 0.45);
  padding: 44px 38px;
  width: 400px;
  max-width: 92vw;
}
.login-header { text-align: center; margin-bottom: 30px; }
.logo-mark {
  display: inline-flex; align-items: center; justify-content: center;
  width: 52px; height: 52px; border-radius: 14px;
  background: var(--crm-primary);
  color: #fff; font-size: 24px; font-weight: 800;
  box-shadow: 0 6px 18px rgba(30,64,175,0.35);
  margin-bottom: 14px;
}
.login-header h1 { margin: 0; font-size: 24px; color: var(--crm-text); font-weight: 800; letter-spacing: .01em; }
.login-header p { margin: 6px 0 0; color: var(--crm-text-2); font-size: 13px; }
.error-msg {
  background: #fef2f2; color: var(--crm-danger);
  padding: 10px 14px; border-radius: var(--crm-radius-sm);
  font-size: 13px; margin-bottom: 16px;
}
</style>
