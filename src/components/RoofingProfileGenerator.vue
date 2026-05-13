<template>
  <div class="profile-3d-container" :style="{ width: width || '100%', height: height || '100%' }">
    <svg :viewBox="svgViewBox" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%;">
      <defs>
        <!-- GI: Large crystalline zinc spangle via discrete table -->
        <filter id="gi-spangle" x="-2%" y="-2%" width="104%" height="104%" color-interpolation-filters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.022 0.016" numOctaves="2" seed="8" result="noise"/>
          <feColorMatrix type="saturate" values="0" in="noise" result="gray"/>
          <feComponentTransfer in="gray" result="spangle">
            <feFuncR type="discrete" tableValues="0.60 0.72 0.82 0.90 0.96 1.0 0.94 0.88"/>
            <feFuncG type="discrete" tableValues="0.60 0.72 0.82 0.90 0.96 1.0 0.94 0.88"/>
            <feFuncB type="discrete" tableValues="0.60 0.72 0.82 0.90 0.96 1.0 0.94 0.88"/>
          </feComponentTransfer>
          <feBlend mode="multiply" in="spangle" in2="SourceGraphic"/>
        </filter>

        <!-- GL: Fine uniform metallic grain -->
        <filter id="gl-grain" x="-2%" y="-2%" width="104%" height="104%" color-interpolation-filters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.09 0.07" numOctaves="4" seed="5" result="noise"/>
          <feColorMatrix type="saturate" values="0" in="noise" result="gray"/>
          <feComponentTransfer in="gray" result="grain">
            <feFuncR type="linear" slope="0.28" intercept="0.72"/>
            <feFuncG type="linear" slope="0.28" intercept="0.72"/>
            <feFuncB type="linear" slope="0.28" intercept="0.72"/>
          </feComponentTransfer>
          <feBlend mode="multiply" in="grain" in2="SourceGraphic"/>
        </filter>

        <!-- GI face gradients -->
        <linearGradient id="gi-crest" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="#dce8ee"/>
          <stop offset="40%"  stop-color="#f0f5f8"/>
          <stop offset="100%" stop-color="#c8d8e2"/>
        </linearGradient>
        <linearGradient id="gi-lslope" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#d0dfe8"/>
          <stop offset="100%" stop-color="#b8cdd8"/>
        </linearGradient>
        <linearGradient id="gi-rslope" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#b0c4ce"/>
          <stop offset="100%" stop-color="#96adb9"/>
        </linearGradient>
        <linearGradient id="gi-trough" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#a4bac6"/>
          <stop offset="100%" stop-color="#8aa2af"/>
        </linearGradient>
        <linearGradient id="gi-depth" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#8898a4"/>
          <stop offset="100%" stop-color="#6c7e88"/>
        </linearGradient>

        <!-- GL face gradients (slightly warmer, more uniform) -->
        <linearGradient id="gl-crest" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stop-color="#d6e2e8"/>
          <stop offset="45%"  stop-color="#edf2f5"/>
          <stop offset="100%" stop-color="#c4d4dc"/>
        </linearGradient>
        <linearGradient id="gl-lslope" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#ccdae2"/>
          <stop offset="100%" stop-color="#b4c8d2"/>
        </linearGradient>
        <linearGradient id="gl-rslope" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#aec0ca"/>
          <stop offset="100%" stop-color="#94aab6"/>
        </linearGradient>
        <linearGradient id="gl-trough" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#a0b6c2"/>
          <stop offset="100%" stop-color="#86a0ae"/>
        </linearGradient>
        <linearGradient id="gl-depth" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stop-color="#84969f"/>
          <stop offset="100%" stop-color="#6a7e87"/>
        </linearGradient>
      </defs>

      <!-- ── 3D ISOMETRIC VIEW ─────────────────────────────── -->
      <!-- Depth (back wall) polygons – rendered first (behind) -->
      <polygon v-for="(p,i) in depthPolys" :key="'dp'+i"
        :points="p.pts" :fill="p.fill" stroke="rgba(0,0,0,0.15)" stroke-width="0.5" stroke-linejoin="round"/>

      <!-- Top surface – with metallic texture filter -->
      <g :filter="texFilter">
        <polygon v-for="(p,i) in topPolys" :key="'tp'+i"
          :points="p.pts" :fill="p.fill" stroke="rgba(0,0,0,0.06)" stroke-width="0.5" stroke-linejoin="round"/>
      </g>

      <!-- Front cut face -->
      <polygon :points="frontFace" :fill="frontFaceFill" stroke="rgba(0,0,0,0.18)" stroke-width="1"/>

      <!-- Profile outline (crisp black edge) -->
      <polyline :points="frontEdge" fill="none" stroke="#1a252f" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>

      <!-- ── 2D DIMENSIONS (below 3D view) ──────────────────── -->
      <g v-if="showDimensions" :transform="`translate(0,${dimOffsetY})`">
        <!-- Title bar -->
        <text :x="sX" :y="bY - sH - 105" fill="#0f172a" font-size="30" font-weight="700"
          letter-spacing="1" font-family="Arial,sans-serif">PROFILE &amp; DIMENSIONS</text>
        <line :x1="sX" :y1="bY - sH - 88" :x2="sX + sW" :y2="bY - sH - 88"
          stroke="#e2e8f0" stroke-width="2"/>

        <!-- 2D profile line -->
        <polyline :points="frontEdge" fill="none" stroke="#0f172a"
          stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>

        <!-- Rib Height (right side) -->
        <line :x1="sX + sW + 35" :y1="bY" :x2="sX + sW + 35" :y2="bY - sH"
          stroke="#64748b" stroke-width="1.5"/>
        <line :x1="sX + sW + 15" :y1="bY" :x2="sX + sW + 50" :y2="bY" stroke="#94a3b8" stroke-width="1"/>
        <line :x1="sX + sW + 15" :y1="bY - sH" :x2="sX + sW + 50" :y2="bY - sH" stroke="#94a3b8" stroke-width="1"/>
        <polygon :points="`${sX+sW+30},${bY-12} ${sX+sW+40},${bY-12} ${sX+sW+35},${bY}`" fill="#64748b"/>
        <polygon :points="`${sX+sW+30},${bY-sH+12} ${sX+sW+40},${bY-sH+12} ${sX+sW+35},${bY-sH}`" fill="#64748b"/>
        <text :x="sX + sW + 58" :y="bY - sH/2 + 9" fill="#334155"
          font-size="24" font-weight="600" font-family="Arial,sans-serif">{{ profile.rib_height }}mm</text>

        <!-- Pitch (above, one period) -->
        <g v-if="profile.pitch">
          <line :x1="sX" :y1="bY - sH - 45" :x2="sX + sPitch" :y2="bY - sH - 45" stroke="#64748b" stroke-width="1.5"/>
          <line :x1="sX" :y1="bY - sH - 18" :x2="sX" :y2="bY - sH - 54" stroke="#94a3b8" stroke-width="1"/>
          <line :x1="sX + sPitch" :y1="bY - sH - 18" :x2="sX + sPitch" :y2="bY - sH - 54" stroke="#94a3b8" stroke-width="1"/>
          <polygon :points="`${sX+12},${bY-sH-50} ${sX+12},${bY-sH-40} ${sX},${bY-sH-45}`" fill="#64748b"/>
          <polygon :points="`${sX+sPitch-12},${bY-sH-50} ${sX+sPitch-12},${bY-sH-40} ${sX+sPitch},${bY-sH-45}`" fill="#64748b"/>
          <text :x="sX + sPitch/2" :y="bY - sH - 60" text-anchor="middle" fill="#334155"
            font-size="24" font-weight="600" font-family="Arial,sans-serif">{{ profile.pitch }}mm</text>
        </g>

        <!-- Effective Coverage (bottom) -->
        <line :x1="sX" :y1="bY + 55" :x2="sX + sW" :y2="bY + 55" stroke="#1e3a5f" stroke-width="1.5"/>
        <line :x1="sX" :y1="bY + 8" :x2="sX" :y2="bY + 64" stroke="#94a3b8" stroke-width="1"/>
        <line :x1="sX + sW" :y1="bY + 8" :x2="sX + sW" :y2="bY + 64" stroke="#94a3b8" stroke-width="1"/>
        <polygon :points="`${sX+14},${bY+50} ${sX+14},${bY+60} ${sX},${bY+55}`" fill="#1e3a5f"/>
        <polygon :points="`${sX+sW-14},${bY+50} ${sX+sW-14},${bY+60} ${sX+sW},${bY+55}`" fill="#1e3a5f"/>
        <text :x="sX + sW/2" :y="bY + 90" text-anchor="middle" fill="#0f172a"
          font-size="28" font-weight="700" font-family="Arial,sans-serif">
          Effective Coverage {{ profile.effective_width }}mm
        </text>
        <text :x="sX + sW/2" :y="bY + 122" text-anchor="middle" fill="#64748b"
          font-size="22" font-family="Arial,sans-serif">
          Overall Width (Coil) {{ profile.coil_width }}mm
        </text>
      </g>
    </svg>
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

