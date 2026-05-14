<template>
  <div class="roofing-profile-widget">
    <!-- MODE: 3D Isometric Rendering -->
    <svg v-if="renderMode === '3d'" :viewBox="view3d.box" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" class="profile-svg">
      <defs>
        <linearGradient :id="'g3d-top-'+uid" x1="0" y1="0" x2="1" y2="0.5">
          <stop offset="0%" :stop-color="colors3d.highlight" />
          <stop offset="40%" :stop-color="colors3d.top" />
          <stop offset="100%" :stop-color="colors3d.topShadow" />
        </linearGradient>
        <linearGradient :id="'g3d-front-'+uid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="colors3d.front" />
          <stop offset="100%" :stop-color="colors3d.frontDark" />
        </linearGradient>
        <linearGradient :id="'g3d-side-'+uid" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" :stop-color="colors3d.side" />
          <stop offset="100%" :stop-color="colors3d.sideDark" />
        </linearGradient>
      </defs>

      <!-- 3D extruded panels -->
      <g v-for="(panel, i) in panels3d" :key="i">
        <!-- Top face -->
        <polygon :points="panel.top" :fill="`url(#g3d-top-${uid})`" stroke="#0008" stroke-width="0.4" />
        <!-- Front face -->
        <polygon v-if="panel.front" :points="panel.front" :fill="`url(#g3d-front-${uid})`" stroke="#0008" stroke-width="0.4" />
        <!-- Side face (right end only) -->
        <polygon v-if="panel.side" :points="panel.side" :fill="`url(#g3d-side-${uid})`" stroke="#0008" stroke-width="0.4" />
      </g>
    </svg>

    <!-- MODE: Small Isometric Thumbnail -->
    <svg v-else-if="renderMode === 'iso'" :viewBox="viewIso.box" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" class="profile-svg">
      <defs>
        <linearGradient :id="'giso-top-'+uid" x1="0" y1="0" x2="1" y2="0.5">
          <stop offset="0%" :stop-color="colors3d.highlight" />
          <stop offset="50%" :stop-color="colors3d.top" />
          <stop offset="100%" :stop-color="colors3d.topShadow" />
        </linearGradient>
        <linearGradient :id="'giso-front-'+uid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="colors3d.front" />
          <stop offset="100%" :stop-color="colors3d.frontDark" />
        </linearGradient>
      </defs>
      <g v-for="(panel, i) in panelsIso" :key="i">
        <polygon :points="panel.top" :fill="`url(#giso-top-${uid})`" stroke="#0006" stroke-width="0.3" />
        <polygon v-if="panel.front" :points="panel.front" :fill="`url(#giso-front-${uid})`" stroke="#0006" stroke-width="0.3" />
      </g>
    </svg>

    <!-- MODE: 2D Cross-Section with Dimensions -->
    <svg v-else :viewBox="view2d.box" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" class="profile-svg">
      <defs>
        <linearGradient :id="'g2d-'+uid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="fillTop" />
          <stop offset="50%" :stop-color="fillMid" />
          <stop offset="100%" :stop-color="fillBottom" />
        </linearGradient>
      </defs>

      <!-- Filled Profile Shape -->
      <path :d="filledPath" :fill="`url(#g2d-${uid})`" stroke="none" />
      <!-- Profile Outline -->
      <path :d="outlinePath" fill="none" stroke="#1a1a2e" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />

      <!-- Dimension: Effective Width (top) -->
      <g v-if="showDimensions" class="dim">
        <line :x1="dimPad" :y1="dimTopY" :x2="profileWidth + dimPad" :y2="dimTopY" stroke="#1e3a5f" stroke-width="1.2" />
        <line :x1="dimPad" :y1="dimTopY - 5" :x2="dimPad" :y2="dimTopY + 5" stroke="#1e3a5f" stroke-width="1.2" />
        <line :x1="profileWidth + dimPad" :y1="dimTopY - 5" :x2="profileWidth + dimPad" :y2="dimTopY + 5" stroke="#1e3a5f" stroke-width="1.2" />
        <line :x1="dimPad" :y1="dimTopY + 5" :x2="dimPad" :y2="profileTopY - 2" stroke="#94a3b8" stroke-width="0.6" stroke-dasharray="3,2" />
        <line :x1="profileWidth + dimPad" :y1="dimTopY + 5" :x2="profileWidth + dimPad" :y2="profileTopY - 2" stroke="#94a3b8" stroke-width="0.6" stroke-dasharray="3,2" />
        <polygon :points="arrowRight(profileWidth + dimPad, dimTopY)" fill="#1e3a5f" />
        <polygon :points="arrowLeft(dimPad, dimTopY)" fill="#1e3a5f" />
        <text :x="(profileWidth)/2 + dimPad" :y="dimTopY - 6" text-anchor="middle" class="dim-value">{{ profile.effective_width }}mm</text>
        <text :x="(profileWidth)/2 + dimPad" :y="dimTopY - 18" text-anchor="middle" class="dim-label">Effective Width</text>
      </g>

      <!-- Dimension: Rib Height (right) -->
      <g v-if="showDimensions" class="dim">
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
      <g v-if="showDimensions && profile.pitch" class="dim">
        <line :x1="pitchStartX" :y1="dimBottomY" :x2="pitchEndX" :y2="dimBottomY" stroke="#2563eb" stroke-width="1.2" />
        <line :x1="pitchStartX" :y1="dimBottomY - 5" :x2="pitchStartX" :y2="dimBottomY + 5" stroke="#2563eb" stroke-width="1.2" />
        <line :x1="pitchEndX" :y1="dimBottomY - 5" :x2="pitchEndX" :y2="dimBottomY + 5" stroke="#2563eb" stroke-width="1.2" />
        <line :x1="pitchStartX" :y1="profileBaseY + 2" :x2="pitchStartX" :y2="dimBottomY - 5" stroke="#94a3b8" stroke-width="0.6" stroke-dasharray="3,2" />
        <line :x1="pitchEndX" :y1="profileBaseY + 2" :x2="pitchEndX" :y2="dimBottomY - 5" stroke="#94a3b8" stroke-width="0.6" stroke-dasharray="3,2" />
        <polygon :points="arrowRight(pitchEndX, dimBottomY)" fill="#2563eb" />
        <polygon :points="arrowLeft(pitchStartX, dimBottomY)" fill="#2563eb" />
        <text :x="(pitchStartX + pitchEndX) / 2" :y="dimBottomY + 16" text-anchor="middle" class="dim-value" fill="#2563eb">{{ profile.pitch }}mm</text>
        <text :x="(pitchStartX + pitchEndX) / 2" :y="dimBottomY + 28" text-anchor="middle" class="dim-label" fill="#2563eb">Pitch</text>
      </g>
    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  profile: { type: Object, required: true },
  width: String,
  height: String,
  showDimensions: { type: Boolean, default: true },
  mode: { type: String, default: '2d' } // '2d', '3d', 'iso'
})

