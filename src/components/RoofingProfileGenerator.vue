<template>
  <div class="profile-3d-container" :style="{ width: width || '100%', height: height || '100%', flexDirection: 'column' }">
    <img v-if="profile.image_url" :src="profile.image_url" class="real-image" />
    <svg :viewBox="dynamicViewBox" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" style="width: 100%; height: 100%;">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="25" stdDeviation="15" flood-color="#000000" flood-opacity="0.25" />
        </filter>
      </defs>

      <!-- 3D Shape with Shadow -->
      <g filter="url(#shadow)" v-if="!profile.image_url">
        <polygon 
          v-for="(poly, i) in polygons" 
          :key="i" 
          :points="poly.points" 
          :fill="poly.fill" 
          :stroke="poly.stroke || poly.fill" 
          stroke-width="0.5" 
          stroke-linejoin="round" 
        />
        <!-- Front Edge Profile Line -->
        <polyline :points="frontPath" fill="none" stroke="#222" stroke-width="2" stroke-linejoin="round" />
      </g>
      
      <!-- Dimensions Layer -->
      <g v-if="showDimensions">
        <!-- Coil Width (Top, Above 3D) -->
        <g v-if="!profile.image_url">
          <text :x="startX + (scaledPitch * periods)/2 + depthX/2" :y="baseY - scaledHeight + depthY - 60" text-anchor="middle" fill="#1e293b" font-size="36" font-weight="bold">{{ profile.coil_width }}mm</text>
          <text :x="startX + (scaledPitch * periods)/2 + depthX/2" :y="baseY - scaledHeight + depthY - 30" text-anchor="middle" fill="#64748b" font-size="20">Coil Width / 展开宽度</text>
          
          <path :d="`M ${startX + depthX - 40},${baseY - scaledHeight + depthY - 45} L ${startX + (scaledPitch * periods) + depthX + 40},${baseY - scaledHeight + depthY - 45}`" stroke="#94a3b8" stroke-width="2" />
          <path :d="`M ${startX + depthX - 40},${baseY - scaledHeight + depthY - 65} L ${startX + depthX - 40},${baseY - scaledHeight + depthY - 25}`" stroke="#94a3b8" stroke-width="2" />
          <path :d="`M ${startX + (scaledPitch * periods) + depthX + 40},${baseY - scaledHeight + depthY - 65} L ${startX + (scaledPitch * periods) + depthX + 40},${baseY - scaledHeight + depthY - 25}`" stroke="#94a3b8" stroke-width="2" />
          
          <polygon :points="`${startX + depthX - 35},${baseY - scaledHeight + depthY - 50} ${startX + depthX - 35},${baseY - scaledHeight + depthY - 40} ${startX + depthX - 40},${baseY - scaledHeight + depthY - 45}`" fill="#94a3b8" />
          <polygon :points="`${startX + (scaledPitch * periods) + depthX + 35},${baseY - scaledHeight + depthY - 50} ${startX + (scaledPitch * periods) + depthX + 35},${baseY - scaledHeight + depthY - 40} ${startX + (scaledPitch * periods) + depthX + 40},${baseY - scaledHeight + depthY - 45}`" fill="#94a3b8" />
        </g>

        <!-- Effective Width (Below 3D, Above 2D) -->
        <g>
          <text :x="startX + (scaledPitch * periods)/2" :y="baseY + 50" text-anchor="middle" fill="#1e293b" font-size="36" font-weight="bold">{{ profile.effective_width }}mm</text>
          <text :x="startX + (scaledPitch * periods)/2" :y="baseY + 80" text-anchor="middle" fill="#64748b" font-size="20">Effective Coverage / 有效宽度</text>
          
          <path :d="`M ${startX},${baseY + 65} L ${startX + (scaledPitch * periods)},${baseY + 65}`" stroke="#94a3b8" stroke-width="2" />
          <path :d="`M ${startX},${baseY + 45} L ${startX},${baseY + 130}`" stroke="#94a3b8" stroke-dasharray="4" />
          <path :d="`M ${startX + (scaledPitch * periods)},${baseY + 45} L ${startX + (scaledPitch * periods)},${baseY + 130}`" stroke="#94a3b8" stroke-dasharray="4" />
          
          <polygon :points="`${startX + 15},${baseY + 60} ${startX + 15},${baseY + 70} ${startX},${baseY + 65}`" fill="#94a3b8" />
          <polygon :points="`${startX + (scaledPitch * periods) - 15},${baseY + 60} ${startX + (scaledPitch * periods) - 15},${baseY + 70} ${startX + (scaledPitch * periods)},${baseY + 65}`" fill="#94a3b8" />
        </g>

        <!-- 2D Profile Line (Shifted down by 130px) -->
        <g transform="translate(0, 130)">
          <polyline :points="frontPath" fill="none" stroke="#0f172a" stroke-width="4" stroke-linejoin="round" />
          
          <!-- Rib Height (Right Side) -->
          <g>
            <path :d="`M ${startX + (scaledPitch * periods) + 30},${baseY} L ${startX + (scaledPitch * periods) + 80},${baseY}`" stroke="#94a3b8" stroke-dasharray="4" />
            <path :d="`M ${startX + (scaledPitch * periods) + 30},${baseY - scaledHeight} L ${startX + (scaledPitch * periods) + 80},${baseY - scaledHeight}`" stroke="#94a3b8" stroke-dasharray="4" />
            <path :d="`M ${startX + (scaledPitch * periods) + 60},${baseY} L ${startX + (scaledPitch * periods) + 60},${baseY - scaledHeight}`" stroke="#94a3b8" stroke-width="2" />
            
            <polygon :points="`${startX + (scaledPitch * periods) + 55},${baseY - 10} ${startX + (scaledPitch * periods) + 65},${baseY - 10} ${startX + (scaledPitch * periods) + 60},${baseY}`" fill="#94a3b8" />
            <polygon :points="`${startX + (scaledPitch * periods) + 55},${baseY - scaledHeight + 10} ${startX + (scaledPitch * periods) + 65},${baseY - scaledHeight + 10} ${startX + (scaledPitch * periods) + 60},${baseY - scaledHeight}`" fill="#94a3b8" />
            
            <text :x="startX + (scaledPitch * periods) + 90" :y="baseY - scaledHeight/2 + 8" fill="#334155" font-size="24" font-weight="600">Rib Height / 波高 {{ profile.rib_height }}mm</text>
          </g>
          
          <!-- Pitch (Bottom Side) -->
          <g v-if="profile.pitch">
            <path :d="`M ${startX + scaledPitch},${baseY} L ${startX + scaledPitch},${baseY + 45}`" stroke="#94a3b8" stroke-dasharray="4" />
            <path :d="`M ${startX + scaledPitch * 2},${baseY} L ${startX + scaledPitch * 2},${baseY + 45}`" stroke="#94a3b8" stroke-dasharray="4" />
            <path :d="`M ${startX + scaledPitch},${baseY + 30} L ${startX + scaledPitch * 2},${baseY + 30}`" stroke="#94a3b8" stroke-width="2" />
            
            <polygon :points="`${startX + scaledPitch + 10},${baseY + 25} ${startX + scaledPitch + 10},${baseY + 35} ${startX + scaledPitch},${baseY + 30}`" fill="#94a3b8" />
            <polygon :points="`${startX + scaledPitch * 2 - 10},${baseY + 25} ${startX + scaledPitch * 2 - 10},${baseY + 35} ${startX + scaledPitch * 2},${baseY + 30}`" fill="#94a3b8" />
            
            <text :x="startX + scaledPitch * 1.5" :y="baseY + 65" text-anchor="middle" fill="#334155" font-size="24" font-weight="600">Pitch / 波距 {{ profile.pitch }}mm</text>
          </g>
        </g>
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