// ── Constants ─────────────────────────────────────────────────────────────
const PERIODS  = 4
const VIEW_W   = 1100
const sX       = 110   // 2D start X (same as 3D startX)
const bY       = 310   // 2D base Y  (same as 3D baseY)
const DX       = 190   // isometric depth offset X (goes right)
const DY       = -75   // isometric depth offset Y (goes up)
const FRONT_H  = 28    // visible front-face strip height

// ── Scaling ───────────────────────────────────────────────────────────────
const sPitch = computed(() => {
  const p = Number(props.profile.pitch) || 200
  return Math.min(210, Math.max(88, (VIEW_W - DX - 180) / PERIODS))
})

const sH = computed(() => {
  const h = Number(props.profile.rib_height) || 30
  const p = Number(props.profile.pitch) || 200
  return Math.max(22, (h / p) * sPitch.value * 1.35)
})

const sW = computed(() => sPitch.value * PERIODS)

// ── Surface ───────────────────────────────────────────────────────────────
const surf = computed(() =>
  (props.profile.current_surface || props.profile.surface || 'ppgi').toLowerCase()
)

const texFilter = computed(() => {
  if (surf.value === 'gi') return 'url(#gi-spangle)'
  if (surf.value === 'gl') return 'url(#gl-grain)'
  return ''
})