const renderMode = computed(() => props.mode || '2d')
const uid = computed(() => `${renderMode.value}-${props.profile.id || Math.random().toString(36).slice(2, 6)}`)

// ══════════════════════════════════════════════
//  SHARED: Scale & Colors
// ══════════════════════════════════════════════
const targetWidth = 400
const profileWidth = computed(() => targetWidth)

const scale = computed(() => {
  const ew = Number(props.profile.effective_width) || 900
  return targetWidth / ew
})

const scaledPitch = computed(() => (Number(props.profile.pitch) || 200) * scale.value)

const scaledHeight = computed(() => {
  const raw = (Number(props.profile.rib_height) || 25) * scale.value
  return Math.max(18, Math.min(raw, 80))
})

const numPeriods = computed(() => {
  const ew = profileWidth.value
  const p = scaledPitch.value
  return Math.max(2, Math.round(ew / p))
})
const drawnPitch = computed(() => profileWidth.value / numPeriods.value)

const surfaceType = computed(() => props.profile.current_surface || props.profile.surface || 'ppgi')

const baseColor = computed(() => {
  if (surfaceType.value === 'gi') return '#cdd5dc'
  if (surfaceType.value === 'gl') return '#8a97a3'
  return props.profile.current_color || props.profile.color || '#3b82f6'
})

// ══════════════════════════════════════════════
//  3D MODE: Isometric panels
// ══════════════════════════════════════════════
const colors3d = computed(() => {
  const c = baseColor.value
  const s = surfaceType.value
  if (s === 'gi') return { highlight: '#f0f4f8', top: '#d8dfe7', topShadow: '#b0bac5', front: '#9aa5b0', frontDark: '#6b7b8a', side: '#7d8c9a', sideDark: '#5a6a78' }
  if (s === 'gl') return { highlight: '#c8d0d8', top: '#a0aab5', topShadow: '#7a8894', front: '#687580', frontDark: '#4a5a65', side: '#5a6872', sideDark: '#3e4e58' }
  return {
    highlight: lighten(c, 40), top: lighten(c, 15), topShadow: darken(c, 10),
    front: darken(c, 20), frontDark: darken(c, 40), side: darken(c, 30), sideDark: darken(c, 50)
  }
})

