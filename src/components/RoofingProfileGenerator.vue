<template>
  <div class="roofing-profile-widget">
    <!-- Real Photo (if uploaded) -->
    <div v-if="profile.image_url" class="photo-section">
      <img :src="profile.image_url" :alt="profile.model" class="product-photo" />
    </div>

    <!-- 2D Engineering Cross-Section Drawing -->
    <div class="drawing-section">
      <svg
        :viewBox="viewBox"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
        class="profile-svg"
      >
        <defs>
          <!-- Metallic gradient for filled profile -->
          <linearGradient :id="'metal-' + uid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" :stop-color="fillTop" />
            <stop offset="50%" :stop-color="fillMid" />
            <stop offset="100%" :stop-color="fillBottom" />
          </linearGradient>
        </defs>

        <!-- Filled Profile Shape (closed path) -->
        <path
          :d="filledPath"
          :fill="`url(#metal-${uid})`"
          stroke="none"
        />

        <!-- Profile Outline (thick, dark) -->
        <path
          :d="outlinePath"
          fill="none"
          stroke="#1a1a2e"
          stroke-width="2.5"
          stroke-linejoin="round"
          stroke-linecap="round"
        />

        <!-- ── Dimension: Effective Width (top) ── -->
        <g class="dim dim-top">
          <line :x1="dimPad" :y1="dimTopY" :x2="profileWidth + dimPad" :y2="dimTopY" stroke="#1e3a5f" stroke-width="1.2" />
          <!-- left tick -->
          <line :x1="dimPad" :y1="dimTopY - 5" :x2="dimPad" :y2="dimTopY + 5" stroke="#1e3a5f" stroke-width="1.2" />
          <!-- right tick -->
          <line :x1="profileWidth + dimPad" :y1="dimTopY - 5" :x2="profileWidth + dimPad" :y2="dimTopY + 5" stroke="#1e3a5f" stroke-width="1.2" />
          <!-- leader lines -->
          <line :x1="dimPad" :y1="dimTopY + 5" :x2="dimPad" :y2="profileTopY - 2" stroke="#94a3b8" stroke-width="0.6" stroke-dasharray="3,2" />
          <line :x1="profileWidth + dimPad" :y1="dimTopY + 5" :x2="profileWidth + dimPad" :y2="profileTopY - 2" stroke="#94a3b8" stroke-width="0.6" stroke-dasharray="3,2" />
          <!-- arrows -->
          <polygon :points="arrowRight(profileWidth + dimPad, dimTopY)" fill="#1e3a5f" />
          <polygon :points="arrowLeft(dimPad, dimTopY)" fill="#1e3a5f" />
          <!-- label -->
          <text :x="(profileWidth)/2 + dimPad" :y="dimTopY - 6" text-anchor="middle" class="dim-value">{{ profile.effective_width }}mm</text>
          <text :x="(profileWidth)/2 + dimPad" :y="dimTopY - 18" text-anchor="middle" class="dim-label">Effective Width</text>
        </g>

        <!-- ── Dimension: Rib Height (right side) ── -->
        <g class="dim dim-right">
          <line :x1="dimRightX" :y1="profileTopY" :x2="dimRightX" :y2="profileBaseY" stroke="#c0392b" stroke-width="1.2" />
          <!-- top tick -->
          <line :x1="dimRightX - 5" :y1="profileTopY" :x2="dimRightX + 5" :y2="profileTopY" stroke="#c0392b" stroke-width="1.2" />
          <!-- bottom tick -->
          <line :x1="dimRightX - 5" :y1="profileBaseY" :x2="dimRightX + 5" :y2="profileBaseY" stroke="#c0392b" stroke-width="1.2" />
          <!-- leader lines -->
          <line :x1="profileWidth + dimPad + 2" :y1="profileTopY" :x2="dimRightX - 5" :y2="profileTopY" stroke="#94a3b8" stroke-width="0.6" stroke-dasharray="3,2" />
          <line :x1="profileWidth + dimPad + 2" :y1="profileBaseY" :x2="dimRightX - 5" :y2="profileBaseY" stroke="#94a3b8" stroke-width="0.6" stroke-dasharray="3,2" />
          <!-- arrows -->
          <polygon :points="arrowUp(dimRightX, profileTopY)" fill="#c0392b" />
          <polygon :points="arrowDown(dimRightX, profileBaseY)" fill="#c0392b" />
          <!-- label -->
          <text :x="dimRightX + 8" :y="(profileTopY + profileBaseY) / 2 + 4" text-anchor="start" class="dim-value" fill="#c0392b">{{ profile.rib_height }}mm</text>
        </g>

        <!-- ── Dimension: Pitch (bottom) ── -->
        <g v-if="profile.pitch" class="dim dim-bottom">
          <!-- Pick 2nd and 3rd peak for pitch marking -->
          <line :x1="pitchStartX" :y1="dimBottomY" :x2="pitchEndX" :y2="dimBottomY" stroke="#2563eb" stroke-width="1.2" />
          <!-- left tick -->
          <line :x1="pitchStartX" :y1="dimBottomY - 5" :x2="pitchStartX" :y2="dimBottomY + 5" stroke="#2563eb" stroke-width="1.2" />
          <!-- right tick -->
          <line :x1="pitchEndX" :y1="dimBottomY - 5" :x2="pitchEndX" :y2="dimBottomY + 5" stroke="#2563eb" stroke-width="1.2" />
          <!-- leader lines -->
          <line :x1="pitchStartX" :y1="profileBaseY + 2" :x2="pitchStartX" :y2="dimBottomY - 5" stroke="#94a3b8" stroke-width="0.6" stroke-dasharray="3,2" />
          <line :x1="pitchEndX" :y1="profileBaseY + 2" :x2="pitchEndX" :y2="dimBottomY - 5" stroke="#94a3b8" stroke-width="0.6" stroke-dasharray="3,2" />
          <!-- arrows -->
          <polygon :points="arrowRight(pitchEndX, dimBottomY)" fill="#2563eb" />
          <polygon :points="arrowLeft(pitchStartX, dimBottomY)" fill="#2563eb" />
          <!-- label -->
          <text :x="(pitchStartX + pitchEndX) / 2" :y="dimBottomY + 16" text-anchor="middle" class="dim-value" fill="#2563eb">{{ profile.pitch }}mm</text>
          <text :x="(pitchStartX + pitchEndX) / 2" :y="dimBottomY + 28" text-anchor="middle" class="dim-label" fill="#2563eb">Pitch</text>
        </g>
      </svg>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  profile: { type: Object, required: true },
  width: String,
  height: String,
  showDimensions: { type: Boolean, default: true }
})

