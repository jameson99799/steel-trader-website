<template>
  <div class="profile-3d-container" :style="{ width: width || '100%', height: height || '100%' }">
    <svg :viewBox="dynamicViewBox" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" style="width: 100%; height: 100%;">
      <defs>
        <!-- GI (Galvanized) Texture: Large crystalline spangles -->
        <filter id="gi-texture" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" result="noise" />
          <feColorMatrix type="saturate" values="0" in="noise" result="gray" />
          <feComponentTransfer in="gray" result="softNoise">
            <feFuncA type="linear" slope="0.3" />
          </feComponentTransfer>
          <feBlend mode="overlay" in="softNoise" in2="SourceGraphic" />
        </filter>
        <!-- GL (Galvalume) Texture: Fine, smooth metallic grain -->
        <filter id="gl-texture" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.15" numOctaves="2" result="noise" />
          <feColorMatrix type="saturate" values="0" in="noise" result="gray" />
          <feComponentTransfer in="gray" result="softNoise">
            <feFuncA type="linear" slope="0.15" />
          </feComponentTransfer>
          <feBlend mode="overlay" in="softNoise" in2="SourceGraphic" />
        </filter>
      </defs>

      <g :filter="getTextureFilter()">
        <!-- Surface Polygons -->
        <polygon 
          v-for="(poly, i) in polygons" 
          :key="i" 
          :points="poly.points" 
          :fill="poly.fill" 
          :stroke="poly.stroke || poly.fill" 
          stroke-width="0.5" 
          stroke-linejoin="round" 
        />
      </g>
      
      <!-- Front Edge Profile Line -->
      <polyline :points="frontPath" fill="none" stroke="#222" stroke-width="2" stroke-linejoin="round" />
      
      <!-- 2D Cross Section & Dimensions (Separate from 3D) -->
      <g v-if="showDimensions" transform="translate(0, 200)">
        <!-- 2D Title -->
        <text :x="startX" :y="baseY - scaledHeight - 90" fill="#1e293b" font-size="32" font-weight="bold" letter-spacing="1">PROFILE &amp; DIMENSIONS</text>
        <path :d="`M ${startX},${baseY - scaledHeight - 75} L ${startX + (scaledPitch * 3)},${baseY - scaledHeight - 75}`" stroke="#cbd5e1" stroke-width="2" />

        <!-- The 2D Profile Line -->
        <polyline :points="frontPath" fill="none" stroke="#0f172a" stroke-width="4" stroke-linejoin="round" />
        
        <!-- Rib Height (Left side) -->
        <path :d="`M ${startX - 50},${baseY} L ${startX - 50},${baseY - scaledHeight}`" stroke="#64748b" stroke-width="2" />
        <!-- Arrows for Rib Height -->
        <polygon :points="`${startX - 55},${baseY - 10} ${startX - 45},${baseY - 10} ${startX - 50},${baseY}`" fill="#64748b" />
        <polygon :points="`${startX - 55},${baseY - scaledHeight + 10} ${startX - 45},${baseY - scaledHeight + 10} ${startX - 50},${baseY - scaledHeight}`" fill="#64748b" />
        <!-- Guide lines for Rib Height -->
        <path :d="`M ${startX - 65},${baseY} L ${startX},${baseY}`" stroke="#94a3b8" stroke-dasharray="4" />
        <path :d="`M ${startX - 65},${baseY - scaledHeight} L ${startX + 50},${baseY - scaledHeight}`" stroke="#94a3b8" stroke-dasharray="4" />
        <text :x="startX - 75" :y="baseY - scaledHeight/2 + 10" text-anchor="end" fill="#334155" font-size="28" font-weight="600">{{ profile.rib_height }}mm</text>
        
        <!-- Pitch (Top) -->
        <g v-if="profile.pitch">
          <path :d="`M ${startX},${baseY - scaledHeight - 35} L ${startX + scaledPitch},${baseY - scaledHeight - 35}`" stroke="#64748b" stroke-width="2" />
          <path :d="`M ${startX},${baseY - scaledHeight} L ${startX},${baseY - scaledHeight - 45}`" stroke="#94a3b8" />
          <path :d="`M ${startX + scaledPitch},${baseY - scaledHeight} L ${startX + scaledPitch},${baseY - scaledHeight - 45}`" stroke="#94a3b8" />
          <!-- Arrows for Pitch -->
          <polygon :points="`${startX + 10},${baseY - scaledHeight - 40} ${startX + 10},${baseY - scaledHeight - 30} ${startX},${baseY - scaledHeight - 35}`" fill="#64748b" />
          <polygon :points="`${startX + scaledPitch - 10},${baseY - scaledHeight - 40} ${startX + scaledPitch - 10},${baseY - scaledHeight - 30} ${startX + scaledPitch},${baseY - scaledHeight - 35}`" fill="#64748b" />
          <text :x="startX + scaledPitch/2" :y="baseY - scaledHeight - 50" text-anchor="middle" fill="#334155" font-size="28" font-weight="600">{{ profile.pitch }}mm</text>
        </g>

        <!-- Effective Width / Cover Width (Bottom) -->
        <path :d="`M ${startX},${baseY + 60} L ${startX + (scaledPitch * 3)},${baseY + 60}`" stroke="#64748b" stroke-width="2" />
        <path :d="`M ${startX},${baseY} L ${startX},${baseY + 70}`" stroke="#94a3b8" />
        <path :d="`M ${startX + (scaledPitch * 3)},${baseY} L ${startX + (scaledPitch * 3)},${baseY + 70}`" stroke="#94a3b8" />
        <!-- Arrows for Effective Width -->
        <polygon :points="`${startX + 15},${baseY + 55} ${startX + 15},${baseY + 65} ${startX},${baseY + 60}`" fill="#64748b" />
        <polygon :points="`${startX + (scaledPitch * 3) - 15},${baseY + 55} ${startX + (scaledPitch * 3) - 15},${baseY + 65} ${startX + (scaledPitch * 3)},${baseY + 60}`" fill="#64748b" />
        <text :x="startX + (scaledPitch * 1.5)" :y="baseY + 110" text-anchor="middle" fill="#1e293b" font-size="36" font-weight="bold">Effective Coverage {{ profile.effective_width }}mm</text>
      </g>
    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  profile: {
    type: Object,
    required: true,
    // Expected: profile_type, effective_width, coil_width, rib_height, pitch, color, surface
  },
  width: String,
  height: String,
  showDimensions: { type: Boolean, default: false }
})

