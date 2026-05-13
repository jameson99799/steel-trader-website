<template>
  <div class="profile-3d-container" :style="{ width: width || '100%', height: height || '100%' }">
    <svg :viewBox="dynamicViewBox" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%;">
      <defs>
        <!-- GI: Large crystalline zinc spangle - uses turbulence to simulate irregular crystals -->
        <filter id="gi-spangle" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.035 0.028" numOctaves="3" seed="2" result="noise"/>
          <feColorMatrix type="saturate" values="0" in="noise" result="grayNoise"/>
          <feComponentTransfer in="grayNoise" result="boosted">
            <feFuncR type="linear" slope="2.2" intercept="-0.35"/>
            <feFuncG type="linear" slope="2.2" intercept="-0.35"/>
            <feFuncB type="linear" slope="2.2" intercept="-0.35"/>
          </feComponentTransfer>
          <feBlend mode="soft-light" in="boosted" in2="SourceGraphic" result="blended"/>
          <feComposite in="blended" in2="SourceGraphic" operator="in"/>
        </filter>
        <!-- GL: Fine uniform galvalume grain -->
        <filter id="gl-grain" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.12 0.08" numOctaves="4" seed="5" result="noise"/>
          <feColorMatrix type="saturate" values="0" in="noise" result="grayNoise"/>
          <feComponentTransfer in="grayNoise" result="boosted">
            <feFuncR type="linear" slope="1.4" intercept="-0.15"/>
            <feFuncG type="linear" slope="1.4" intercept="-0.15"/>
            <feFuncB type="linear" slope="1.4" intercept="-0.15"/>
          </feComponentTransfer>
          <feBlend mode="soft-light" in="boosted" in2="SourceGraphic" result="blended"/>
          <feComposite in="blended" in2="SourceGraphic" operator="in"/>
        </filter>

        <!-- GI color gradients per face direction -->
        <linearGradient id="gi-top" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#d8dfe4"/>
          <stop offset="30%" stop-color="#eef1f3"/>
          <stop offset="60%" stop-color="#c8d2d8"/>
          <stop offset="100%" stop-color="#b8c5cc"/>
        </linearGradient>
        <linearGradient id="gi-right-slope" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#bbc8d0"/>
          <stop offset="100%" stop-color="#9dadb8"/>
        </linearGradient>
        <linearGradient id="gi-left-slope" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#e8edf0"/>
          <stop offset="100%" stop-color="#cdd7dc"/>
        </linearGradient>
        <linearGradient id="gi-trough" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#a8b8c2"/>
          <stop offset="100%" stop-color="#8fa3af"/>
        </linearGradient>
        <linearGradient id="gi-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#90a5b2"/>
          <stop offset="100%" stop-color="#6e8897"/>
        </linearGradient>

        <!-- GL color gradients (slightly warmer silver) -->
        <linearGradient id="gl-top" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#cdd5d9"/>
          <stop offset="35%" stop-color="#e6ebed"/>
          <stop offset="65%" stop-color="#c2cdd2"/>
          <stop offset="100%" stop-color="#b5c3c9"/>
        </linearGradient>
        <linearGradient id="gl-right-slope" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#b5c4cb"/>
          <stop offset="100%" stop-color="#96aab4"/>
        </linearGradient>
        <linearGradient id="gl-left-slope" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#dde4e8"/>
          <stop offset="100%" stop-color="#c2cdd4"/>
        </linearGradient>
        <linearGradient id="gl-trough" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#a3b4bc"/>
          <stop offset="100%" stop-color="#8799a3"/>
        </linearGradient>
        <linearGradient id="gl-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#8a9da7"/>
          <stop offset="100%" stop-color="#6a8290"/>
        </linearGradient>

        <!-- PPGI gradients (per-face, color-tinted) -->
        <linearGradient :id="`ppgi-top-${profile.id || 0}`" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" :stop-color="shadeColor(baseColor, -5)"/>
          <stop offset="40%" :stop-color="shadeColor(baseColor, 25)"/>
          <stop offset="100%" :stop-color="shadeColor(baseColor, -15)"/>
        </linearGradient>
        <linearGradient :id="`ppgi-left-${profile.id || 0}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="shadeColor(baseColor, 15)"/>
          <stop offset="100%" :stop-color="shadeColor(baseColor, -5)"/>
        </linearGradient>
        <linearGradient :id="`ppgi-right-${profile.id || 0}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="shadeColor(baseColor, -15)"/>
          <stop offset="100%" :stop-color="shadeColor(baseColor, -35)"/>
        </linearGradient>
        <linearGradient :id="`ppgi-trough-${profile.id || 0}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="shadeColor(baseColor, -20)"/>
          <stop offset="100%" :stop-color="shadeColor(baseColor, -40)"/>
        </linearGradient>
        <linearGradient :id="`ppgi-front-${profile.id || 0}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="shadeColor(baseColor, -30)"/>
          <stop offset="100%" :stop-color="shadeColor(baseColor, -55)"/>
        </linearGradient>

        <!-- Clip paths for texture filtering -->
        <clipPath :id="`clip-${profile.id || 0}`">
          <polygon :points="fullShapeClip"/>
        </clipPath>
      </defs>

      <!-- ===== 3D ISOMETRIC RENDERING (Top + Back face) ===== -->
      <!-- Back edge (depth) faces -->
      <g>
        <polygon v-for="(poly, i) in depthPolygons" :key="'d'+i"
          :points="poly.points" :fill="poly.fill" stroke="rgba(0,0,0,0.12)" stroke-width="0.5"/>
      </g>

      <!-- Top surface polygons -->
      <g :filter="textureFilter">
        <polygon v-for="(poly, i) in topPolygons" :key="'t'+i"
          :points="poly.points" :fill="poly.fill" stroke="rgba(0,0,0,0.08)" stroke-width="0.5"/>
      </g>

      <!-- Front face (the visible front edge panel) -->
      <polygon :points="frontFacePoints" :fill="frontFill" stroke="rgba(0,0,0,0.2)" stroke-width="1"/>

      <!-- Front profile outline -->
      <polyline :points="frontEdgePath" fill="none" stroke="#1a2530" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>

      <!-- ===== 2D DIMENSIONS SECTION ===== -->
      <g v-if="showDimensions" :transform="`translate(0, ${dim2DOffsetY})`">
        <!-- Title -->
        <text :x="dStartX + 20" :y="dBaseY - dH - 100" fill="#0f172a" font-size="34" font-weight="700" letter-spacing="2" font-family="Arial, sans-serif">PROFILE &amp; DIMENSIONS</text>
        <line :x1="dStartX + 20" :y1="dBaseY - dH - 80" :x2="dStartX + dWidth - 20" :y2="dBaseY - dH - 80" stroke="#e2e8f0" stroke-width="2"/>

        <!-- 2D Profile line only (clean black line) -->
        <polyline :points="dim2DPath" fill="none" stroke="#1e293b" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>

        <!-- Rib Height annotation (right side) -->
        <line :x1="dStartX + dWidth + 40" :y1="dBaseY" :x2="dStartX + dWidth + 40" :y2="dBaseY - dH" stroke="#64748b" stroke-width="1.5"/>
        <line :x1="dStartX + dWidth + 20" :y1="dBaseY" :x2="dStartX + dWidth + 55" :y2="dBaseY" stroke="#94a3b8" stroke-width="1"/>
        <line :x1="dStartX + dWidth + 20" :y1="dBaseY - dH" :x2="dStartX + dWidth + 55" :y2="dBaseY - dH" stroke="#94a3b8" stroke-width="1"/>
        <!-- Arrow tips -->
        <polygon :points="`${dStartX+dWidth+35},${dBaseY-12} ${dStartX+dWidth+45},${dBaseY-12} ${dStartX+dWidth+40},${dBaseY}`" fill="#64748b"/>
        <polygon :points="`${dStartX+dWidth+35},${dBaseY-dH+12} ${dStartX+dWidth+45},${dBaseY-dH+12} ${dStartX+dWidth+40},${dBaseY-dH}`" fill="#64748b"/>
        <text :x="dStartX + dWidth + 62" :y="dBaseY - dH/2 + 10" fill="#334155" font-size="26" font-weight="600" font-family="Arial,sans-serif">{{ profile.rib_height }}mm</text>

        <!-- Pitch annotation (top, one period) -->
        <g v-if="profile.pitch">
          <line :x1="dStartX" :y1="dBaseY - dH - 50" :x2="dStartX + dPitch" :y2="dBaseY - dH - 50" stroke="#64748b" stroke-width="1.5"/>
          <line :x1="dStartX" :y1="dBaseY - dH - 20" :x2="dStartX" :y2="dBaseY - dH - 60" stroke="#94a3b8" stroke-width="1"/>
          <line :x1="dStartX + dPitch" :y1="dBaseY - dH - 20" :x2="dStartX + dPitch" :y2="dBaseY - dH - 60" stroke="#94a3b8" stroke-width="1"/>
          <polygon :points="`${dStartX+12},${dBaseY-dH-55} ${dStartX+12},${dBaseY-dH-45} ${dStartX},${dBaseY-dH-50}`" fill="#64748b"/>
          <polygon :points="`${dStartX+dPitch-12},${dBaseY-dH-55} ${dStartX+dPitch-12},${dBaseY-dH-45} ${dStartX+dPitch},${dBaseY-dH-50}`" fill="#64748b"/>
          <text :x="dStartX + dPitch/2" :y="dBaseY - dH - 65" text-anchor="middle" fill="#334155" font-size="26" font-weight="600" font-family="Arial,sans-serif">{{ profile.pitch }}mm</text>
        </g>

        <!-- Effective Coverage annotation (bottom) -->
        <line :x1="dStartX" :y1="dBaseY + 65" :x2="dStartX + dWidth" :y2="dBaseY + 65" stroke="#334155" stroke-width="1.5"/>
        <line :x1="dStartX" :y1="dBaseY + 10" :x2="dStartX" :y2="dBaseY + 75" stroke="#94a3b8" stroke-width="1"/>
        <line :x1="dStartX + dWidth" :y1="dBaseY + 10" :x2="dStartX + dWidth" :y2="dBaseY + 75" stroke="#94a3b8" stroke-width="1"/>
        <polygon :points="`${dStartX+15},${dBaseY+60} ${dStartX+15},${dBaseY+70} ${dStartX},${dBaseY+65}`" fill="#334155"/>
        <polygon :points="`${dStartX+dWidth-15},${dBaseY+60} ${dStartX+dWidth-15},${dBaseY+70} ${dStartX+dWidth},${dBaseY+65}`" fill="#334155"/>
        <text :x="dStartX + dWidth/2" :y="dBaseY + 105" text-anchor="middle" fill="#0f172a" font-size="30" font-weight="700" font-family="Arial,sans-serif">Effective Coverage {{ profile.effective_width }}mm</text>
        <!-- Coil Width (Overall Width) below -->
        <text :x="dStartX + dWidth/2" :y="dBaseY + 140" text-anchor="middle" fill="#64748b" font-size="24" font-family="Arial,sans-serif">Overall Width (Coil) {{ profile.coil_width }}mm</text>
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
  showDimensions: { type: Boolean, default: false }
})

