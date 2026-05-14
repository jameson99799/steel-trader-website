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
          <p class="page-subtitle">Professional technical drawings and specifications for our steel roofing panels.</p>
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
        <!-- Each profile is a full-width product datasheet -->
        <div class="product-sheet" v-for="profile in filteredProfiles" :key="profile.id">
          
          <!-- Title Bar -->
          <div class="sheet-title-bar">
            <div class="sheet-title-left">
              <h2 class="sheet-model">{{ profile.model }}</h2>
              <span class="sheet-type-badge">{{ formatType(profile.profile_type) }}</span>
            </div>
            <div class="sheet-title-right">
              <span class="sheet-surface-tag">{{ formatSurface(profile.current_surface || profile.surface) }}</span>
            </div>
          </div>

          <!-- Middle Section: 3D Rendering + 2D Dimensions -->
          <div class="sheet-middle">
            <!-- 3D Rendering Section -->
            <div class="sheet-3d-section">
              <div class="section-label">3D RENDERING</div>
              <div class="rendering-area">
                <img v-if="profile.image_url" :src="profile.image_url" :alt="profile.model" class="rendering-img" />
                <img v-else :src="getDefaultImage(profile)" :alt="profile.model" class="rendering-img" />
              </div>
            </div>

            <!-- Profile & Dimensions Section -->
            <div class="sheet-dimensions-section">
              <div class="section-label section-label-primary">PROFILE &amp; DIMENSIONS</div>
              <div class="dimensions-drawing">
                <RoofingProfileGenerator :profile="profile" :showDimensions="true" />
              </div>
            </div>
          </div>

          <!-- Bottom Section: Isometric View + Specifications Table -->
          <div class="sheet-bottom">
            <!-- Left: Small isometric thumbnail + surface controls -->
            <div class="bottom-left">
              <div class="iso-preview">
                <img :src="getDefaultImage(profile)" :alt="profile.model" class="iso-img" />
              </div>
              <!-- Surface controls -->
              <div class="surface-controls" v-if="!profile.image_url">
                <div class="control-group">
                  <label class="ctrl-label">Surface</label>
                  <select v-model="profile.current_surface" class="ctrl-select" @change="updateProfileSurface(profile)">
                    <option value="ppgi">PPGI / PPGL</option>
                    <option value="gi">GI (Galvanized)</option>
                    <option value="gl">GL (Galvalume)</option>
                  </select>
                </div>
                <div class="control-group" v-if="profile.current_surface === 'ppgi'">
                  <label class="ctrl-label">Color</label>
                  <input type="text" v-model="profile.ral_input" class="ctrl-input" placeholder="e.g. RAL 9016" @input="updateProfileColor(profile)" />
                  <div class="color-swatch-large" :style="{ backgroundColor: profile.current_color }" @click="openColorModal(profile)" title="Click to select RAL color">
                    <span class="swatch-text" :class="{'dark-text': isLightColor(profile.current_color)}">
                      {{ profile.current_color ? profile.ral_input : 'Select RAL Color' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right: Specifications Table -->
            <div class="bottom-right">
              <div class="specs-table-header">SPECIFICATIONS</div>
              <table class="specs-table">
                <tbody>
                  <tr>
                    <td class="spec-key">Material</td>
                    <td class="spec-val">{{ formatMaterial(profile) }}</td>
                  </tr>
                  <tr>
                    <td class="spec-key">Thickness (TCT)</td>
                    <td class="spec-val">{{ formatThickness(profile) }}</td>
                  </tr>
                  <tr>
                    <td class="spec-key">Effective Width</td>
                    <td class="spec-val">{{ profile.effective_width }} mm</td>
                  </tr>
                  <tr>
                    <td class="spec-key">Overall Width</td>
                    <td class="spec-val">{{ profile.coil_width }} mm</td>
                  </tr>
                  <tr v-if="profile.pitch">
                    <td class="spec-key">Pitch</td>
                    <td class="spec-val">{{ profile.pitch }} mm</td>
                  </tr>
                  <tr>
                    <td class="spec-key">Rib Height</td>
                    <td class="spec-val">{{ profile.rib_height }} mm</td>
                  </tr>
                  <tr>
                    <td class="spec-key">Coating</td>
                    <td class="spec-val">{{ formatCoating(profile) }}</td>
                  </tr>
                  <tr>
                    <td class="spec-key">Length</td>
                    <td class="spec-val">{{ profile.length || 'Customizable (Max. 12m)' }}</td>
                  </tr>
                  <tr>
                    <td class="spec-key">Applications</td>
                    <td class="spec-val">{{ profile.applications || 'Roofing, Wall Cladding, Siding' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Color Detail Lightbox -->
  <transition name="fade">
    <div v-if="activeColorLightbox" class="lightbox" @click.self="activeColorLightbox = null">
      <div class="lightbox-card">
        <button class="lb-close" @click="activeColorLightbox = null">✕</button>
        <div class="lb-swatch" :style="{ background: activeColorLightbox.hex }"></div>
        <div class="lb-body">
          <p class="lb-code">{{ activeColorLightbox.code }}</p>
          <p class="lb-name">{{ activeColorLightbox.name }}</p>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import RoofingProfileGenerator from '../components/RoofingProfileGenerator.vue'
import { useLang } from '../composables/useLang'
import api from '../api'

const { t, localizedValue, langPath } = useLang()

const profiles = ref([])
const categories = ref([])
const ralColors = ref([])
const activeCategory = ref(0)

const filteredProfiles = computed(() => {
  if (activeCategory.value === 0) return profiles.value
  return profiles.value.filter(p => p.category_id == activeCategory.value)
})

const getDefaultImage = (profile) => {
  const type = profile.profile_type || 'trapezoidal'
  const surface = profile.current_surface || profile.surface || 'ppgi'
  
  if (type === 'corrugated') {
    if (surface === 'ppgi') return '/images/roofing/corrugated-ppgi.png'
    return surface === 'gl' ? '/images/roofing/corrugated-gl.png' : '/images/roofing/corrugated-gi.png'
  }
  if (type === 'standing_seam') return '/images/roofing/standing-seam.png'
  if (type === 'glazed_tile') return '/images/roofing/glazed-tile.png'
  
  // trapezoidal / wall_panel
  if (surface === 'gi') return '/images/roofing/trapezoidal-gi.png'
  if (surface === 'gl') return '/images/roofing/trapezoidal-gl.png'
  return '/images/roofing/trapezoidal-ppgi.png'
}

const formatType = (type) => {
  const map = {
    trapezoidal: 'Trapezoidal',
    corrugated: 'Corrugated',
    standing_seam: 'Standing Seam',
    glazed_tile: 'Glazed Tile',
    wall_panel: 'Wall Panel'
  }
  return map[type] || type
}

const formatSurface = (s) => {
  const map = { ppgi: 'PPGI / PPGL', gi: 'Galvanized (GI)', gl: 'Galvalume (GL)' }
  return map[s] || s
}

const formatMaterial = (p) => {
  if (p.material) return p.material;
  const s = p.current_surface || p.surface || 'ppgi'
  if (s === 'gi') return 'Galvanized Steel (GI)'
  if (s === 'gl') return 'Aluminum-Zinc Coated Steel (GL)'
  return 'Pre-Painted Steel (PPGI/PPGL)'
}

const formatThickness = (p) => {
  if (p.thickness) return p.thickness;
  const s = p.current_surface || p.surface || 'ppgi'
  if (s === 'gi' || s === 'gl') return '0.12 – 0.80 mm'
  return '0.25 – 0.80 mm'
}

const formatCoating = (p) => {
  if (p.coating) return p.coating;
  const s = p.current_surface || p.surface || 'ppgi'
  if (s === 'gi') return 'Z60 – Z275 (Galvanized)'
  if (s === 'gl') return 'AZ50 – AZ150 (Galvalume)'
  return 'PE / SMP / HDP / PVDF'
}

const updateProfileSurface = (profile) => {
  profile.surface = profile.current_surface
  if (profile.current_surface !== 'ppgi') {
    profile.color = ''
  } else {
    updateProfileColor(profile)
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
  const normalizedInput = String(code).toUpperCase().replace(/[^A-Z0-9]/g, '').replace('RAL', '')
  const ralObj = ralColors.value.find(r => {
    if (!r.code) return false
    const rCode = String(r.code).toUpperCase().replace(/[^A-Z0-9]/g, '').replace('RAL', '')
    return rCode === normalizedInput
  })
  if (ralObj) {
    profile.current_color = ralObj.hex
    profile.color = ralObj.hex
  }
}

const activeColorLightbox = ref(null)

const openColorModal = (profile) => {
  if (!profile.ral_input) return
  // try to find RAL info
  const code = profile.ral_input.replace(/[^0-9]/g, '')
  const ralObj = ralColors.value.find(r => r.code === code)
  
  activeColorLightbox.value = {
    hex: profile.current_color,
    code: profile.ral_input,
    name: ralObj ? (ralObj.name_en || ralObj.name) : 'Custom Color'
  }
}

const isLightColor = (hex) => {
  if (!hex) return false
  const r = parseInt(hex.slice(1,3), 16)
  const g = parseInt(hex.slice(3,5), 16)
  const b = parseInt(hex.slice(5,7), 16)
  const yiq = ((r*299)+(g*587)+(b*114))/1000
  return yiq >= 128
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
      current_surface: p.surface || 'ppgi',
      default_color: p.color || '#1e40af',
      current_color: p.color || '#1e40af',
      ral_input: ''
    }))
  } catch (e) {
    console.error('Failed to load roofing data', e)
  }
})
</script>

