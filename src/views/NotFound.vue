<template>
  <div class="not-found-page">
    <div class="not-found-content">
      <h1 class="error-code">404</h1>
      <h2 class="error-title">{{ t('pageNotFound') || 'Page Not Found' }}</h2>
      <p class="error-desc">{{ t('pageNotFoundDesc') || 'The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.' }}</p>
      <div class="actions">
        <router-link :to="`/${lang}`" class="btn btn-primary">{{ t('backToHome') || 'Back to Home' }}</router-link>
        <router-link :to="`/${lang}/products`" class="btn btn-outline">{{ t('viewProducts') || 'View Products' }}</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useLang } from '../composables/useLang'

const { t, lang } = useLang()
</script>

<style scoped>
.not-found-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 40px 20px;
  background-color: #f8fafc;
}

.not-found-content {
  text-align: center;
  max-width: 600px;
}

.error-code {
  font-size: 120px;
  font-weight: 800;
  color: #e2e8f0;
  margin: 0;
  line-height: 1;
  letter-spacing: -4px;
}

.error-title {
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
  margin: 16px 0;
}

.error-desc {
  font-size: 16px;
  color: #64748b;
  line-height: 1.6;
  margin-bottom: 32px;
}

.actions {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 24px;
  font-size: 15px;
  font-weight: 600;
  border-radius: 8px;
  text-decoration: none;
  transition: all 0.2s;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
  transform: translateY(-1px);
}

.btn-outline {
  background: white;
  color: #3b82f6;
  border: 1px solid #bfdbfe;
}

.btn-outline:hover {
  background: #eff6ff;
  border-color: #93c5fd;
}

@media (max-width: 640px) {
  .error-code { font-size: 80px; }
  .error-title { font-size: 24px; }
  .actions { flex-direction: column; }
}
</style>
