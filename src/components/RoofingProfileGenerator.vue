<template>
  <div class="profile-3d-container" :style="{ width: width || '100%', height: height || '100%' }">
    <svg :viewBox="svgViewBox" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%;">

      <!-- ── 3D ISOMETRIC VIEW ─────────────────────────────── -->
      <!-- Back-depth polygons (behind everything) -->
      <polygon v-for="(p,i) in depthPolys" :key="'d'+i"
        :points="p.pts" :fill="p.fill" :stroke="p.stroke" stroke-width="0.5" stroke-linejoin="round"/>

      <!-- Top surface polygons -->
      <polygon v-for="(p,i) in topPolys" :key="'t'+i"
        :points="p.pts" :fill="p.fill" :stroke="p.stroke" stroke-width="0.5" stroke-linejoin="round"/>

      <!-- Front cut face (thin strip at the bottom) -->
      <polygon :points="frontFace" :fill="faceColors.front" :stroke="faceColors.edge" stroke-width="0.8"/>

      <!-- Profile outline (clean dark edge) -->
      <polyline :points="frontEdge" fill="none" :stroke="faceColors.edge" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>

      <!-- Back edge outline -->
      <polyline :points="backEdge" fill="none" :stroke="faceColors.edgeLight" stroke-width="1" stroke-linejoin="round"/>

      <!-- ── 2D DIMENSIONS (below 3D view) ──────────────────── -->
      <g v-if="showDimensions" :transform="`translate(0,${dimOffsetY})`">
        <text :x="sX" :y="bY - sH - 100" fill="#0f172a" font-size="30" font-weight="700"
          letter-spacing="1" font-family="Arial,sans-serif">PROFILE &amp; DIMENSIONS</text>
        <line :x1="sX" :y1="bY - sH - 84" :x2="sX + sW" :y2="bY - sH - 84" stroke="#e2e8f0" stroke-width="2"/>

        <!-- 2D profile line -->
        <polyline :points="frontEdge" fill="none" stroke="#1e293b"
          stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>

        <!-- Rib Height (right side) -->
        <line :x1="sX+sW+35" :y1="bY" :x2="sX+sW+35" :y2="bY-sH" stroke="#64748b" stroke-width="1.5"/>
        <line :x1="sX+sW+15" :y1="bY" :x2="sX+sW+50" :y2="bY" stroke="#94a3b8"/>
        <line :x1="sX+sW+15" :y1="bY-sH" :x2="sX+sW+50" :y2="bY-sH" stroke="#94a3b8"/>
        <polygon :points="`${sX+sW+30},${bY-10} ${sX+sW+40},${bY-10} ${sX+sW+35},${bY}`" fill="#64748b"/>
        <polygon :points="`${sX+sW+30},${bY-sH+10} ${sX+sW+40},${bY-sH+10} ${sX+sW+35},${bY-sH}`" fill="#64748b"/>
        <text :x="sX+sW+58" :y="bY-sH/2+8" fill="#334155" font-size="24" font-weight="600" font-family="Arial,sans-serif">{{ profile.rib_height }}mm</text>

        <!-- Pitch (top) -->
        <g v-if="profile.pitch">
          <line :x1="sX" :y1="bY-sH-42" :x2="sX+sPitch" :y2="bY-sH-42" stroke="#64748b" stroke-width="1.5"/>
          <line :x1="sX" :y1="bY-sH-16" :x2="sX" :y2="bY-sH-52" stroke="#94a3b8"/>
          <line :x1="sX+sPitch" :y1="bY-sH-16" :x2="sX+sPitch" :y2="bY-sH-52" stroke="#94a3b8"/>
          <polygon :points="`${sX+10},${bY-sH-47} ${sX+10},${bY-sH-37} ${sX},${bY-sH-42}`" fill="#64748b"/>
          <polygon :points="`${sX+sPitch-10},${bY-sH-47} ${sX+sPitch-10},${bY-sH-37} ${sX+sPitch},${bY-sH-42}`" fill="#64748b"/>
          <text :x="sX+sPitch/2" :y="bY-sH-58" text-anchor="middle" fill="#334155" font-size="24" font-weight="600" font-family="Arial,sans-serif">{{ profile.pitch }}mm</text>
        </g>

        <!-- Effective Coverage (bottom) -->
        <line :x1="sX" :y1="bY+50" :x2="sX+sW" :y2="bY+50" stroke="#1e3a5f" stroke-width="1.5"/>
        <line :x1="sX" :y1="bY+8" :x2="sX" :y2="bY+58" stroke="#94a3b8"/>
        <line :x1="sX+sW" :y1="bY+8" :x2="sX+sW" :y2="bY+58" stroke="#94a3b8"/>
        <polygon :points="`${sX+12},${bY+45} ${sX+12},${bY+55} ${sX},${bY+50}`" fill="#1e3a5f"/>
        <polygon :points="`${sX+sW-12},${bY+45} ${sX+sW-12},${bY+55} ${sX+sW},${bY+50}`" fill="#1e3a5f"/>
        <text :x="sX+sW/2" :y="bY+82" text-anchor="middle" fill="#0f172a" font-size="28" font-weight="700" font-family="Arial,sans-serif">Effective Coverage {{ profile.effective_width }}mm</text>
        <text :x="sX+sW/2" :y="bY+112" text-anchor="middle" fill="#64748b" font-size="22" font-family="Arial,sans-serif">Overall Width (Coil) {{ profile.coil_width }}mm</text>
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