const viewWidth = 1000
const viewHeight = 400

const startX = 100
const baseY = 320
const depthX = 150
const depthY = -120

const dynamicViewBox = computed(() => {
  const minX = 0;
  const minY = baseY - scaledHeight.value + depthY - 50; 
  const maxX = startX + (scaledPitch.value * 4) + depthX + 50;
  
  let maxY = baseY + 20;
  if (props.showDimensions) {
    maxY = baseY + 350; // extra space for translated 2D section
  }
  
  const width = maxX - minX;
  const height = maxY - minY;
  return `${minX} ${minY} ${width} ${height}`;
})

// Scale the physical dimensions to the viewBox
const scaledPitch = computed(() => {
  const p = Number(props.profile.pitch) || 200
  // Try to fit 3-4 periods in the viewWidth
  return Math.min(250, Math.max(100, (viewWidth - 300) / 3)) 
})

const scaledHeight = computed(() => {
  const h = Number(props.profile.rib_height) || 30
  const p = Number(props.profile.pitch) || 200
  // Maintain aspect ratio relative to pitch
  return (h / p) * scaledPitch.value
})

const getTextureFilter = () => {
  const s = props.profile.current_surface || props.profile.surface || 'ppgi'
  if (s === 'gi') return 'url(#gi-texture)'
  if (s === 'gl') return 'url(#gl-texture)'
  return ''
}

const baseColor = computed(() => {
  const s = props.profile.current_surface || props.profile.surface || 'ppgi'
  if (s === 'gi') return '#e0e5e9'
  if (s === 'gl') return '#d1d8dd'
  return props.profile.current_color || props.profile.color || '#3498db'
})

// Generate color variations for 3D lighting
const shadeColor = (color, percent) => {
  let R = parseInt(color.substring(1,3),16)
  let G = parseInt(color.substring(3,5),16)
  let B = parseInt(color.substring(5,7),16)
  R = parseInt(R * (100 + percent) / 100)
  G = parseInt(G * (100 + percent) / 100)
  B = parseInt(B * (100 + percent) / 100)
  R = (R<255)?R:255; G = (G<255)?G:255; B = (B<255)?B:255
  R = (R>0)?R:0; G = (G>0)?G:0; B = (B>0)?B:0
  let RR = ((R.toString(16).length==1)?"0"+R.toString(16):R.toString(16))
  let GG = ((G.toString(16).length==1)?"0"+G.toString(16):G.toString(16))
  let BB = ((B.toString(16).length==1)?"0"+B.toString(16):B.toString(16))
  return "#"+RR+GG+BB
}

