<template>
  <div class="profile-render-wrapper">
    <!-- 3D Rendering Image -->
    <div class="render-3d">
      <img :src="render3dSrc" :alt="profile.model || 'Roofing Profile'" class="render-img" />
    </div>

    <!-- 2D Dimensions (SVG only for the technical drawing) -->
    <div v-if="showDimensions" class="dimensions-section">
      <div class="dim-title">PROFILE &amp; DIMENSIONS</div>
      <svg :viewBox="dimViewBox" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" class="dim-svg">
        <!-- 2D profile line -->
        <polyline :points="profileLine" fill="none" stroke="#1e293b" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>

        <!-- Rib Height (right side) -->
        <line :x1="dX+dW+35" :y1="dBY" :x2="dX+dW+35" :y2="dBY-dH" stroke="#64748b" stroke-width="1.5"/>
        <line :x1="dX+dW+15" :y1="dBY" :x2="dX+dW+50" :y2="dBY" stroke="#94a3b8"/>
        <line :x1="dX+dW+15" :y1="dBY-dH" :x2="dX+dW+50" :y2="dBY-dH" stroke="#94a3b8"/>
        <polygon :points="`${dX+dW+30},${dBY-8} ${dX+dW+40},${dBY-8} ${dX+dW+35},${dBY}`" fill="#64748b"/>
        <polygon :points="`${dX+dW+30},${dBY-dH+8} ${dX+dW+40},${dBY-dH+8} ${dX+dW+35},${dBY-dH}`" fill="#64748b"/>
        <text :x="dX+dW+58" :y="dBY-dH/2+7" fill="#334155" font-size="22" font-weight="600" font-family="Arial,sans-serif">{{ profile.rib_height }}mm</text>

        <!-- Pitch (top) -->
        <g v-if="profile.pitch">
          <line :x1="dX" :y1="dBY-dH-32" :x2="dX+dP" :y2="dBY-dH-32" stroke="#64748b" stroke-width="1.5"/>
          <line :x1="dX" :y1="dBY-dH-10" :x2="dX" :y2="dBY-dH-42" stroke="#94a3b8"/>
          <line :x1="dX+dP" :y1="dBY-dH-10" :x2="dX+dP" :y2="dBY-dH-42" stroke="#94a3b8"/>
          <polygon :points="`${dX+8},${dBY-dH-37} ${dX+8},${dBY-dH-27} ${dX},${dBY-dH-32}`" fill="#64748b"/>
          <polygon :points="`${dX+dP-8},${dBY-dH-37} ${dX+dP-8},${dBY-dH-27} ${dX+dP},${dBY-dH-32}`" fill="#64748b"/>
          <text :x="dX+dP/2" :y="dBY-dH-48" text-anchor="middle" fill="#334155" font-size="22" font-weight="600" font-family="Arial,sans-serif">{{ profile.pitch }}mm</text>
        </g>

        <!-- Effective Coverage (bottom) -->
        <line :x1="dX" :y1="dBY+42" :x2="dX+dW" :y2="dBY+42" stroke="#1e3a5f" stroke-width="1.5"/>
        <line :x1="dX" :y1="dBY+8" :x2="dX" :y2="dBY+50" stroke="#94a3b8"/>
        <line :x1="dX+dW" :y1="dBY+8" :x2="dX+dW" :y2="dBY+50" stroke="#94a3b8"/>
        <polygon :points="`${dX+10},${dBY+37} ${dX+10},${dBY+47} ${dX},${dBY+42}`" fill="#1e3a5f"/>
        <polygon :points="`${dX+dW-10},${dBY+37} ${dX+dW-10},${dBY+47} ${dX+dW},${dBY+42}`" fill="#1e3a5f"/>
        <text :x="dX+dW/2" :y="dBY+72" text-anchor="middle" fill="#0f172a" font-size="26" font-weight="700" font-family="Arial,sans-serif">Effective Coverage {{ profile.effective_width }}mm</text>
        <text :x="dX+dW/2" :y="dBY+100" text-anchor="middle" fill="#64748b" font-size="20" font-family="Arial,sans-serif">Overall Width (Coil) {{ profile.coil_width }}mm</text>
      </svg>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  profile:        { type: Object,  required: true },
  width:          String,
  height:         String,
  showDimensions: { type: Boolean, default: false }
})