// Unique ID for gradient references (avoid SVG ID collisions when multiple instances)
const uid = computed(() => `p${props.profile.id || Math.random().toString(36).slice(2, 6)}`)

// ── Layout constants ──
const dimPad = 40          // Left margin for drawing
const dimMarginTop = 35    // Space above profile for top dimension
const dimMarginRight = 55  // Space right of profile for height dimension
const dimMarginBottom = 38 // Space below profile for pitch dimension

// ── Scale: map real mm to SVG units ──
// We want the profile to be roughly 360 SVG units wide
const targetWidth = 360

const profileWidth = computed(() => targetWidth)

const scale = computed(() => {
  const ew = Number(props.profile.effective_width) || 900
  return targetWidth / ew
})

const scaledPitch = computed(() => {
  const p = Number(props.profile.pitch) || 200
  return p * scale.value
})

const scaledHeight = computed(() => {
  const h = Number(props.profile.rib_height) || 25
  // Enforce a minimum visual height and maximum so it looks proportional
  const raw = h * scale.value
  return Math.max(20, Math.min(raw, 80))
})

// ── Y coordinates ──
const profileTopY = computed(() => dimMarginTop + 25)
const profileBaseY = computed(() => profileTopY.value + scaledHeight.value)

// ── Dimension positions ──
const dimTopY = computed(() => profileTopY.value - 12)
const dimRightX = computed(() => dimPad + profileWidth.value + 22)
const dimBottomY = computed(() => profileBaseY.value + 18)

// Actual drawn pitch (adjusted to fit profile width exactly)
const drawnPitch = computed(() => {
  const ew = profileWidth.value
  const p = scaledPitch.value
  const numPeriods = Math.max(2, Math.round(ew / p))
  return ew / numPeriods
})

// ── ViewBox ──
const viewBox = computed(() => {
  const w = dimPad + profileWidth.value + dimMarginRight + 40
  const h = profileBaseY.value + dimMarginBottom + 35
  return `0 0 ${w} ${h}`
})

// ── Colors ──
const fillTop = computed(() => {
  const s = props.profile.current_surface || props.profile.surface || 'ppgi'
  if (s === 'gi') return '#e8ecef'
  if (s === 'gl') return '#d5dbe0'
  // PPGI: use the color
  const c = props.profile.current_color || props.profile.color || '#3b82f6'
  return lighten(c, 30)
})
const fillMid = computed(() => {
  const s = props.profile.current_surface || props.profile.surface || 'ppgi'
  if (s === 'gi') return '#c8cfd6'
  if (s === 'gl') return '#b8c2cc'
  return props.profile.current_color || props.profile.color || '#3b82f6'
})
const fillBottom = computed(() => {
  const s = props.profile.current_surface || props.profile.surface || 'ppgi'
  if (s === 'gi') return '#a0aab4'
  if (s === 'gl') return '#8a97a3'
  const c = props.profile.current_color || props.profile.color || '#3b82f6'
  return darken(c, 25)
})

function lighten(hex, pct) {
  let [r, g, b] = hexToRgb(hex)
  r = Math.min(255, r + (255 - r) * pct / 100)
  g = Math.min(255, g + (255 - g) * pct / 100)
  b = Math.min(255, b + (255 - b) * pct / 100)
  return rgbToHex(r, g, b)
}
function darken(hex, pct) {
  let [r, g, b] = hexToRgb(hex)
  r = Math.max(0, r * (100 - pct) / 100)
  g = Math.max(0, g * (100 - pct) / 100)
  b = Math.max(0, b * (100 - pct) / 100)
  return rgbToHex(r, g, b)
}
function hexToRgb(hex) {
  hex = hex.replace('#', '')
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('')
  return [parseInt(hex.substring(0, 2), 16), parseInt(hex.substring(2, 4), 16), parseInt(hex.substring(4, 6), 16)]
}
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('')
}