// ── Layout constants ──────────────────────────────────────────────────────────
const ISO_DX = 0.65   // isometric X skew per unit depth
const ISO_DY = -0.38  // isometric Y skew per unit depth
const DEPTH  = 160    // visual depth of the sheet

const startX = 120
const baseY  = 300
const PERIODS = 4

// ── Scaling ──────────────────────────────────────────────────────────────────
const scaledPitch = computed(() => {
  const p = Number(props.profile.pitch) || 200
  return Math.min(220, Math.max(90, 700 / PERIODS))
})

const scaledHeight = computed(() => {
  const h = Number(props.profile.rib_height) || 30
  const p = Number(props.profile.pitch)  || 200
  return Math.max(20, (h / p) * scaledPitch.value * 1.2)
})

// ── Surface detection ────────────────────────────────────────────────────────
const surface = computed(() =>
  (props.profile.current_surface || props.profile.surface || 'ppgi').toLowerCase()
)

const textureFilter = computed(() => {
  if (surface.value === 'gi') return 'url(#gi-spangle)'
  if (surface.value === 'gl') return 'url(#gl-grain)'
  return ''
})

// ── Base color (PPGI) ────────────────────────────────────────────────────────
const baseColor = computed(() => {
  const s = surface.value
  if (s === 'gi') return '#d0dae0'
  if (s === 'gl') return '#c8d4da'
  const c = props.profile.current_color || props.profile.color || '#3a78c9'
  return c.startsWith('#') ? c : '#3a78c9'
})

