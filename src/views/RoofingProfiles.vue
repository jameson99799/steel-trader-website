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
          <div class="profile-card" v-for="profile in profiles" :key="profile.name">
            <div class="profile-header">
              <h2 class="profile-name">{{ profile.name }}</h2>
              <span class="profile-type">{{ profile.type }}</span>
            </div>
            <div class="profile-drawing">
              <svg :viewBox="profile.viewBox || '0 0 1000 200'" class="drawing-svg" preserveAspectRatio="xMidYMid meet">
                <!-- Grid background for technical feel -->
                <defs>
                  <pattern :id="'grid-'+profile.name" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(0,0,0,0.05)" stroke-width="0.5"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" :fill="'url(#grid-'+profile.name+')'" />
                
                <!-- The actual profile path -->
                <path :d="profile.svg" class="profile-path" />
                
                <!-- Dimensions (height and width arrows) -->
                <g class="dimensions">
                  <!-- Height dimension line -->
                  <path d="M 30,160 L 30,40" stroke="var(--primary)" stroke-width="1.5" stroke-dasharray="4" />
                  <path d="M 25,160 L 35,160 M 25,40 L 35,40" stroke="var(--primary)" stroke-width="1.5" />
                  <text x="40" y="105" class="dim-text" fill="var(--primary)">H: {{ profile.height }}mm</text>
                  
                  <!-- Pitch dimension line -->
                  <path :d="'M ' + profile.pitchStartX + ',175 L ' + profile.pitchEndX + ',175'" stroke="var(--primary)" stroke-width="1.5" stroke-dasharray="4" v-if="profile.pitchStartX" />
                  <path :d="'M ' + profile.pitchStartX + ',170 L ' + profile.pitchStartX + ',180 M ' + profile.pitchEndX + ',170 L ' + profile.pitchEndX + ',180'" stroke="var(--primary)" stroke-width="1.5" v-if="profile.pitchStartX" />
                  <text :x="(profile.pitchStartX + profile.pitchEndX)/2" y="195" text-anchor="middle" class="dim-text" fill="var(--primary)" v-if="profile.pitchStartX">Pitch: {{ profile.pitch }}mm</text>
                </g>
              </svg>
            </div>
            <div class="profile-specs">
              <div class="spec-item">
                <span class="spec-label">Effective Width</span>
                <span class="spec-value">{{ profile.effectiveWidth }} mm</span>
              </div>
              <div class="spec-item">
                <span class="spec-label">Coil Width</span>
                <span class="spec-value">{{ profile.coilWidth }} mm</span>
              </div>
              <div class="spec-item">
                <span class="spec-label">Rib Height</span>
                <span class="spec-value">{{ profile.height }} mm</span>
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
import { useLang } from '../composables/useLang'

const { t, langPath } = useLang()

const profiles = [
  {
    name: 'YX50-410-820',
    type: 'Trapezoidal Profile',
    pitch: 410,
    height: 50,
    effectiveWidth: 820,
    coilWidth: 1000,
    pitchStartX: 100, pitchEndX: 510,
    svg: `M 50,160 L 100,160 L 140,40 L 370,40 L 410,160 L 510,160 L 550,40 L 780,40 L 820,160 L 870,160`
  },
  {
    name: 'YX35-125-750',
    type: 'Corrugated Profile',
    pitch: 125,
    height: 35,
    effectiveWidth: 750,
    coilWidth: 1000,
    pitchStartX: 162.5, pitchEndX: 287.5,
    svg: `M 100,100 Q 131.25,40 162.5,100 T 225,100 T 287.5,100 T 350,100 T 412.5,100 T 475,100 T 537.5,100 T 600,100 T 662.5,100 T 725,100 T 787.5,100 T 850,100`
  },
  {
    name: 'YX76-380-760',
    type: 'Trapezoidal Profile',
    pitch: 380,
    height: 76,
    effectiveWidth: 760,
    coilWidth: 1000,
    pitchStartX: 120, pitchEndX: 500,
    svg: `M 80,160 L 120,160 L 170,40 L 350,40 L 400,160 L 500,160 L 550,40 L 730,40 L 780,160 L 820,160`
  },
  {
    name: 'YX62-475',
    type: 'Standing Seam Profile',
    pitch: 475,
    height: 62,
    effectiveWidth: 475,
    coilWidth: 600,
    pitchStartX: 200, pitchEndX: 675,
    svg: `M 150,160 L 200,160 L 200,40 L 220,40 L 220,160 L 675,160 L 675,40 L 695,40 L 695,160 L 745,160`
  },
  {
    name: 'YX25-210-840',
    type: 'Glazed Roof Tile Profile',
    pitch: 210,
    height: 25,
    effectiveWidth: 840,
    coilWidth: 1000,
    pitchStartX: 155, pitchEndX: 365,
    svg: `M 50,160 Q 102.5,160 155,100 Q 207.5,160 260,160 Q 312.5,160 365,100 Q 417.5,160 470,160 Q 522.5,160 575,100 Q 627.5,160 680,160 Q 732.5,160 785,100 Q 837.5,160 890,160`
  },
  {
    name: 'YX15-225-900',
    type: 'Wall Panel Profile',
    pitch: 225,
    height: 15,
    effectiveWidth: 900,
    coilWidth: 1000,
    pitchStartX: 150, pitchEndX: 375,
    svg: `M 50,160 L 150,160 L 165,80 L 260,80 L 275,160 L 375,160 L 390,80 L 485,80 L 500,160 L 600,160 L 615,80 L 710,80 L 725,160 L 825,160 L 840,80 L 935,80 L 950,160`
  }
]
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