// ── Layout ────────────────────────────────────────────────────────────────
const PERIODS = 4
const sX      = 110
const bY      = 310
const DX      = 180    // depth offset X
const DY      = -70    // depth offset Y
const FRONT_H = 26

// ── Scaling ───────────────────────────────────────────────────────────────
const sPitch = computed(() => Math.min(200, Math.max(88, 700 / PERIODS)))
const sH = computed(() => {
  const h = Number(props.profile.rib_height) || 30
  const p = Number(props.profile.pitch) || 200
  return Math.max(22, (h / p) * sPitch.value * 1.3)
})
const sW = computed(() => sPitch.value * PERIODS)

// ── Surface + Color ──────────────────────────────────────────────────────
const surf = computed(() =>
  (props.profile.current_surface || props.profile.surface || 'ppgi').toLowerCase()
)

const baseHex = computed(() => {
  if (surf.value === 'gi') return '#c8d4dc'
  if (surf.value === 'gl') return '#b8c8d0'
  const c = props.profile.current_color || props.profile.color || '#2e6db4'
  return (c && c.startsWith('#')) ? c : '#2e6db4'
})

// Simple shade function
function shade(hex, pct) {
  if (!hex || !hex.startsWith('#') || hex.length < 7) return '#888888'
  const r = Math.min(255, Math.max(0, Math.round(parseInt(hex.slice(1,3),16) * (1+pct/100))))
  const g = Math.min(255, Math.max(0, Math.round(parseInt(hex.slice(3,5),16) * (1+pct/100))))
  const b = Math.min(255, Math.max(0, Math.round(parseInt(hex.slice(5,7),16) * (1+pct/100))))
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
}