// ── Color utilities ──────────────────────────────────────────────────────────
function shadeColor(hex, pct) {
  if (!hex || !hex.startsWith('#')) return hex
  let r = parseInt(hex.slice(1,3),16)
  let g = parseInt(hex.slice(3,5),16)
  let b = parseInt(hex.slice(5,7),16)
  r = Math.min(255, Math.max(0, Math.round(r*(1 + pct/100))))
  g = Math.min(255, Math.max(0, Math.round(g*(1 + pct/100))))
  b = Math.min(255, Math.max(0, Math.round(b*(1 + pct/100))))
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
}

// ── Fill URL helpers ──────────────────────────────────────────────────────────
function fillUrl(face) {
  const s = surface.value
  const id = props.profile.id || 0
  if (s === 'gi') return `url(#gi-${face})`
  if (s === 'gl') return `url(#gl-${face})`
  return `url(#ppgi-${face}-${id})`
}

// ── Build front-profile points ────────────────────────────────────────────────
const frontPoints = computed(() => {
  const pts = []
  const p   = scaledPitch.value
  const h   = scaledHeight.value
  const type = props.profile.profile_type || 'trapezoidal'

  if (type === 'corrugated') {
    const segs = 16
    for (let i = 0; i <= PERIODS * segs; i++) {
      const t = i / segs
      const x = startX + t * p
      const y = baseY - (h/2) + Math.cos(t * Math.PI * 2) * (h/2)
      const modT = t % 1
      let face = 'crest'
      if (modT > 0.1 && modT < 0.45) face = 'rightSlope'
      else if (modT >= 0.45 && modT < 0.55) face = 'trough'
      else if (modT >= 0.55 && modT < 0.9) face = 'leftSlope'
      pts.push({ x, y, face })
    }
  } else if (type === 'standing_seam') {
    const flatW = p * 0.78
    const seamW = p * 0.22
    let x = startX
    pts.push({ x, y: baseY, face: 'trough' })
    for (let i = 0; i < PERIODS; i++) {
      x += flatW
      pts.push({ x, y: baseY, face: 'leftSlope' })
      pts.push({ x, y: baseY - h, face: 'crest' })
      x += seamW
      pts.push({ x, y: baseY - h, face: 'rightSlope' })
      pts.push({ x, y: baseY, face: 'trough' })
    }
  } else if (type === 'glazed_tile') {
    const stepW = p * 0.72, dropW = p * 0.28
    let x = startX
    for (let i = 0; i < PERIODS; i++) {
      for (let j = 0; j <= 6; j++) {
        const t = j/6
        pts.push({ x: x + t*stepW, y: baseY - Math.sin(t*Math.PI)*h*0.35, face: 'crest' })
      }
      x += stepW
      pts.push({ x, y: baseY, face: 'rightSlope' })
      x += dropW
    }
  } else {
    // trapezoidal / wall_panel / default
    const crestW  = p * 0.28
    const slopeW  = p * 0.14
    const troughW = p * 0.44
    let x = startX
    pts.push({ x, y: baseY, face: 'trough' })
    for (let i = 0; i < PERIODS; i++) {
      x += troughW
      pts.push({ x, y: baseY, face: 'leftSlope' })
      x += slopeW
      pts.push({ x, y: baseY - h, face: 'crest' })
      x += crestW
      pts.push({ x, y: baseY - h, face: 'rightSlope' })
      x += slopeW
      pts.push({ x, y: baseY, face: 'trough' })
    }
  }
  return pts
})

