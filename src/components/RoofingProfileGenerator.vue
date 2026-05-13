<template>
  <div class="profile-3d-container" :style="{ width: width || '100%', height: height || '100%' }">
    <svg :viewBox="svgViewBox" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%;">
      <defs>
        <!-- Real texture patterns -->
        <pattern id="pat-gi" patternUnits="userSpaceOnUse" width="300" height="300">
          <image href="/textures/gi-spangle.png" width="300" height="300" preserveAspectRatio="xMidYMid slice"/>
        </pattern>
        <pattern id="pat-gl" patternUnits="userSpaceOnUse" width="300" height="300">
          <image href="/textures/gl-galvalume.png" width="300" height="300" preserveAspectRatio="xMidYMid slice"/>
        </pattern>

        <!-- Darkening overlay for shaded faces -->
        <filter id="darken-light">
          <feComponentTransfer>
            <feFuncR type="linear" slope="0.88" /><feFuncG type="linear" slope="0.88" /><feFuncB type="linear" slope="0.88" />
          </feComponentTransfer>
        </filter>
        <filter id="darken-mid">
          <feComponentTransfer>
            <feFuncR type="linear" slope="0.72" /><feFuncG type="linear" slope="0.72" /><feFuncB type="linear" slope="0.72" />
          </feComponentTransfer>
        </filter>
        <filter id="darken-heavy">
          <feComponentTransfer>
            <feFuncR type="linear" slope="0.55" /><feFuncG type="linear" slope="0.55" /><feFuncB type="linear" slope="0.55" />
          </feComponentTransfer>
        </filter>
      </defs>

      <!-- ── 3D ISOMETRIC VIEW ─────────────────────────────── -->
      <!-- Depth (back wall) polygons -->
      <g :filter="'url(#darken-heavy)'">
        <polygon v-for="(p,i) in depthPolys" :key="'d'+i"
          :points="p.pts" :fill="texFill" stroke="rgba(0,0,0,0.12)" stroke-width="0.5" stroke-linejoin="round"/>
      </g>

      <!-- Top surface – separate groups by face type for shading -->
      <!-- Bright faces (crest/top) – no darkening -->
      <g>
        <polygon v-for="(p,i) in topBright" :key="'tb'+i"
          :points="p.pts" :fill="texFill" stroke="rgba(0,0,0,0.04)" stroke-width="0.3" stroke-linejoin="round"/>
      </g>
      <!-- Left slope faces – slight darkening -->
      <g :filter="'url(#darken-light)'">
        <polygon v-for="(p,i) in topLeft" :key="'tl'+i"
          :points="p.pts" :fill="texFill" stroke="rgba(0,0,0,0.04)" stroke-width="0.3" stroke-linejoin="round"/>
      </g>
      <!-- Right slope faces – medium darkening -->
      <g :filter="'url(#darken-mid)'">
        <polygon v-for="(p,i) in topRight" :key="'tr'+i"
          :points="p.pts" :fill="texFill" stroke="rgba(0,0,0,0.04)" stroke-width="0.3" stroke-linejoin="round"/>
      </g>
      <!-- Trough faces – noticeable darkening -->
      <g :filter="'url(#darken-mid)'">
        <polygon v-for="(p,i) in topTrough" :key="'tt'+i"
          :points="p.pts" :fill="texFill" stroke="rgba(0,0,0,0.04)" stroke-width="0.3" stroke-linejoin="round"/>
      </g>

      <!-- Front cut face -->
      <g :filter="'url(#darken-heavy)'">
        <polygon :points="frontFace" :fill="texFill" stroke="rgba(0,0,0,0.15)" stroke-width="0.8"/>
      </g>

      <!-- Profile outline -->
      <polyline :points="frontEdge" fill="none" stroke="#1a252f" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      <!-- Back edge outline -->
      <polyline :points="backEdgePath" fill="none" stroke="rgba(40,55,65,0.5)" stroke-width="1" stroke-linejoin="round"/>

      <!-- ── 2D DIMENSIONS ──────────────────────────────────── -->
      <g v-if="showDimensions" :transform="`translate(0,${dimOffsetY})`">
        <text :x="sX" :y="bY-sH-100" fill="#0f172a" font-size="30" font-weight="700" letter-spacing="1" font-family="Arial,sans-serif">PROFILE &amp; DIMENSIONS</text>
        <line :x1="sX" :y1="bY-sH-84" :x2="sX+sW" :y2="bY-sH-84" stroke="#e2e8f0" stroke-width="2"/>
        <polyline :points="frontEdge" fill="none" stroke="#1e293b" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>

        <!-- Rib Height -->
        <line :x1="sX+sW+35" :y1="bY" :x2="sX+sW+35" :y2="bY-sH" stroke="#64748b" stroke-width="1.5"/>
        <line :x1="sX+sW+15" :y1="bY" :x2="sX+sW+50" :y2="bY" stroke="#94a3b8"/>
        <line :x1="sX+sW+15" :y1="bY-sH" :x2="sX+sW+50" :y2="bY-sH" stroke="#94a3b8"/>
        <polygon :points="`${sX+sW+30},${bY-10} ${sX+sW+40},${bY-10} ${sX+sW+35},${bY}`" fill="#64748b"/>
        <polygon :points="`${sX+sW+30},${bY-sH+10} ${sX+sW+40},${bY-sH+10} ${sX+sW+35},${bY-sH}`" fill="#64748b"/>
        <text :x="sX+sW+58" :y="bY-sH/2+8" fill="#334155" font-size="24" font-weight="600" font-family="Arial,sans-serif">{{ profile.rib_height }}mm</text>

        <!-- Pitch -->
        <g v-if="profile.pitch">
          <line :x1="sX" :y1="bY-sH-42" :x2="sX+sPitch" :y2="bY-sH-42" stroke="#64748b" stroke-width="1.5"/>
          <line :x1="sX" :y1="bY-sH-16" :x2="sX" :y2="bY-sH-52" stroke="#94a3b8"/>
          <line :x1="sX+sPitch" :y1="bY-sH-16" :x2="sX+sPitch" :y2="bY-sH-52" stroke="#94a3b8"/>
          <polygon :points="`${sX+10},${bY-sH-47} ${sX+10},${bY-sH-37} ${sX},${bY-sH-42}`" fill="#64748b"/>
          <polygon :points="`${sX+sPitch-10},${bY-sH-47} ${sX+sPitch-10},${bY-sH-37} ${sX+sPitch},${bY-sH-42}`" fill="#64748b"/>
          <text :x="sX+sPitch/2" :y="bY-sH-58" text-anchor="middle" fill="#334155" font-size="24" font-weight="600" font-family="Arial,sans-serif">{{ profile.pitch }}mm</text>
        </g>

        <!-- Effective Coverage -->
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

