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

    <!-- Category Filter Buttons -->
    <div class="category-filters" v-if="categories.length > 0">
      <div class="container">
        <div class="filter-buttons">
          <button 
            :class="['filter-btn', activeCategory === 0 ? 'active' : '']" 
            @click="activeCategory = 0"
          >
            All Profiles
          </button>
          <button 
            v-for="cat in categories" 
            :key="cat.id" 
            :class="['filter-btn', activeCategory === cat.id ? 'active' : '']" 
            @click="activeCategory = cat.id"
          >
            {{ localizedValue(cat, 'name') }}
          </button>
        </div>
      </div>
    </div>

    <div class="page-content">
      <div class="container">
        <div class="profiles-grid">
          <div class="profile-card" v-for="profile in filteredProfiles" :key="profile.id">
            <div class="profile-header">
              <h2 class="profile-name">{{ profile.model }}</h2>
              <span class="profile-type">{{ profile.profile_type }}</span>
            </div>
            <div class="profile-drawing">
              <!-- If an image URL exists, show image. Otherwise show 3D Vector -->
              <img v-if="profile.image_url" :src="profile.image_url" :alt="profile.model" style="width:100%; height:200px; object-fit:contain;" />
              <RoofingProfileGenerator v-else :profile="profile" width="100%" height="200px" :showDimensions="true" />
            </div>

            <!-- Integrated Specs Grid -->
            <div class="specs-grid">
              <!-- Column 1: Widths -->
              <div class="spec-column">
                <div class="spec-item">
                  <span class="spec-label" style="color: #2ecc71;">Effective Width</span>
                  <span class="spec-value">{{ profile.effective_width }} mm</span>
                </div>
                <div class="spec-item" style="margin-top: 12px;">
                  <span class="spec-label">Coil Width</span>
                  <span class="spec-value">{{ profile.coil_width }} mm</span>
                </div>
              </div>

              <!-- Column 2: Profile Dimensions -->
              <div class="spec-column">
                <div class="spec-item">
                  <span class="spec-label" style="color: #e74c3c;">Rib Height</span>
                  <span class="spec-value">{{ profile.rib_height }} mm</span>
                </div>
                <div class="spec-item" v-if="profile.pitch" style="margin-top: 12px;">
                  <span class="spec-label" style="color: #3498db;">Pitch</span>
                  <span class="spec-value">{{ profile.pitch }} mm</span>
                </div>
              </div>

              <!-- Column 3: Surface Controls (Far Right) -->
              <div class="spec-column surface-col" v-if="!profile.image_url">
                <span class="spec-label">Surface</span>
                <select v-model="profile.current_surface" class="surface-select" @change="updateProfileSurface(profile)">
                  <option value="ppgi">PPGI / PPGL</option>
                  <option value="gi">GI (Spangle)</option>
                  <option value="gl">GL (Galvalume)</option>
                </select>
                <div class="color-input-wrapper" v-if="profile.current_surface === 'ppgi'" style="margin-top: 8px;">
                  <input type="text" v-model="profile.ral_input" class="ral-input" placeholder="e.g. RAL 9016" @input="updateProfileColor(profile)" />
                  <span class="color-preview" :style="{ backgroundColor: profile.current_color }"></span>
                </div>
              </div>
              <div class="spec-column surface-col" v-else>
                <!-- Empty placeholder for images -->
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useLang } from '../composables/useLang'
import api from '../api'
import RoofingProfileGenerator from '../components/RoofingProfileGenerator.vue'

const { t, localizedValue, langPath } = useLang()

const profiles = ref([])
const categories = ref([])
const ralColors = ref([])
const activeCategory = ref(0)

const filteredProfiles = computed(() => {
  if (activeCategory.value === 0) return profiles.value
  return profiles.value.filter(p => p.category_id === activeCategory.value)
})

const updateProfileSurface = (profile) => {
  profile.surface = profile.current_surface // Sync to generator prop
  if (profile.current_surface !== 'ppgi') {
    profile.color = '' // Clear color for GI/GL
  } else {
    updateProfileColor(profile) // Re-apply RAL color
  }
}

const updateProfileColor = (profile) => {
  const code = profile.ral_input?.trim() || ''
  if (!code) {
    profile.current_color = profile.default_color || '#1e40af'
    profile.color = profile.current_color
    return
  }
  if (code.startsWith('#') && (code.length === 4 || code.length === 7)) {
    profile.current_color = code
    profile.color = code
    return
  }
  
  // Normalize input: uppercase and remove spaces and 'RAL' prefix
  const normalizedInput = code.toUpperCase().replace(/^RAL\s*/, '').replace(/\s+/g, '')

  // Try to find the RAL code in our dictionary
  const ralObj = ralColors.value.find(r => {
    if (!r.code) return false
    const rCode = r.code.toUpperCase().replace(/^RAL\s*/, '').replace(/\s+/g, '')
    return rCode === normalizedInput
  })
  
  if (ralObj) {
    profile.current_color = ralObj.hex
    profile.color = ralObj.hex
  }
}

onMounted(async () => {
  try {
    const [profilesRes, categoriesRes, ralRes] = await Promise.all([
      api.getRoofingProfilesPublic(),
      api.getRoofingCategoriesPublic(),
      api.getRalColors()
    ])
    categories.value = categoriesRes || []
    ralColors.value = ralRes || []
    
    profiles.value = (profilesRes || []).map(p => ({
      ...p,
      // Initialize dynamic state
      current_surface: p.surface || 'ppgi',
      default_color: p.color || '#1e40af',
      current_color: p.color || '#1e40af',
      ral_input: '' // Start empty, uses default_color
    }))
  } catch (e) {
    console.error('Failed to load roofing data', e)
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

.drawing-svg {
  width: 100%;
  max-height: 200px;
}

.specs-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  padding: var(--spacing-sm) var(--spacing-md);
  gap: var(--spacing-sm);
  background: #f8fafc;
}

.spec-column {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.surface-col {
  border-left: 1px solid var(--border);
  padding-left: var(--spacing-md);
}

.spec-item {
  display: flex;
  flex-direction: column;
}

.spec-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 700;
  margin-bottom: 2px;
}

.spec-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.surface-select {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--white);
  font-size: 13px;
  margin-top: 4px;
}
.control-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing);
}

.control-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}

.surface-select, .ral-input {
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  padding: 4px;
  font-size: 12px;
  background: white;
  color: var(--text-primary);
  flex: 1;
}

.color-input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.color-preview {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid rgba(0,0,0,0.1);
  flex-shrink: 0;
}

.category-filters {
  background: var(--white);
  padding: 0 0 var(--spacing-lg);
  border-bottom: 1px solid var(--border);
}

.filter-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

.filter-btn {
  background: #f1f5f9;
  border: 1px solid transparent;
  color: #475569;
  padding: 8px 20px;
  border-radius: 50px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-btn:hover {
  background: #e2e8f0;
}

.filter-btn.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
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