// Generate 3D isometric panels
const panels3d = computed(() => {
  const panels = []
  const dp = drawnPitch.value
  const h = scaledHeight.value
  const np = numPeriods.value
  const type = props.profile.profile_type || 'trapezoidal'
  
  // Isometric projection helpers
  const isoX = (x, z) => x * 0.9 + z * 0.45
  const isoY = (y, z) => -y + z * 0.25
  const depth = 120 // depth of sheet in Z
  const ox = 20, oy = 140 // origin offset

  const project = (x, y, z) => ({ x: ox + isoX(x, z), y: oy + isoY(y, z) })
  const pts = (arr) => arr.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  if (type === 'corrugated') {
    // Sine wave panels rendered as strips
    const segs = np * 8
    for (let i = 0; i < segs; i++) {
      const t0 = i / segs, t1 = (i + 1) / segs
      const x0 = t0 * profileWidth.value, x1 = t1 * profileWidth.value
      const y0 = (h / 2) + (h / 2) * Math.cos(t0 * np * 2 * Math.PI)
      const y1 = (h / 2) + (h / 2) * Math.cos(t1 * np * 2 * Math.PI)
      
      const topFace = [project(x0, y0, 0), project(x1, y1, 0), project(x1, y1, depth), project(x0, y0, depth)]
      panels.push({ top: pts(topFace) })
    }
    // Front edge
    for (let i = 0; i < segs; i++) {
      const t0 = i / segs, t1 = (i + 1) / segs
      const x0 = t0 * profileWidth.value, x1 = t1 * profileWidth.value
      const y0 = (h / 2) + (h / 2) * Math.cos(t0 * np * 2 * Math.PI)
      const y1 = (h / 2) + (h / 2) * Math.cos(t1 * np * 2 * Math.PI)
      const frontFace = [project(x0, y0, 0), project(x1, y1, 0), project(x1, 0, 0), project(x0, 0, 0)]
      if (y0 > 2 || y1 > 2) panels.push({ front: pts(frontFace) })
    }
  } else {
    // Trapezoidal / Standing Seam / etc - rendered as flat panels at different heights
    const crestW = dp * 0.30
    const slopeW = dp * 0.10
    const troughW = dp - crestW - 2 * slopeW

    for (let i = 0; i < np; i++) {
      const baseX = i * dp
      const segments = [
        { x0: baseX, x1: baseX + troughW / 2, y: 0 },                                    // trough left
        { x0: baseX + troughW / 2, x1: baseX + troughW / 2 + slopeW, y0: 0, y1: h },     // slope up
        { x0: baseX + troughW / 2 + slopeW, x1: baseX + troughW / 2 + slopeW + crestW, y: h }, // crest
        { x0: baseX + troughW / 2 + slopeW + crestW, x1: baseX + troughW / 2 + 2 * slopeW + crestW, y0: h, y1: 0 }, // slope down
        { x0: baseX + troughW / 2 + 2 * slopeW + crestW, x1: baseX + dp, y: 0 },         // trough right
      ]
      
      for (const seg of segments) {
        if (seg.y !== undefined) {
          // Flat segment
          const topFace = [project(seg.x0, seg.y, 0), project(seg.x1, seg.y, 0), project(seg.x1, seg.y, depth), project(seg.x0, seg.y, depth)]
          panels.push({ top: pts(topFace) })
        } else {
          // Slope segment
          const topFace = [project(seg.x0, seg.y0, 0), project(seg.x1, seg.y1, 0), project(seg.x1, seg.y1, depth), project(seg.x0, seg.y0, depth)]
          panels.push({ top: pts(topFace) })
        }
      }
    }
    // Front face (visible edge)
    for (let i = 0; i < np; i++) {
      const baseX = i * dp
      const x0 = baseX + troughW / 2
      const x1 = x0 + slopeW
      const x2 = x1 + crestW
      const x3 = x2 + slopeW
      // Front face: trough -> slope -> crest -> slope -> trough
      const frontFace = [
        project(x0, 0, 0), project(x1, h, 0), project(x2, h, 0), project(x3, 0, 0),
        project(x3, 0, 0), project(x3, 0, 0) // degenerate close
      ]
      panels.push({ front: pts([project(x0, 0, 0), project(x1, h, 0), project(x2, h, 0), project(x3, 0, 0)]) })
    }
    // Right side face
    const lastX = np * dp
    panels.push({ side: pts([project(lastX, 0, 0), project(lastX, 0, depth), project(lastX, 0, depth), project(lastX, 0, 0)]) })
  }
  
  return panels
})

const view3d = computed(() => {
  const w = 20 + profileWidth.value * 0.9 + 120 * 0.45 + 40
  const h = 180
  return { box: `0 0 ${w} ${h}` }
})

