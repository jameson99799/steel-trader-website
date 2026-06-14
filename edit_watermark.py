import io

filepath = 'src/components/admin/WatermarkEditor.vue'
with io.open(filepath, 'r', encoding='utf-8') as f:
    text = f.read()

# isVideoBg calculation
text = text.replace(
'''const bgImage = ref('https://images.unsplash.com/photo-1565153997401-2292f75db265?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80')''',
'''const bgImage = ref('https://images.unsplash.com/photo-1565153997401-2292f75db265?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80')
const isVideoBg = computed(() => {
  const url = bgImage.value.toLowerCase()
  return url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.ogg')
})'''
)

# Template changes
text = text.replace(
'''<img :src="bgImage" alt="Preview Background" class="bg-img" />''',
'''<video v-if="isVideoBg" :src="bgImage" autoplay loop muted playsinline class="bg-img"></video>
          <img v-else :src="bgImage" alt="Preview Background" class="bg-img" />'''
)

text = text.replace(
'''<img v-if="form.watermark_url" :src="form.watermark_url" :style="imageStyle" />''',
'''<video v-if="form.watermark_url && (form.watermark_url.toLowerCase().endsWith('.mp4') || form.watermark_url.toLowerCase().endsWith('.webm'))" :src="form.watermark_url" :style="imageStyle" autoplay loop muted playsinline></video>
              <img v-else-if="form.watermark_url" :src="form.watermark_url" :style="imageStyle" />'''
)

text = text.replace(
'''<p class="hint">更换背景图可帮助您在真实照片上预览水印效果（仅用于预览，不保存）。</p>''',
'''<p class="hint">更换背景可帮助您在真实照片或视频上预览水印效果（仅用于预览，不保存）。支持 MP4 视频背景预览！</p>'''
)

with io.open(filepath, 'w', encoding='utf-8') as f:
    f.write(text)
print('Updated WatermarkEditor.vue')