const periods = computed(() => props.profile.profile_type === 'standing_seam' ? 3 : 4)

const dynamicViewBox = computed(() => {
  const minX = startX - 100;
  const minY = props.profile.image_url ? baseY + 20 : (baseY - scaledHeight.value + depthY - (props.showDimensions ? 120 : 40)); 
  const maxX = startX + (scaledPitch.value * periods.value) + depthX + 150;
  
  let maxY = baseY + 40;
  if (props.showDimensions) {
    maxY = baseY + 240; // Full space for translations and bottom pitch text
  }
  
  const width = maxX - minX;
  const height = maxY - minY;
  return `${minX} ${minY} ${width} ${height}`;
})

const scaledPitch = computed(() => {
  const p = Number(props.profile.pitch) || 200
  return Math.min(250, Math.max(100, (viewWidth - 300) / 3)) 
})

const scaledHeight = computed(() => {
  const h = Number(props.profile.rib_height) || 30
  const p = Number(props.profile.pitch) || 200
  return (h / p) * scaledPitch.value
})

const baseColor = computed(() => {
  const s = props.profile.current_surface || props.profile.surface || 'ppgi'
  if (s === 'gi') return '#e2e8f0'
  if (s === 'gl') return '#cbd5e1'
  return props.profile.current_color || props.profile.color || '#3498db'
})

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
    crest: shadeColor(c, 40),      // Bright highlight for metallic sheen
    trough: shadeColor(c, -30),    // Deep shadow
    leftSlope: shadeColor(c, 10),  // Ambient mid-tone
    rightSlope: shadeColor(c, -10) // Ambient shadow
  }
})

