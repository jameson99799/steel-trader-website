<template>
  <div class="crm-login">
    <div class="login-card">
      <div class="login-header">
        <div class="logo-icon">📊</div>
        <h1>SunSea CRM</h1>
        <p>客户关系管理系统</p>
      </div>
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label>用户名</label>
          <input v-model="username" type="text" placeholder="请输入用户名" required autofocus />
        </div>
        <div class="form-group">
          <label>密码</label>
          <input v-model="password" type="password" placeholder="请输入密码" required />
        </div>
        <div v-if="error" class="error-msg">{{ error }}</div>
        <button type="submit" :disabled="loading" class="btn-login">
          {{ loading ? '登录中...' : '登 录' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import crmApi from '../../api/crm'

const router = useRouter()
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
    localStorage.setItem('crm_user', JSON.stringify(data.user))
    router.push('/crm')
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
  background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.login-card {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  padding: 48px 40px;
  width: 400px;
  max-width: 90vw;
}
.login-header {
  text-align: center;
  margin-bottom: 32px;
}
.logo-icon {
  font-size: 48px;
  margin-bottom: 8px;
}
.login-header h1 {
  margin: 0;
  font-size: 28px;
  color: #0f172a;
  font-weight: 700;
}
.login-header p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 14px;
}
.form-group {
  margin-bottom: 20px;
}
.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #334155;
}
.form-group input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 15px;
  transition: border-color 0.3s;
  box-sizing: border-box;
}
.form-group input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
}
.error-msg {
  background: #fef2f2;
  color: #dc2626;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 16px;
}
.btn-login {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}
.btn-login:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(37,99,235,0.3);
}
.btn-login:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>
