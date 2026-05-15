<template>
  <div class="watermark-editor">
    <div class="editor-header">
      <h3>{{ isEditing ? '编辑水印模板' : '新建水印模板' }}</h3>
      <button class="modal-close" @click="$emit('close')">&times;</button>
    </div>
    
    <div class="editor-body">
      <!-- Settings Panel -->
      <div class="editor-settings">
        <div class="form-group">
          <label>模板名称</label>
          <input v-model="form.name" class="form-control" placeholder="如：默认右下角文字" />
        </div>
        
        <div class="form-group">
          <label>水印类型</label>
          <div style="display:flex;gap:12px;">
            <label><input type="radio" v-model="form.type" value="text" /> 文字水印</label>
            <label><input type="radio" v-model="form.type" value="image" /> 图片水印</label>
          </div>
        </div>

        <template v-if="form.type === 'text'">
          <div class="form-group">
            <label>文字内容</label>
            <input v-model="form.text_content" class="form-control" placeholder="输入水印文字" />
          </div>
          <div class="form-group">
            <label>字体</label>
            <select v-model="form.font_family" class="form-control">
              <option value="Arial">Arial</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Microsoft YaHei">微软雅黑</option>
              <option value="Verdana">Verdana</option>
            </select>
          </div>
          <div class="form-group">
            <label>颜色 (文字 / 描边)</label>
            <div style="display:flex;gap:8px;">
              <input type="color" v-model="form.text_color" title="文字颜色" />
              <input type="color" v-model="form.stroke_color" title="描边颜色" />
              <button class="btn btn-sm btn-outline" @click="form.stroke_color = 'transparent'">无描边</button>
            </div>
          </div>
          <div class="form-group" v-if="form.stroke_color !== 'transparent'">
            <label>描边粗细 ({{ Math.round(form.stroke_width * 100) }}%)</label>
            <input type="range" v-model.number="form.stroke_width" min="0.01" max="0.1" step="0.01" />
          </div>
          <div class="form-group">
            <label>相对大小 ({{ Math.round(form.font_size * 100) }}%)</label>
            <input type="range" v-model.number="form.font_size" min="0.02" max="0.3" step="0.01" />
          </div>
        </template>

        <template v-if="form.type === 'image'">
          <div class="form-group">
            <label>图片 URL</label>
            <div style="display:flex;gap:8px;">
              <input v-model="form.watermark_url" class="form-control" placeholder="输入URL或从图库选择" />
              <button class="btn btn-sm btn-outline" @click="$emit('pick-media')">选择</button>
            </div>
          </div>
          <div class="form-group">
            <label>相对缩放 ({{ Math.round(form.scale * 100) }}%)</label>
            <input type="range" v-model.number="form.scale" min="0.05" max="0.8" step="0.01" />
          </div>
        </template>

        <div class="form-group">
          <label>透明度 ({{ Math.round(form.opacity * 100) }}%)</label>
          <input type="range" v-model.number="form.opacity" min="0.1" max="1" step="0.05" />
        </div>
        
        <div class="form-group">
          <label>位置 (X/Y 百分比)</label>
          <div style="display:flex;gap:8px;">
            <input type="number" v-model.number="form.pos_x" min="0" max="1" step="0.01" class="form-control" title="X" />
            <input type="number" v-model.number="form.pos_y" min="0" max="1" step="0.01" class="form-control" title="Y" />
          </div>
          <p class="hint">可直接在右侧预览区拖动调整</p>
        </div>
        <div class="form-group" style="margin-top:20px; padding-top:20px; border-top:1px solid #e2e8f0;">
          <label>预览区背景图</label>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-sm btn-outline" @click="$emit('pick-media-bg')">🖼️ 更换背景</button>
            <button class="btn btn-sm btn-outline" @click="bgImage = 'https://images.unsplash.com/photo-1565153997401-2292f75db265?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'">恢复默认</button>
          </div>
          <p class="hint">更换背景图可帮助您在真实照片上预览水印效果（仅用于预览，不保存）。</p>
        </div>
      </div>

      <!-- Preview Canvas -->
      <div class="editor-canvas-wrapper" ref="canvasWrapper">
        <div class="editor-canvas">
          <img :src="bgImage" alt="Preview Background" class="bg-img" />
          
          <div class="draggable-watermark" 
               :style="watermarkStyle"
               @mousedown="startDrag">
            
            <template v-if="form.type === 'text'">
              <div :style="textStyle">{{ form.text_content || '水印预览' }}</div>
            </template>
            <template v-if="form.type === 'image'">
              <img v-if="form.watermark_url" :src="form.watermark_url" :style="imageStyle" />
              <div v-else class="placeholder-img">Logo</div>
            </template>

          </div>
        </div>
      </div>
    </div>
    
    <div class="editor-footer">
      <button class="btn btn-secondary" @click="$emit('close')">取消</button>
      <button class="btn btn-primary" @click="save" :disabled="!form.name">保存模板</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  template: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'save', 'pick-media', 'pick-media-bg'])