// ── Base colour ───────────────────────────────────────────────────────────
const baseHex = computed(() => {
  if (surf.value === 'gi') return '#dce8ee'
  if (surf.value === 'gl') return '#d6e2e8'
  const c = props.profile.current_color || props.profile.color || '#2e6db4'
  return (c && c.startsWith('#')) ? c : '#2e6db4'
})

// ── Colour shading ────────────────────────────────────────────────────────
function shade(hex, pct) {
  if (!hex || !hex.startsWith('#')) return '#888'
  const r = Math.min(255, Math.max(0, Math.round(parseInt(hex.slice(1,3),16) * (1+pct/100))))
  const g = Math.min(255, Math.max(0, Math.round(parseInt(hex.slice(3,5),16) * (1+pct/100))))
  const b = Math.min(255, Math.max(0, Math.round(parseInt(hex.slice(5,7),16) * (1+pct/100))))
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
}

// ── Per-face fill ─────────────────────────────────────────────────────────
function faceFill(face) {
  const s = surf.value
  if (s === 'gi' || s === 'gl') return `url(#${s}-${face})`
  // PPGI – shade the RAL colour
  const shades = { crest: 18, lslope: 5, rslope: -22, trough: -35, depth: -48 }
  return shade(baseHex.value, shades[face] ?? 0)
}

