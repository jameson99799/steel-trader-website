<template>
  <div class="login-page">
    <div class="login-box">
      <h1>后台管理</h1>
      <form @submit.prevent="handleLogin">
        <p v-if="loginError" class="login-error" role="alert">{{ loginError }}</p>
        <div class="form-group">
          <label>用户名</label>
          <input v-model="form.username" type="text" class="form-control" required />
        </div>
        <div class="form-group">
          <label>密码</label>
          <input v-model="form.password" type="password" class="form-control" required />
        </div>
        <button type="submit" class="btn btn-primary btn-block" :disabled="loading">
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import api from '../../api'

const router = useRouter()
const loading = ref(false)
const loginError = ref('')
const form = reactive({
  username: '',
  password: ''
})

const handleLogin = async () => {
  loginError.value = ''
  loading.value = true
  try {
    const res = await api.login(form)
    localStorage.setItem('token', res.token)
    const redirectPath = router.currentRoute.value.query.redirect
    if (redirectPath && redirectPath.startsWith('/')) {
      await router.push(redirectPath)
    } else {
      await router.push('/admin/dashboard')
    }
  } catch (e) {
    loginError.value = e?.message || '登录失败，请检查网络后重试。'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--light);
}

.login-box {
  background: #fff;
  padding: 40px;
  border-radius: 8px;
  box-shadow: var(--shadow);
  width: 100%;
  max-width: 400px;
}

.login-error {
  margin: 0 0 16px;
  padding: 10px 12px;
  color: #b91c1c;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  font-size: 14px;
}

.login-box h1 {
  text-align: center;
  margin-bottom: 30px;
  font-size: 24px;
}

.btn-block {
  width: 100%;
}
</style>