// Isometric thumbnail (smaller, rotated differently)
const panelsIso = computed(() => panels3d.value) // Reuse same panels
const viewIso = computed(() => view3d.value) // Reuse same view

// ══════════════════════════════════════════════
//  2D MODE: Cross-Section
// ══════════════════════════════════════════════
const dimPad = 40
const dimMarginTop = 35
const dimMarginRight = 55
const dimMarginBottom = 38

const profileTopY = computed(() => dimMarginTop + 25)
const profileBaseY = computed(() => profileTopY.value + scaledHeight.value)
const dimTopY = computed(() => profileTopY.value - 12)
const dimRightX = computed(() => dimPad + profileWidth.value + 22)
const dimBottomY = computed(() => profileBaseY.value + 18)

const view2d = computed(() => {
  const w = dimPad + profileWidth.value + dimMarginRight + 40
  const h = profileBaseY.value + dimMarginBottom + 35
  return { box: `0 0 ${w} ${h}` }
})

const fillTop = computed(() => {
  if (surfaceType.value === 'gi') return '#e8ecef'
  if (surfaceType.value === 'gl') return '#d5dbe0'
  return lighten(baseColor.value, 30)
})
const fillMid = computed(() => {
  if (surfaceType.value === 'gi') return '#c8cfd6'
  if (surfaceType.value === 'gl') return '#b8c2cc'
  return baseColor.value
})
const fillBottom = computed(() => {
  if (surfaceType.value === 'gi') return '#a0aab4'
  if (surfaceType.value === 'gl') return '#8a97a3'
  return darken(baseColor.value, 25)
})

// 2D profile points
const profilePoints = computed(() => {
  const pts = []
  const p = drawnPitch.value
  const h = scaledHeight.value
  const type = props.profile.profile_type || 'trapezoidal'
  const np2 = numPeriods.value
  const ew = profileWidth.value
  const topY = profileTopY.value
  const botY = profileBaseY.value
  const x0 = dimPad

  if (type === 'corrugated') {
    const segments = np2 * 20
    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      pts.push({ x: x0 + t * ew, y: botY - (h/2) - (h/2) * Math.cos(t * np2 * 2 * Math.PI) })
    }
  } else if (type === 'standing_seam') {
    const seamW = p * 0.08, flatW = p - seamW
    let x = x0
    pts.push({ x, y: botY })
    for (let i = 0; i < np2; i++) {
      x += flatW; pts.push({ x, y: botY }); pts.push({ x, y: topY })
      x += seamW; pts.push({ x, y: topY }); pts.push({ x, y: botY })
    }
  } else if (type === 'glazed_tile') {
    const stepW = p * 0.65, dropW = p * 0.35
    let x = x0
    for (let i = 0; i < np2; i++) {
      for (let j = 0; j <= 8; j++) {
        const t = j / 8
        pts.push({ x: x + t * stepW, y: botY - Math.sin(t * Math.PI) * h * 0.4 })
      }
      x += stepW; pts.push({ x, y: botY }); x += dropW
      if (i < np2 - 1) pts.push({ x, y: botY })
    }
  } else {
    const crestW = p * 0.30, slopeW = p * 0.10, troughW = p - crestW - 2 * slopeW
    let x = x0
    pts.push({ x, y: botY })
    for (let i = 0; i < np2; i++) {
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

// ══════════════════════════════════════════════
//  Helpers
// ══════════════════════════════════════════════
const arrowRight = (x, y) => `${x},${y} ${x-5},${y-2.5} ${x-5},${y+2.5}`
const arrowLeft = (x, y) => `${x},${y} ${x+5},${y-2.5} ${x+5},${y+2.5}`
const arrowUp = (x, y) => `${x},${y} ${x-2.5},${y+5} ${x+2.5},${y+5}`
const arrowDown = (x, y) => `${x},${y} ${x-2.5},${y-5} ${x+2.5},${y-5}`

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
  hex = (hex || '#888888').replace('#', '')
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('')
  return [parseInt(hex.substring(0, 2), 16) || 0, parseInt(hex.substring(2, 4), 16) || 0, parseInt(hex.substring(4, 6), 16) || 0]
}
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('')
}
</script>

<style scoped>
.roofing-profile-widget {
  display: flex;
  flex-direction: column;
  width: 100%;
}
.profile-svg {
  width: 100%;
  height: auto;
  display: block;
}
.dim-value {
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  font-size: 11px;
  font-weight: 700;
  fill: #1e3a5f;
}
.dim-label {
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  font-size: 8px;
  font-weight: 500;
  fill: #64748b;
  letter-spacing: 0.3px;
}
</style>