<style scoped>
.profiles-page { min-height: 100vh; background: #f0f2f5; }

.page-header {
  background: var(--white);
  border-bottom: 1px solid var(--border);
  padding: var(--spacing-xl) 0;
}
.header-content { text-align: center; }
.breadcrumb {
  display: flex; align-items: center; justify-content: center;
  gap: var(--spacing-sm); margin-bottom: var(--spacing); font-size: var(--text-sm);
}
.breadcrumb-link { color: var(--text-secondary); text-decoration: none; transition: var(--transition); }
.breadcrumb-link:hover { color: var(--primary); }
.breadcrumb-separator { width: 16px; height: 16px; color: var(--text-muted); }
.breadcrumb-current { color: var(--text-primary); font-weight: 600; }
.page-title { font-size: var(--text-5xl); font-weight: 800; color: var(--text-primary); margin-bottom: var(--spacing-sm); line-height: var(--leading-tight); }
.page-subtitle { color: var(--text-secondary); font-size: var(--text-lg); margin: 0; }

.category-filters {
  background: transparent;
  padding: 0 0 20px;
}
.filter-buttons { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
.filter-btn {
  background: #f1f5f9; border: 1px solid #e2e8f0;
  color: #475569; padding: 8px 22px; border-radius: 50px;
  font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;
}
.filter-btn:hover { background: #e2e8f0; color: #0f172a; }
.filter-btn.active { background: #2563eb; color: #fff; border-color: #2563eb; }

.page-content { padding: 40px 0 60px; }

/* ── Product Sheet ── */
.product-sheet {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 16px rgba(0,0,0,0.08);
  overflow: hidden;
  margin-bottom: 40px;
}

/* Title Bar */
.sheet-title-bar {
  background: #1e293b;
  padding: 20px 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.sheet-title-left { display: flex; align-items: center; gap: 16px; }
.sheet-model {
  font-size: 28px; font-weight: 900; color: #fff; margin: 0;
  letter-spacing: -0.3px;
}
.sheet-type-badge {
  font-size: 12px; font-weight: 700; color: #fff; text-transform: uppercase;
  background: #2563eb; padding: 4px 14px; border-radius: 20px; letter-spacing: 0.5px;
}
.sheet-surface-tag {
  font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.7);
  border: 1px solid rgba(255,255,255,0.2); padding: 4px 14px; border-radius: 20px;
}

/* Middle Section (Side-by-side) */
.sheet-middle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  padding: 0 32px 24px;
  align-items: center;
}

/* 3D Section */
.section-label {
  font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase;
  letter-spacing: 1.5px; padding: 20px 0 8px;
}
.section-label-primary { color: #2563eb; font-size: 13px; }
.rendering-area {
  display: flex; justify-content: center; align-items: center;
  min-height: 250px; background: linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
  border-radius: 8px; overflow: hidden;
  padding: 16px;
}
.rendering-img {
  width: 100%; max-height: 320px; object-fit: contain;
}
.rendering-placeholder { width: 100%; padding: 16px; }

/* Dimensions Section */
.sheet-dimensions-section {
  display: flex; flex-direction: column; justify-content: center;
}
.dimensions-drawing {
  background: #fff;
  padding: 8px 0;
}

/* Bottom Section */
.sheet-bottom {
  display: grid;
  grid-template-columns: 280px 1fr;
  border-top: 1px solid #e2e8f0;
}

.bottom-left {
  padding: 20px 24px;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.iso-preview {
  background: #f8fafc;
  border-radius: 6px;
  padding: 8px;
  min-height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.iso-img {
  width: 100%;
  max-height: 140px;
  object-fit: contain;
  border-radius: 4px;
}

.surface-controls { display: flex; flex-direction: column; gap: 10px; }
.control-group { display: flex; flex-direction: column; gap: 4px; }
.ctrl-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
.ctrl-select {
  padding: 7px 10px; border: 1px solid #cbd5e1; border-radius: 6px;
  font-size: 13px; background: #fff; color: #334155;
}
.ctrl-input {
  width: 100%; padding: 7px 10px; border: 1px solid #cbd5e1; border-radius: 6px;
  font-size: 13px; color: #334155; margin-bottom: 8px; box-sizing: border-box;
}
.color-swatch-large {
  width: 100%; height: 48px; border-radius: 6px;
  border: 1px solid #cbd5e1;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: transform 0.1s, box-shadow 0.1s;
  background-color: #f1f5f9;
}
.color-swatch-large:hover { transform: scale(1.02); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
.swatch-text {
  font-size: 12px; font-weight: 700; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.5);
}
.swatch-text.dark-text {
  color: #1e293b; text-shadow: 0 1px 2px rgba(255,255,255,0.8);
}

.bottom-right { padding: 20px 24px; }

.specs-table-header {
  font-size: 13px; font-weight: 800; color: #1e293b; text-transform: uppercase;
  letter-spacing: 1px; margin-bottom: 12px;
}

.specs-table {
  width: 100%; border-collapse: collapse; font-size: 13px;
}
.specs-table td {
  padding: 8px 12px; border: 1px solid #e2e8f0;
}
.spec-key {
  font-weight: 700; color: #475569; background: #f8fafc; width: 40%;
  white-space: nowrap;
}
.spec-val {
  color: #1e293b; font-weight: 500;
}



@media (max-width: 900px) {
  .sheet-middle { grid-template-columns: 1fr; gap: 16px; }
  .sheet-bottom { grid-template-columns: 1fr; }
  .bottom-left { border-right: none; border-bottom: 1px solid #e2e8f0; }
  .sheet-title-bar { flex-direction: column; gap: 12px; align-items: flex-start; }
}
</style>
