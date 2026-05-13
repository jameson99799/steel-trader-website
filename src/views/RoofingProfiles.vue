<template>
  <div class="profiles-page">
    <div class="page-header">
      <div class="container">
        <div class="header-content">
          <nav class="breadcrumb">
            <router-link :to="langPath('/')" class="breadcrumb-link">{{ t('home') }}</router-link>
            <svg class="breadcrumb-separator" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/></svg>
            <router-link :to="langPath('/news')" class="breadcrumb-link">{{ t('news') }}</router-link>
            <svg class="breadcrumb-separator" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/></svg>
            <span class="breadcrumb-current">Roofing Sheet Profiles</span>
          </nav>
          <h1 class="page-title">Roofing Sheet Profiles</h1>
          <p class="page-subtitle">Common technical drawings and specifications for our steel roofing panels.</p>
        </div>
      </div>
    </div>

    <div class="page-content">
      <div class="container">
        <div class="profiles-grid">
          <div class="profile-card" v-for="profile in profiles" :key="profile.id">
            <div class="profile-header">
              <h2 class="profile-name">{{ profile.model }}</h2>
              <span class="profile-type">{{ profile.profile_type }}</span>
            </div>
            <div class="profile-drawing">
              <RoofingProfileGenerator :profile="profile" width="100%" height="200px" :showDimensions="true" />
            </div>
            <div class="profile-specs">
              <div class="spec-item">
                <span class="spec-label">Effective Width</span>
                <span class="spec-value">{{ profile.effective_width }} mm</span>
              </div>
              <div class="spec-item">
                <span class="spec-label">Coil Width</span>
                <span class="spec-value">{{ profile.coil_width }} mm</span>
              </div>
              <div class="spec-item">
                <span class="spec-label">Rib Height</span>
                <span class="spec-value">{{ profile.rib_height }} mm</span>
              </div>
              <div class="spec-item" v-if="profile.pitch">
                <span class="spec-label">Pitch</span>
                <span class="spec-value">{{ profile.pitch }} mm</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useLang } from '../composables/useLang'
import api from '../api'
import RoofingProfileGenerator from '../components/RoofingProfileGenerator.vue'

const { t, langPath } = useLang()

const profiles = ref([])

onMounted(async () => {
  try {
    const res = await api.getNews({ category_slug: 'roofing-sheet-profiles', limit: 100, status: '1' })
    const parsedProfiles = []
    for (const item of (res.data || [])) {
      try {
        const config = JSON.parse(item.content)
        if (config._is_roofing_profile) {
          // Merge sort_order so it can be managed by CMS priority
          parsedProfiles.push({ ...config, id: item.id })
        }
      } catch (e) {
        // Not a JSON config or failed to parse, skip
      }
    }
    profiles.value = parsedProfiles
  } catch (e) {
    console.error('Failed to load roofing profiles', e)
  }
})
</script>

<style scoped>
.profiles-page { min-height: 100vh; background: var(--gray-50); }

.page-header {
  background: var(--white);
  border-bottom: 1px solid var(--border);
  padding: var(--spacing-xl) 0 var(--spacing-lg);
}

.header-content { text-align: center; }

.breadcrumb {
  display: flex; align-items: center; justify-content: center;
  gap: var(--spacing-sm); margin-bottom: var(--spacing); font-size: var(--text-sm);
}
.breadcrumb-link { color: var(--text-secondary); transition: var(--transition); text-decoration: none; }
.breadcrumb-link:hover { color: var(--primary); }
.breadcrumb-separator { width: 16px; height: 16px; color: var(--text-muted); }
.breadcrumb-current { color: var(--text-primary); font-weight: 600; }

.page-title { font-size: var(--text-5xl); font-weight: 800; color: var(--text-primary); margin-bottom: var(--spacing-sm); }
.page-subtitle { color: var(--text-secondary); font-size: var(--text-lg); margin-bottom: var(--spacing-lg); }

.page-content { padding: var(--spacing-2xl) 0; }

.profiles-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-xl);
}

.profile-card {
  background: var(--white);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.profile-header {
  padding: var(--spacing-lg) var(--spacing-lg) 0;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.profile-name {
  font-size: var(--text-2xl);
  font-weight: 800;
  color: var(--primary-dark);
  margin: 0;
}

.profile-type {
  font-size: var(--text-sm);
  color: var(--white);
  background: var(--primary);
  padding: 4px 10px;
  border-radius: 20px;
  font-weight: 600;
}

.profile-drawing {
  padding: var(--spacing-lg);
  background: #fdfdfd;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: center;
}

.drawing-svg {
  width: 100%;
  max-height: 200px;
}

.profile-path {
  fill: none;
  stroke: var(--text-primary);
  stroke-width: 6;
  stroke-linejoin: round;
  stroke-linecap: round;
  filter: drop-shadow(0px 8px 4px rgba(0,0,0,0.1));
}

.dim-text {
  font-size: 14px;
  font-weight: 600;
  font-family: monospace;
}

.profile-specs {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1px;
  background: var(--border);
  padding-top: 1px;
}

.spec-item {
  background: var(--white);
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.spec-label {
  font-size: 12px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}

.spec-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}

@media (max-width: 1024px) {
  .profiles-grid { grid-template-columns: 1fr; }
}
</style>