// ── Isometric helpers ─────────────────────────────────────────────────────────
function isoShift(x, y) {
  return { x: x + DEPTH * ISO_DX, y: y + DEPTH * ISO_DY }
}

// ── Top surface polygons ──────────────────────────────────────────────────────
const topPolygons = computed(() => {
  const polys = []
  const pts   = frontPoints.value
  for (let i = 0; i < pts.length - 1; i++) {
    const f1 = pts[i], f2 = pts[i+1]
    const b1 = isoShift(f1.x, f1.y)
    const b2 = isoShift(f2.x, f2.y)
    // Assign face-based fill
    const face = f1.face === 'crest' ? 'top'
               : f1.face === 'leftSlope' ? 'left-slope'
               : f1.face === 'rightSlope' ? 'right-slope'
               : 'trough'
    const fillKey = face === 'top' ? 'top'
                  : face === 'left-slope' ? 'left'
                  : face === 'right-slope' ? 'right'
                  : 'trough'
    polys.push({
      points: `${f1.x},${f1.y} ${f2.x},${f2.y} ${b2.x},${b2.y} ${b1.x},${b1.y}`,
      fill: fillUrl(fillKey)
    })
  }
  return polys
})

// ── Depth (side) polygons ────────────────────────────────────────────────────
const depthPolygons = computed(() => {
  const polys = []
  const pts   = frontPoints.value
  // Front-face panel height (visible front edge): constant height strip
  const frontH = Math.max(20, scaledHeight.value * 0.4)
  for (let i = 0; i < pts.length - 1; i++) {
    const f1 = pts[i], f2 = pts[i+1]
    // Only render the bottom-facing visible depth strips at troughs
    if (f1.face === 'trough') {
      const b1 = isoShift(f1.x, f1.y)
      const b2 = isoShift(f2.x, f2.y)
      polys.push({
        points: `${f1.x},${f1.y} ${b1.x},${b1.y} ${b2.x},${b2.y} ${f2.x},${f2.y}`,
        fill: fillUrl('trough')
      })
    }
  }
  return polys
})