// ── Build profile points ──────────────────────────────────────────────────
const pts = computed(() => {
  const out  = []
  const p    = sPitch.value
  const h    = sH.value
  const type = props.profile.profile_type || 'trapezoidal'

  if (type === 'corrugated') {
    const segs = 20
    for (let i = 0; i <= PERIODS * segs; i++) {
      const t = i / segs
      const x = sX + t * p
      const y = bY - h/2 + Math.cos(t * Math.PI * 2) * (h/2)
      const m = t % 1
      const face = m < 0.08 || m > 0.92 ? 'crest'
                 : m < 0.42 ? 'rslope'
                 : m < 0.58 ? 'trough'
                 : 'lslope'
      out.push({ x, y, face })
    }
  } else if (type === 'standing_seam') {
    const flatW = p * 0.78, seamW = p * 0.22
    let x = sX
    out.push({ x, y: bY, face: 'trough' })
    for (let i = 0; i < PERIODS; i++) {
      x += flatW; out.push({ x, y: bY, face: 'lslope' })
      out.push({ x, y: bY - h, face: 'crest' })
      x += seamW; out.push({ x, y: bY - h, face: 'rslope' })
      out.push({ x, y: bY, face: 'trough' })
    }
  } else if (type === 'glazed_tile') {
    const stepW = p * 0.72, dropW = p * 0.28
    let x = sX
    for (let i = 0; i < PERIODS; i++) {
      for (let j = 0; j <= 8; j++) {
        const t = j/8
        out.push({ x: x + t*stepW, y: bY - Math.sin(t*Math.PI)*h*0.35, face: 'crest' })
      }
      x += stepW
      out.push({ x, y: bY, face: 'rslope' })
      x += dropW
    }
  } else {
    // trapezoidal / default
    const tW = p * 0.44, sW2 = p * 0.14, cW = p * 0.28
    let x = sX
    out.push({ x, y: bY, face: 'trough' })
    for (let i = 0; i < PERIODS; i++) {
      x += tW;  out.push({ x, y: bY,      face: 'lslope'  })
      x += sW2; out.push({ x, y: bY - h,  face: 'crest'   })
      x += cW;  out.push({ x, y: bY - h,  face: 'rslope'  })
      x += sW2; out.push({ x, y: bY,      face: 'trough'  })
    }
  }
  return out
})

// ── Isometric back-point ──────────────────────────────────────────────────
function back(pt) { return { x: pt.x + DX, y: pt.y + DY } }

// ── Top surface polygons ──────────────────────────────────────────────────
const topPolys = computed(() => {
  const polys = []
  const arr   = pts.value
  for (let i = 0; i < arr.length - 1; i++) {
    const f1 = arr[i], f2 = arr[i+1]
    const b1 = back(f1), b2 = back(f2)
    polys.push({
      pts:  `${f1.x},${f1.y} ${f2.x},${f2.y} ${b2.x},${b2.y} ${b1.x},${b1.y}`,
      fill: faceFill(f1.face)
    })
  }
  return polys
})

// ── Depth (visible back-wall) polygons ───────────────────────────────────
const depthPolys = computed(() => {
  const polys = []
  const arr   = pts.value
  // Render vertical depth strip only at trough base points (bottom of sheet)
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i].face === 'trough' && Math.abs(arr[i].y - arr[i+1].y) < 2) {
      const f1 = arr[i], f2 = arr[i+1]
      const b1 = back(f1), b2 = back(f2)
      polys.push({
        pts:  `${f1.x},${f1.y} ${b1.x},${b1.y} ${b2.x},${b2.y} ${f2.x},${f2.y}`,
        fill: faceFill('depth')
      })
    }
  }
  return polys
})

// ── Front face strip ──────────────────────────────────────────────────────
const frontFace = computed(() => {
  const arr  = pts.value
  if (!arr.length) return ''
  const x0 = arr[0].x, y0 = arr[0].y
  const xN = arr[arr.length-1].x, yN = arr[arr.length-1].y
  return `${x0},${y0} ${xN},${yN} ${xN},${yN + FRONT_H} ${x0},${y0 + FRONT_H}`
})
const frontFaceFill = computed(() => faceFill('depth'))

// ── Front edge polyline ───────────────────────────────────────────────────
const frontEdge = computed(() => pts.value.map(p => `${p.x},${p.y}`).join(' '))

// ── dim offset (2D section Y position) ───────────────────────────────────
const dimOffsetY = computed(() => sH.value + Math.abs(DY) + 90)

// ── SVG viewBox ───────────────────────────────────────────────────────────
const svgViewBox = computed(() => {
  const minX = 0
  const minY = bY - sH.value + DY - 70
  const maxX = sX + sW.value + DX + 120
  const maxY = props.showDimensions
    ? bY + dimOffsetY.value + 150
    : bY + FRONT_H + 20
  return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`
})
</script>

<style scoped>
.profile-3d-container {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: transparent;
}
</style>
