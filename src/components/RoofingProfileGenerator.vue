<template>
  <div class="profile-drawing-widget">
    <svg :viewBox="viewBox" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" class="profile-svg">
      <!-- Filled Profile Shape -->
      <path :d="filledPath" fill="#e2e8f0" stroke="none" />
      <!-- Profile Outline -->
      <path :d="outlinePath" fill="none" stroke="#1a1a2e" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />

      <!-- Dimension: Effective Width (top) -->
      <g v-if="showDimensions">
        <line :x1="dimPad" :y1="dimTopY" :x2="profileWidth + dimPad" :y2="dimTopY" stroke="#1e3a5f" stroke-width="1.2" />
        <line :x1="dimPad" :y1="dimTopY - 5" :x2="dimPad" :y2="dimTopY + 5" stroke="#1e3a5f" stroke-width="1.2" />
        <line :x1="profileWidth + dimPad" :y1="dimTopY - 5" :x2="profileWidth + dimPad" :y2="dimTopY + 5" stroke="#1e3a5f" stroke-width="1.2" />
        <line :x1="dimPad" :y1="dimTopY + 5" :x2="dimPad" :y2="profileTopY - 2" stroke="#94a3b8" stroke-width="0.6" stroke-dasharray="3,2" />
        <line :x1="profileWidth + dimPad" :y1="dimTopY + 5" :x2="profileWidth + dimPad" :y2="profileTopY - 2" stroke="#94a3b8" stroke-width="0.6" stroke-dasharray="3,2" />
        <polygon :points="arrowRight(profileWidth + dimPad, dimTopY)" fill="#1e3a5f" />
        <polygon :points="arrowLeft(dimPad, dimTopY)" fill="#1e3a5f" />
        <text :x="(profileWidth)/2 + dimPad" :y="dimTopY - 6" text-anchor="middle" class="dim-value">Effective Width  {{ profile.effective_width }}mm</text>
      </g>

      <!-- Dimension: Rib Height (right) -->
      <g v-if="showDimensions">
        <line :x1="dimRightX" :y1="profileTopY" :x2="dimRightX" :y2="profileBaseY" stroke="#c0392b" stroke-width="1.2" />
        <line :x1="dimRightX - 5" :y1="profileTopY" :x2="dimRightX + 5" :y2="profileTopY" stroke="#c0392b" stroke-width="1.2" />
        <line :x1="dimRightX - 5" :y1="profileBaseY" :x2="dimRightX + 5" :y2="profileBaseY" stroke="#c0392b" stroke-width="1.2" />
        <line :x1="profileWidth + dimPad + 2" :y1="profileTopY" :x2="dimRightX - 5" :y2="profileTopY" stroke="#94a3b8" stroke-width="0.6" stroke-dasharray="3,2" />
        <line :x1="profileWidth + dimPad + 2" :y1="profileBaseY" :x2="dimRightX - 5" :y2="profileBaseY" stroke="#94a3b8" stroke-width="0.6" stroke-dasharray="3,2" />
        <polygon :points="arrowUp(dimRightX, profileTopY)" fill="#c0392b" />
        <polygon :points="arrowDown(dimRightX, profileBaseY)" fill="#c0392b" />
        <text :x="dimRightX + 8" :y="(profileTopY + profileBaseY) / 2 + 4" text-anchor="start" class="dim-value" fill="#c0392b">{{ profile.rib_height }}mm</text>
      </g>

      <!-- Dimension: Pitch (bottom) -->
      <g v-if="showDimensions && profile.pitch">
        <line :x1="pitchStartX" :y1="dimBottomY" :x2="pitchEndX" :y2="dimBottomY" stroke="#2563eb" stroke-width="1.2" />
        <line :x1="pitchStartX" :y1="dimBottomY - 5" :x2="pitchStartX" :y2="dimBottomY + 5" stroke="#2563eb" stroke-width="1.2" />
        <line :x1="pitchEndX" :y1="dimBottomY - 5" :x2="pitchEndX" :y2="dimBottomY + 5" stroke="#2563eb" stroke-width="1.2" />
        <line :x1="pitchStartX" :y1="profileBaseY + 2" :x2="pitchStartX" :y2="dimBottomY - 5" stroke="#94a3b8" stroke-width="0.6" stroke-dasharray="3,2" />
        <line :x1="pitchEndX" :y1="profileBaseY + 2" :x2="pitchEndX" :y2="dimBottomY - 5" stroke="#94a3b8" stroke-width="0.6" stroke-dasharray="3,2" />
        <polygon :points="arrowRight(pitchEndX, dimBottomY)" fill="#2563eb" />
        <polygon :points="arrowLeft(pitchStartX, dimBottomY)" fill="#2563eb" />
        <text :x="(pitchStartX + pitchEndX) / 2" :y="dimBottomY + 16" text-anchor="middle" class="dim-value" fill="#2563eb">Pitch  {{ profile.pitch }}mm</text>
      </g>
    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  profile: { type: Object, required: true },
  showDimensions: { type: Boolean, default: true }
})