// ── Face colors: simple flat fills, no gradients, no filters ─────────────
const faceColors = computed(() => {
  const base = baseHex.value
  const s = surf.value
  if (s === 'gi') {
    return {
      top:       '#e4ecf0',
      leftSlope: '#d6e0e6',
      rightSlope:'#b0bfc8',
      trough:    '#c8d4dc',
      front:     '#8a9caa',
      edge:      '#4a5c68',
      edgeLight: '#a0b0b8',
      stroke:    '#c0ccd4'
    }
  }
  if (s === 'gl') {
    return {
      top:       '#dce6ec',
      leftSlope: '#ccd8e0',
      rightSlope:'#a8bac4',
      trough:    '#bccad2',
      front:     '#7e929e',
      edge:      '#3e5060',
      edgeLight: '#98aab4',
      stroke:    '#b4c2ca'
    }
  }
  // PPGI/PPGL
  return {
    top:       shade(base, 15),
    leftSlope: shade(base, 5),
    rightSlope:shade(base, -18),
    trough:    base,
    front:     shade(base, -40),
    edge:      shade(base, -55),
    edgeLight: shade(base, -20),
    stroke:    shade(base, -8)
  }
})

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
      const face = m < 0.08 || m > 0.92 ? 'top' : m < 0.42 ? 'rightSlope' : m < 0.58 ? 'trough' : 'leftSlope'
      out.push({ x, y, face })
    }
  } else if (type === 'standing_seam') {
    const flatW = p * 0.78, seamW = p * 0.22
    let x = sX
    out.push({ x, y: bY, face: 'trough' })
    for (let i = 0; i < PERIODS; i++) {
      x += flatW; out.push({ x, y: bY, face: 'leftSlope' })
      out.push({ x, y: bY - h, face: 'top' })
      x += seamW; out.push({ x, y: bY - h, face: 'rightSlope' })
      out.push({ x, y: bY, face: 'trough' })
    }
  } else if (type === 'glazed_tile') {
    const stepW = p * 0.72, dropW = p * 0.28
    let x = sX
    for (let i = 0; i < PERIODS; i++) {
      for (let j = 0; j <= 8; j++) {
        const t = j/8
        out.push({ x: x + t*stepW, y: bY - Math.sin(t*Math.PI)*h*0.35, face: 'top' })
      }
      x += stepW; out.push({ x, y: bY, face: 'rightSlope' }); x += dropW
    }
  } else {
    const tW = p * 0.44, slW = p * 0.14, cW = p * 0.28
    let x = sX
    out.push({ x, y: bY, face: 'trough' })
    for (let i = 0; i < PERIODS; i++) {
      x += tW;  out.push({ x, y: bY,     face: 'leftSlope' })
      x += slW; out.push({ x, y: bY - h, face: 'top' })
      x += cW;  out.push({ x, y: bY - h, face: 'rightSlope' })
      x += slW; out.push({ x, y: bY,     face: 'trough' })
    }
  }
  return out
})

function back(pt) { return { x: pt.x + DX, y: pt.y + DY } }

// ── Top surface polygons (flat solid color per face) ──────────────────────
const topPolys = computed(() => {
  const arr = pts.value
  const c   = faceColors.value
  return arr.slice(0, -1).map((f1, i) => {
    const f2 = arr[i+1], b1 = back(f1), b2 = back(f2)
    return {
      pts:    `${f1.x},${f1.y} ${f2.x},${f2.y} ${b2.x},${b2.y} ${b1.x},${b1.y}`,
      fill:   c[f1.face] || c.top,
      stroke: c.stroke
    }
  })
})

// ── Depth polygons (back wall at trough level) ──────────────────────────
const depthPolys = computed(() => {
  const arr = pts.value
  const c   = faceColors.value
  const polys = []
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i].face === 'trough' && Math.abs(arr[i].y - arr[i+1].y) < 2) {
      const f1 = arr[i], f2 = arr[i+1], b1 = back(f1), b2 = back(f2)
      polys.push({
        pts:    `${f1.x},${f1.y} ${b1.x},${b1.y} ${b2.x},${b2.y} ${f2.x},${f2.y}`,
        fill:   c.trough,
        stroke: c.stroke
      })
    }
  }
  return polys
})

// ── Front face strip ──────────────────────────────────────────────────────
const frontFace = computed(() => {
  const arr = pts.value
  if (!arr.length) return ''
  const first = arr[0], last = arr[arr.length-1]
  return `${first.x},${first.y} ${last.x},${last.y} ${last.x},${last.y+FRONT_H} ${first.x},${first.y+FRONT_H}`
})

// ── Edge polylines ────────────────────────────────────────────────────────
const frontEdge = computed(() => pts.value.map(p => `${p.x},${p.y}`).join(' '))
const backEdge  = computed(() => pts.value.map(p => { const b = back(p); return `${b.x},${b.y}` }).join(' '))

// ── Dimension section offset ──────────────────────────────────────────────
const dimOffsetY = computed(() => sH.value + Math.abs(DY) + 90)

// ── ViewBox ──────────────────────────────────────────────────────────────
const svgViewBox = computed(() => {
  const minX = 0
  const minY = bY - sH.value + DY - 60
  const maxX = sX + sW.value + DX + 120
  const maxY = props.showDimensions ? bY + dimOffsetY.value + 140 : bY + FRONT_H + 20
  return `${minX} ${minY} ${maxX-minX} ${maxY-minY}`
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