// ── Front-face (visible front cut panel) ────────────────────────────────────
const frontFacePoints = computed(() => {
  const pts = frontPoints.value
  if (!pts.length) return ''
  const first = pts[0], last = pts[pts.length - 1]
  const frontH = Math.max(25, scaledHeight.value * 0.5)
  // Draw a panel at the front (bottom strip)
  return `${first.x},${first.y} ${last.x},${last.y} ${last.x},${last.y + frontH} ${first.x},${first.y + frontH}`
})

const frontFill = computed(() => fillUrl('front'))

// ── Front edge path ──────────────────────────────────────────────────────────
const frontEdgePath = computed(() =>
  frontPoints.value.map(p => `${p.x},${p.y}`).join(' ')
)

// ── Clip polygon for textures ─────────────────────────────────────────────────
const fullShapeClip = computed(() => {
  const pts = frontPoints.value
  if (!pts.length) return ''
  const backs = pts.map(p => isoShift(p.x, p.y)).reverse()
  return [...pts.map(p => `${p.x},${p.y}`), ...backs.map(p => `${p.x},${p.y}`)].join(' ')
})

// ── Dynamic viewBox ──────────────────────────────────────────────────────────
const dim2DOffsetY = computed(() => {
  // place 2D section below the 3D section with a gap
  return scaledHeight.value + DEPTH * Math.abs(ISO_DY) + 80
})

const dynamicViewBox = computed(() => {
  const minX = 0
  const minY = baseY - scaledHeight.value + DEPTH * ISO_DY - 60
  const maxX = startX + scaledPitch.value * PERIODS + DEPTH * ISO_DX + 100
  let maxY = baseY + 60
  if (props.showDimensions) {
    maxY = baseY + dim2DOffsetY.value + 200
  }
  return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`
})

// ── 2D dimension section constants ────────────────────────────────────────────
const dStartX = computed(() => startX)
const dBaseY  = computed(() => baseY)
const dH      = computed(() => scaledHeight.value)
const dPitch  = computed(() => scaledPitch.value)
const dWidth  = computed(() => scaledPitch.value * PERIODS)

// ── 2D profile path (same shape as front, but redrawn at dBaseY) ─────────────
const dim2DPath = computed(() =>
  frontPoints.value.map(p => `${p.x},${p.y}`).join(' ')
)
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