const colors = computed(() => {
  const c = baseColor.value.startsWith('#') ? baseColor.value : '#3498db'
  return {
    crest: shadeColor(c, 20),      // Top faces get light
    trough: shadeColor(c, -10),    // Bottom faces get slight shadow
    leftSlope: shadeColor(c, 40),  // Light source from top-left
    rightSlope: shadeColor(c, -30) // Shadow side
  }
})

// Generate the 2D front points
const frontPoints = computed(() => {
  const pts = []
  const periods = 4
  const p = scaledPitch.value
  const h = scaledHeight.value
  const type = props.profile.profile_type || 'trapezoidal'
  
  if (type === 'trapezoidal' || type === 'wall_panel') {
    // Standard box profile
    const crestW = p * 0.25
    const slopeW = p * 0.15
    const troughW = p * 0.45
    
    let x = startX
    pts.push({ x, y: baseY, type: 'trough' })
    for (let i = 0; i < periods; i++) {
      x += troughW
      pts.push({ x, y: baseY, type: 'leftSlope' })
      x += slopeW
      pts.push({ x, y: baseY - h, type: 'crest' })
      x += crestW
      pts.push({ x, y: baseY - h, type: 'rightSlope' })
      x += slopeW
      pts.push({ x, y: baseY, type: 'trough' })
    }
  } else if (type === 'corrugated') {
    // Sine wave approximation with multiple segments
    const segmentsPerPeriod = 12
    let x = startX
    for (let i = 0; i <= periods * segmentsPerPeriod; i++) {
      const t = i / segmentsPerPeriod
      const currentX = startX + t * p
      // Cosine from 0 to 1, mapped to 0 to h
      const currentY = baseY - (h / 2) + (Math.cos(t * Math.PI * 2) * (h / 2))
      // Determine slope direction for lighting
      let faceType = 'crest' // top
      const modT = t % 1
      if (modT > 0.1 && modT < 0.4) faceType = 'rightSlope'
      else if (modT >= 0.4 && modT < 0.6) faceType = 'trough'
      else if (modT >= 0.6 && modT < 0.9) faceType = 'leftSlope'
      
      pts.push({ x: currentX, y: currentY, type: faceType })
    }
  } else if (type === 'standing_seam') {
    const flatW = p * 0.8
    const seamW = p * 0.2
    let x = startX
    pts.push({ x, y: baseY, type: 'trough' })
    for (let i = 0; i < periods; i++) {
      x += flatW
      pts.push({ x, y: baseY, type: 'leftSlope' })
      pts.push({ x: x, y: baseY - h, type: 'crest' })
      x += seamW
      pts.push({ x: x, y: baseY - h, type: 'rightSlope' })
      pts.push({ x: x, y: baseY, type: 'trough' })
    }
  } else if (type === 'glazed_tile') {
    // Like corrugated but with a flat step
    const stepW = p * 0.7
    const dropW = p * 0.3
    let x = startX
    for (let i = 0; i < periods; i++) {
      for(let j=0; j<=5; j++){
        const t = j/5
        pts.push({ x: x + t*stepW, y: baseY - Math.sin(t*Math.PI)*h*0.3, type: 'crest' })
      }
      x += stepW
      pts.push({ x, y: baseY, type: 'rightSlope' })
      x += dropW
    }
  } else {
    // Fallback flat
    pts.push({ x: startX, y: baseY, type: 'trough' })
    pts.push({ x: startX + p * periods, y: baseY, type: 'trough' })
  }
  
  return pts
})

// Create 3D polygons by extruding adjacent points
const polygons = computed(() => {
  const polys = []
  const pts = frontPoints.value
  const c = colors.value
  
  for (let i = 0; i < pts.length - 1; i++) {
    const p1 = pts[i]
    const p2 = pts[i+1]
    
    // Select color based on the face type
    let fill = c[p1.type] || c.crest
    
    // Front face points
    const x1 = p1.x, y1 = p1.y
    const x2 = p2.x, y2 = p2.y
    // Back face points
    const bx1 = x1 + depthX, by1 = y1 + depthY
    const bx2 = x2 + depthX, by2 = y2 + depthY
    
    polys.push({
      points: `${x1},${y1} ${x2},${y2} ${bx2},${by2} ${bx1},${by1}`,
      fill: fill,
      stroke: fill
    })
  }
  return polys
})

// The thick front line
const frontPath = computed(() => {
  return frontPoints.value.map(p => `${p.x},${p.y}`).join(' ')
})
</script>

<style scoped>
.profile-3d-container {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
</style>