const PERIODS = 4
const sX      = 110
const bY      = 310
const DX      = 180
const DY      = -70
const FRONT_H = 26

const sPitch = computed(() => Math.min(200, Math.max(88, 700 / PERIODS)))
const sH = computed(() => {
  const h = Number(props.profile.rib_height) || 30
  const p = Number(props.profile.pitch) || 200
  return Math.max(22, (h / p) * sPitch.value * 1.3)
})
const sW = computed(() => sPitch.value * PERIODS)

const surf = computed(() =>
  (props.profile.current_surface || props.profile.surface || 'ppgi').toLowerCase()
)

// Texture fill: real image for GI/GL, solid colour for PPGI
const texFill = computed(() => {
  if (surf.value === 'gi') return 'url(#pat-gi)'
  if (surf.value === 'gl') return 'url(#pat-gl)'
  return props.profile.current_color || props.profile.color || '#2e6db4'
})

// ── Build profile points ──────────────────────────────────────────────────
const pts = computed(() => {
  const out = [], p = sPitch.value, h = sH.value
  const type = props.profile.profile_type || 'trapezoidal'

  if (type === 'corrugated') {
    const segs = 20
    for (let i = 0; i <= PERIODS * segs; i++) {
      const t = i / segs, x = sX + t * p
      const y = bY - h/2 + Math.cos(t * Math.PI * 2) * (h/2)
      const m = t % 1
      const face = m < 0.08 || m > 0.92 ? 'top' : m < 0.42 ? 'right' : m < 0.58 ? 'trough' : 'left'
      out.push({ x, y, face })
    }
  } else if (type === 'standing_seam') {
    const flatW = p * 0.78, seamW = p * 0.22
    let x = sX
    out.push({ x, y: bY, face: 'trough' })
    for (let i = 0; i < PERIODS; i++) {
      x += flatW; out.push({ x, y: bY, face: 'left' })
      out.push({ x, y: bY - h, face: 'top' })
      x += seamW; out.push({ x, y: bY - h, face: 'right' })
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
      x += stepW; out.push({ x, y: bY, face: 'right' }); x += dropW
    }
  } else {
    const tW = p * 0.44, slW = p * 0.14, cW = p * 0.28
    let x = sX
    out.push({ x, y: bY, face: 'trough' })
    for (let i = 0; i < PERIODS; i++) {
      x += tW;  out.push({ x, y: bY,     face: 'left' })
      x += slW; out.push({ x, y: bY - h, face: 'top' })
      x += cW;  out.push({ x, y: bY - h, face: 'right' })
      x += slW; out.push({ x, y: bY,     face: 'trough' })
    }
  }
  return out
})