// ── 3D image mapping ──────────────────────────────────────────────────────
const profileImageMap = {
  trapezoidal:   '/textures/profile-trapezoidal.png',
  wall_panel:    '/textures/profile-trapezoidal.png',
  corrugated:    '/textures/profile-corrugated.png',
  standing_seam: '/textures/profile-standing-seam.png',
  glazed_tile:   '/textures/profile-glazed-tile.png',
}

const render3dSrc = computed(() => {
  const type = props.profile.profile_type || 'trapezoidal'
  return profileImageMap[type] || profileImageMap.trapezoidal
})

// ── 2D Dimension constants ────────────────────────────────────────────────
const PERIODS = 5
const dX   = 80       // start X
const dBY  = 200      // base Y (bottom of profile)

const dP = computed(() => {
  // Scale pitch to fit nicely
  return Math.min(160, Math.max(70, 700 / PERIODS))
})

const dH = computed(() => {
  const h = Number(props.profile.rib_height) || 30
  const p = Number(props.profile.pitch) || 200
  return Math.max(18, (h / p) * dP.value * 1.4)
})

const dW = computed(() => dP.value * PERIODS)

// ── Build 2D profile line ─────────────────────────────────────────────────
const profileLine = computed(() => {
  const pts = []
  const p = dP.value, h = dH.value
  const type = props.profile.profile_type || 'trapezoidal'

  if (type === 'corrugated') {
    const segs = 20
    for (let i = 0; i <= PERIODS * segs; i++) {
      const t = i / segs
      const x = dX + t * p
      const y = dBY - h/2 + Math.cos(t * Math.PI * 2) * (h/2)
      pts.push(`${x},${y}`)
    }
  } else if (type === 'standing_seam') {
    const flatW = p * 0.78, seamW = p * 0.22
    let x = dX
    pts.push(`${x},${dBY}`)
    for (let i = 0; i < PERIODS; i++) {
      x += flatW; pts.push(`${x},${dBY}`)
      pts.push(`${x},${dBY - h}`)
      x += seamW; pts.push(`${x},${dBY - h}`)
      pts.push(`${x},${dBY}`)
    }
  } else if (type === 'glazed_tile') {
    const stepW = p * 0.72, dropW = p * 0.28
    let x = dX
    for (let i = 0; i < PERIODS; i++) {
      for (let j = 0; j <= 8; j++) {
        const t = j/8
        pts.push(`${x + t*stepW},${dBY - Math.sin(t*Math.PI)*h*0.35}`)
      }
      x += stepW; pts.push(`${x},${dBY}`); x += dropW
    }
  } else {
    // trapezoidal / wall_panel / default
    const tW = p * 0.44, slW = p * 0.14, cW = p * 0.28
    let x = dX
    pts.push(`${x},${dBY}`)
    for (let i = 0; i < PERIODS; i++) {
      x += tW;  pts.push(`${x},${dBY}`)
      x += slW; pts.push(`${x},${dBY - h}`)
      x += cW;  pts.push(`${x},${dBY - h}`)
      x += slW; pts.push(`${x},${dBY}`)
    }
  }
  return pts.join(' ')
})

// ── SVG viewBox ───────────────────────────────────────────────────────────
const dimViewBox = computed(() => {
  const minX = 0
  const minY = dBY - dH.value - 70
  const maxX = dX + dW.value + 130
  const maxY = dBY + 120
  return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`
})
</script>

<style scoped>
.profile-render-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.render-3d {
  width: 100%;
  background: #f8fafb;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 12px 8px 0;
}

.render-img {
  width: 100%;
  max-height: 220px;
  object-fit: contain;
}

.dimensions-section {
  width: 100%;
  border-top: 1px solid #e8ecf0;
  background: #fff;
  padding: 8px 8px 4px;
}

.dim-title {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: 1px;
  margin-bottom: 4px;
  font-family: Arial, sans-serif;
}

.dim-svg {
  width: 100%;
  max-height: 180px;
}
</style>