// Layout
const dimPad = 40
const targetWidth = 420
const profileWidth = computed(() => targetWidth)

const scale = computed(() => targetWidth / (Number(props.profile.effective_width) || 900))
const scaledPitch = computed(() => (Number(props.profile.pitch) || 200) * scale.value)
const scaledHeight = computed(() => Math.max(18, Math.min((Number(props.profile.rib_height) || 25) * scale.value, 80)))
const numPeriods = computed(() => Math.max(2, Math.round(profileWidth.value / scaledPitch.value)))
const drawnPitch = computed(() => profileWidth.value / numPeriods.value)

const profileTopY = computed(() => 60)
const profileBaseY = computed(() => profileTopY.value + scaledHeight.value)
const dimTopY = computed(() => profileTopY.value - 12)
const dimRightX = computed(() => dimPad + profileWidth.value + 22)
const dimBottomY = computed(() => profileBaseY.value + 18)

const viewBox = computed(() => {
  const w = dimPad + profileWidth.value + 80
  const h = profileBaseY.value + 50
  return `0 0 ${w} ${h}`
})

// Profile points
const profilePoints = computed(() => {
  const pts = []
  const p = drawnPitch.value
  const h = scaledHeight.value
  const type = props.profile.profile_type || 'trapezoidal'
  const np = numPeriods.value
  const ew = profileWidth.value
  const topY = profileTopY.value
  const botY = profileBaseY.value
  const x0 = dimPad

  if (type === 'corrugated') {
    const segments = np * 20
    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      pts.push({ x: x0 + t * ew, y: botY - (h/2) - (h/2) * Math.cos(t * np * 2 * Math.PI) })
    }
  } else if (type === 'standing_seam') {
    const seamW = p * 0.08, flatW = p - seamW
    let x = x0
    pts.push({ x, y: botY })
    for (let i = 0; i < np; i++) {
      x += flatW; pts.push({ x, y: botY }); pts.push({ x, y: topY })
      x += seamW; pts.push({ x, y: topY }); pts.push({ x, y: botY })
    }
  } else if (type === 'glazed_tile') {
    const stepW = p * 0.65, dropW = p * 0.35
    let x = x0
    for (let i = 0; i < np; i++) {
      for (let j = 0; j <= 8; j++) {
        const t = j / 8
        pts.push({ x: x + t * stepW, y: botY - Math.sin(t * Math.PI) * h * 0.4 })
      }
      x += stepW; pts.push({ x, y: botY }); x += dropW
      if (i < np - 1) pts.push({ x, y: botY })
    }
  } else {
    // trapezoidal / wall_panel
    const crestW = p * 0.30, slopeW = p * 0.10, troughW = p - crestW - 2 * slopeW
    let x = x0
    pts.push({ x, y: botY })
    for (let i = 0; i < np; i++) {
      x += troughW / 2; pts.push({ x, y: botY })
      x += slopeW; pts.push({ x, y: topY })
      x += crestW; pts.push({ x, y: topY })
      x += slopeW; pts.push({ x, y: botY })
      x += troughW / 2; pts.push({ x, y: botY })
    }
  }
  return pts
})

const outlinePath = computed(() => {
  const pts = profilePoints.value
  return pts.length ? 'M ' + pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ') : ''
})

const filledPath = computed(() => {
  const pts = profilePoints.value
  if (!pts.length) return ''
  const first = pts[0], last = pts[pts.length - 1]
  return outlinePath.value + ` L ${last.x.toFixed(1)},${profileBaseY.value} L ${first.x.toFixed(1)},${profileBaseY.value} Z`
})

const pitchStartX = computed(() => dimPad + drawnPitch.value)
const pitchEndX = computed(() => pitchStartX.value + drawnPitch.value)

const arrowRight = (x, y) => `${x},${y} ${x-5},${y-2.5} ${x-5},${y+2.5}`
const arrowLeft = (x, y) => `${x},${y} ${x+5},${y-2.5} ${x+5},${y+2.5}`
const arrowUp = (x, y) => `${x},${y} ${x-2.5},${y+5} ${x+2.5},${y+5}`
const arrowDown = (x, y) => `${x},${y} ${x-2.5},${y-5} ${x+2.5},${y-5}`
</script>

<style scoped>
.profile-drawing-widget { width: 100%; }
.profile-svg { width: 100%; height: auto; display: block; }
.dim-value {
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  font-size: 11px; font-weight: 700; fill: #1e3a5f;
}
</style>