function back(pt) { return { x: pt.x + DX, y: pt.y + DY } }

function makeQuad(f1, f2) {
  const b1 = back(f1), b2 = back(f2)
  return `${f1.x},${f1.y} ${f2.x},${f2.y} ${b2.x},${b2.y} ${b1.x},${b1.y}`
}

// Split top polys by face type for grouped filter application
const topBright = computed(() => {
  const arr = pts.value
  return arr.slice(0,-1).filter((_,i) => arr[i].face === 'top').map((f1,_,__) => {
    const idx = pts.value.indexOf(f1)
    return { pts: makeQuad(f1, pts.value[idx+1]) }
  })
})
const topLeft = computed(() => {
  const arr = pts.value
  return arr.slice(0,-1).filter((_,i) => arr[i].face === 'left').map((f1) => {
    const idx = pts.value.indexOf(f1)
    return { pts: makeQuad(f1, pts.value[idx+1]) }
  })
})
const topRight = computed(() => {
  const arr = pts.value
  return arr.slice(0,-1).filter((_,i) => arr[i].face === 'right').map((f1) => {
    const idx = pts.value.indexOf(f1)
    return { pts: makeQuad(f1, pts.value[idx+1]) }
  })
})
const topTrough = computed(() => {
  const arr = pts.value
  return arr.slice(0,-1).filter((_,i) => arr[i].face === 'trough').map((f1) => {
    const idx = pts.value.indexOf(f1)
    return { pts: makeQuad(f1, pts.value[idx+1]) }
  })
})

const depthPolys = computed(() => {
  const arr = pts.value, polys = []
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i].face === 'trough' && Math.abs(arr[i].y - arr[i+1].y) < 2) {
      polys.push({ pts: `${arr[i].x},${arr[i].y} ${back(arr[i]).x},${back(arr[i]).y} ${back(arr[i+1]).x},${back(arr[i+1]).y} ${arr[i+1].x},${arr[i+1].y}` })
    }
  }
  return polys
})

const frontFace = computed(() => {
  const arr = pts.value
  if (!arr.length) return ''
  const f = arr[0], l = arr[arr.length-1]
  return `${f.x},${f.y} ${l.x},${l.y} ${l.x},${l.y+FRONT_H} ${f.x},${f.y+FRONT_H}`
})

const frontEdge = computed(() => pts.value.map(p => `${p.x},${p.y}`).join(' '))
const backEdgePath = computed(() => pts.value.map(p => { const b = back(p); return `${b.x},${b.y}` }).join(' '))

const dimOffsetY = computed(() => sH.value + Math.abs(DY) + 90)

const svgViewBox = computed(() => {
  const minX = 0, minY = bY - sH.value + DY - 60
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