// ── Generate profile points ──
const profilePoints = computed(() => {
  const pts = []
  const p = scaledPitch.value
  const h = scaledHeight.value
  const type = props.profile.profile_type || 'trapezoidal'
  const ew = profileWidth.value
  const numPeriods = Math.round(ew / p)
  const actualPeriods = Math.max(2, numPeriods)
  // Recalc actual p to fit exactly
  const ap = ew / actualPeriods
  const topY = profileTopY.value
  const botY = profileBaseY.value
  const x0 = dimPad

  if (type === 'corrugated') {
    // Smooth sine wave
    const segments = actualPeriods * 20
    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const x = x0 + t * ew
      const y = botY - (h / 2) - (h / 2) * Math.cos(t * actualPeriods * 2 * Math.PI)
      pts.push({ x, y })
    }
  } else if (type === 'standing_seam') {
    // Flat panels with narrow tall seams
    const seamW = ap * 0.08
    const flatW = ap - seamW
    let x = x0
    pts.push({ x, y: botY })
    for (let i = 0; i < actualPeriods; i++) {
      x += flatW
      pts.push({ x, y: botY })
      pts.push({ x, y: topY })
      x += seamW
      pts.push({ x, y: topY })
      pts.push({ x, y: botY })
    }
  } else if (type === 'glazed_tile') {
    // Smooth rounded step pattern
    const stepW = ap * 0.65
    const dropW = ap * 0.35
    let x = x0
    for (let i = 0; i < actualPeriods; i++) {
      // Curved rise
      const segs = 8
      for (let j = 0; j <= segs; j++) {
        const t = j / segs
        const cx = x + t * stepW
        const cy = botY - Math.sin(t * Math.PI) * h * 0.4
        pts.push({ x: cx, y: cy })
      }
      x += stepW
      // Drop
      pts.push({ x, y: botY })
      x += dropW
      if (i < actualPeriods - 1) pts.push({ x, y: botY })
    }
  } else {
    // trapezoidal / wall_panel — standard box profile
    const crestW = ap * 0.30
    const slopeW = ap * 0.10
    const troughW = ap - crestW - 2 * slopeW
    let x = x0
    pts.push({ x, y: botY })
    for (let i = 0; i < actualPeriods; i++) {
      // trough
      x += troughW / 2
      pts.push({ x, y: botY })
      // slope up
      x += slopeW
      pts.push({ x, y: topY })
      // crest
      x += crestW
      pts.push({ x, y: topY })
      // slope down
      x += slopeW
      pts.push({ x, y: botY })
      // trough remainder
      x += troughW / 2
      pts.push({ x, y: botY })
    }
  }
  return pts
})

// ── SVG path for the outline ──
const outlinePath = computed(() => {
  const pts = profilePoints.value
  if (!pts.length) return ''
  return 'M ' + pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')
})

// ── SVG path for filled shape (closed at bottom) ──
const filledPath = computed(() => {
  const pts = profilePoints.value
  if (!pts.length) return ''
  const first = pts[0]
  const last = pts[pts.length - 1]
  let d = 'M ' + pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')
  // Close at base
  d += ` L ${last.x.toFixed(1)},${profileBaseY.value} L ${first.x.toFixed(1)},${profileBaseY.value} Z`
  return d
})

// ── Pitch dimension X positions (use drawnPitch for accuracy) ──
const pitchStartX = computed(() => {
  const dp = drawnPitch.value
  // Mark pitch starting from 2nd period start position
  return dimPad + dp
})
const pitchEndX = computed(() => {
  return pitchStartX.value + drawnPitch.value
})

// ── Arrow helpers ──
const arrowRight = (x, y) => `${x},${y} ${x-5},${y-2.5} ${x-5},${y+2.5}`
const arrowLeft = (x, y) => `${x},${y} ${x+5},${y-2.5} ${x+5},${y+2.5}`
const arrowUp = (x, y) => `${x},${y} ${x-2.5},${y+5} ${x+2.5},${y+5}`
const arrowDown = (x, y) => `${x},${y} ${x-2.5},${y-5} ${x+2.5},${y-5}`
</script>

<style scoped>
.roofing-profile-widget {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.photo-section {
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 8px 12px 4px;
}

.product-photo {
  width: 100%;
  max-height: 200px;
  object-fit: contain;
  border-radius: 6px;
}

.drawing-section {
  width: 100%;
  padding: 4px 8px 8px;
}

.profile-svg {
  width: 100%;
  height: auto;
  display: block;
}

/* Dimension text styling */
.dim-value {
  font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
  font-size: 11px;
  font-weight: 700;
  fill: #1e3a5f;
}

.dim-label {
  font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
  font-size: 8px;
  font-weight: 500;
  fill: #64748b;
  letter-spacing: 0.3px;
}
</style>