const frontPoints = computed(() => {
  const pts = []
  const p = scaledPitch.value
  const h = scaledHeight.value
  const type = props.profile.profile_type || 'trapezoidal'
  const pers = periods.value
  
  if (type === 'trapezoidal' || type === 'wall_panel') {
    const crestW = p * 0.25
    const slopeW = p * 0.15
    const troughW = p * 0.45
    
    let x = startX
    pts.push({ x, y: baseY, type: 'trough' })
    for (let i = 0; i < pers; i++) {
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
    const segmentsPerPeriod = 12
    let x = startX
    for (let i = 0; i <= pers * segmentsPerPeriod; i++) {
      const t = i / segmentsPerPeriod
      const currentX = startX + t * p
      const currentY = baseY - (h / 2) + (Math.cos(t * Math.PI * 2) * (h / 2))
      let faceType = 'crest'
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
    for (let i = 0; i < pers; i++) {
      x += flatW
      pts.push({ x, y: baseY, type: 'leftSlope' })
      pts.push({ x: x, y: baseY - h, type: 'crest' })
      x += seamW
      pts.push({ x: x, y: baseY - h, type: 'rightSlope' })
      pts.push({ x: x, y: baseY, type: 'trough' })
    }
  } else if (type === 'glazed_tile') {
    const stepW = p * 0.7
    const dropW = p * 0.3
    let x = startX
    for (let i = 0; i < pers; i++) {
      for(let j=0; j<=5; j++){
        const t = j/5
        pts.push({ x: x + t*stepW, y: baseY - Math.sin(t*Math.PI)*h*0.3, type: 'crest' })
      }
      x += stepW
      pts.push({ x, y: baseY, type: 'rightSlope' })
      x += dropW
    }
  } else {
    pts.push({ x: startX, y: baseY, type: 'trough' })
    pts.push({ x: startX + p * pers, y: baseY, type: 'trough' })
  }
  
  return pts
})

const polygons = computed(() => {
  const polys = []
  const pts = frontPoints.value
  const c = colors.value
  
  for (let i = 0; i < pts.length - 1; i++) {
    const p1 = pts[i]
    const p2 = pts[i+1]
    
    let fill = c[p1.type] || c.crest
    
    const x1 = p1.x, y1 = p1.y
    const x2 = p2.x, y2 = p2.y
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
.real-image {
  width: 100%;
  height: auto;
  max-height: 400px;
  object-fit: cover;
  border-radius: 8px;
  z-index: 2;
}
</style>