const bgImage = ref('https://images.unsplash.com/photo-1565153997401-2292f75db265?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80')

const form = ref({
  name: '',
  type: 'text',
  watermark_url: '',
  text_content: 'My Company',
  font_family: 'Arial',
  font_size: 0.05,
  text_color: '#ffffff',
  stroke_color: '#000000',
  stroke_width: 0.02,
  opacity: 0.8,
  scale: 0.15,
  pos_x: 0.9,
  pos_y: 0.9
})

if (props.template) {
  Object.assign(form.value, props.template)
}

// Ensure the form gets the selected media url if changed externally
const setMediaUrl = (url) => {
  form.value.watermark_url = url
}
const setBgMediaUrl = (url) => {
  bgImage.value = url
}
defineExpose({ setMediaUrl, setBgMediaUrl })

const canvasWrapper = ref(null)

const watermarkStyle = computed(() => {
  return {
    left: `${form.value.pos_x * 100}%`,
    top: `${form.value.pos_y * 100}%`,
    transform: 'translate(-50%, -50%)',
    opacity: form.value.opacity,
    position: 'absolute',
    cursor: 'move',
    userSelect: 'none'
  }
})

const textStyle = computed(() => {
  const fontSizePx = form.value.font_size * 800
  const strokeWidthPx = form.value.stroke_color === 'transparent' ? 0 : Math.max(1, Math.round(fontSizePx * form.value.stroke_width))
  return {
    fontFamily: form.value.font_family,
    color: form.value.text_color,
    fontSize: `${fontSizePx}px`, // approximate based on 800px preview width
    fontWeight: 'bold',
    WebkitTextStroke: form.value.stroke_color !== 'transparent' ? `${strokeWidthPx}px ${form.value.stroke_color}` : 'none',
    whiteSpace: 'nowrap'
  }
})

const imageStyle = computed(() => {
  return {
    width: `${form.value.scale * 800}px`,
    height: 'auto',
    display: 'block'
  }
})

// Drag logic
let isDragging = false
let startX = 0
let startY = 0
let initialPosX = 0
let initialPosY = 0

const startDrag = (e) => {
  isDragging = true
  startX = e.clientX
  startY = e.clientY
  initialPosX = form.value.pos_x
  initialPosY = form.value.pos_y
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

const onDrag = (e) => {
  if (!isDragging || !canvasWrapper.value) return
  const rect = canvasWrapper.value.querySelector('.editor-canvas').getBoundingClientRect()
  const dx = e.clientX - startX
  const dy = e.clientY - startY
  
  // Convert px movement to percentage
  let newX = initialPosX + (dx / rect.width)
  let newY = initialPosY + (dy / rect.height)
  
  // clamp
  newX = Math.max(0, Math.min(1, newX))
  newY = Math.max(0, Math.min(1, newY))
  
  form.value.pos_x = Number(newX.toFixed(3))
  form.value.pos_y = Number(newY.toFixed(3))
}

const stopDrag = () => {
  isDragging = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
})

const isEditing = computed(() => !!props.template?.id)

const save = () => {
  emit('save', { ...form.value })
}
</script>

<style scoped>
.watermark-editor {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  display: flex;
  flex-direction: column;
  height: 80vh;
  max-height: 800px;
  overflow: hidden;
}

.editor-header {
  padding: 16px 20px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.editor-header h3 { margin: 0; font-size: 16px; color: #1e293b; }

.editor-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.editor-settings {
  width: 320px;
  padding: 20px;
  border-right: 1px solid #e2e8f0;
  overflow-y: auto;
  background: #f8fafc;
}

.editor-canvas-wrapper {
  flex: 1;
  background: #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  overflow: hidden;
}

.editor-canvas {
  position: relative;
  max-width: 100%;
  max-height: 100%;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  background: #fff;
}

.bg-img {
  display: block;
  max-width: 100%;
  max-height: 60vh;
  object-fit: contain;
}

.placeholder-img {
  background: rgba(0,0,0,0.5);
  color: white;
  padding: 20px;
  border-radius: 4px;
}

.draggable-watermark {
  border: 1px dashed transparent;
  padding: 4px;
}

.draggable-watermark:hover {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
}

.editor-footer {
  padding: 16px 20px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  background: #fff;
}
</style>
