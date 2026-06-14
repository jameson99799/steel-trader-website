import io
import re

filepath = 'src/views/admin/News.vue'
with io.open(filepath, 'r', encoding='utf-8') as f:
    text = f.read()

# Add Video Autoplay select
text = text.replace(
'''<select v-model="newsMediaWatermark" class="form-control" style="max-width:140px;">
                <option value="">不添加水印</option>
                <option v-for="t in watermarkTemplates" :key="t.id" :value="t.id">{{ t.name }}</option>
              </select>''',
'''<select v-model="newsMediaWatermark" class="form-control" style="max-width:140px;">
                <option value="">不添加水印</option>
                <option v-for="t in watermarkTemplates" :key="t.id" :value="t.id">{{ t.name }}</option>
              </select>
              <select v-model="newsMediaVideoAutoplay" class="form-control" style="max-width:130px;">
                <option :value="true">自动静音循环</option>
                <option :value="false">显示侧边控件</option>
              </select>'''
)

# Replace modal thumbnail
text = text.replace(
'''<img :src="item.filepath" @error="item.filepath='/placeholder.png'" />''',
'''<video v-if="item.filepath && (item.filepath.toLowerCase().endsWith('.mp4') || item.filepath.toLowerCase().endsWith('.webm'))" :src="item.filepath" style="width:100%;aspect-ratio:1;object-fit:cover;" preload="metadata"></video>
                <img v-else :src="item.filepath" @error="item.filepath='/placeholder.png'" />'''
)

# Add newsMediaVideoAutoplay ref
text = text.replace(
'''const newsMediaWatermark = ref('')''',
'''const newsMediaWatermark = ref('')
const newsMediaVideoAutoplay = ref(true)'''
)

# Inside insert processing
text = text.replace(
'''        if (newsImgChooserMode === 'cover') {
          form.value.cover_image = data.urls[0]
        } else {
          if (newsEditorMode.value === 'visual' && newsVisualEl.value) {
            newsVisualEl.value.focus()
            document.execCommand('insertImage', false, data.urls[0])
          }
        }''',
'''        if (newsImgChooserMode === 'cover') {
          form.value.cover_image = data.urls[0]
        } else {
          if (newsEditorMode.value === 'visual' && newsVisualEl.value) {
            newsVisualEl.value.focus()
            if (data.urls[0].toLowerCase().endsWith('.mp4') || data.urls[0].toLowerCase().endsWith('.webm')) {
                const html = newsMediaVideoAutoplay.value 
                   ? `<video src="${data.urls[0]}" autoplay loop muted playsinline style="max-width:100%;"></video>` 
                   : `<video src="${data.urls[0]}" controls style="max-width:100%;"></video>`
                document.execCommand('insertHTML', false, html)
            } else {
                document.execCommand('insertImage', false, data.urls[0])
            }
          }
        }'''
)

# Replace 'selectNewsMediaImage' else fallback
text = text.replace(
'''      if (newsImgChooserMode === 'cover') {
        form.value.cover_image = url
      } else {
        if (newsEditorMode.value === 'visual' && newsVisualEl.value) {
          newsVisualEl.value.focus()
          document.execCommand('insertImage', false, url)
        }
      }''',
'''      if (newsImgChooserMode === 'cover') {
        form.value.cover_image = url
      } else {
        if (newsEditorMode.value === 'visual' && newsVisualEl.value) {
          newsVisualEl.value.focus()
          if (url.toLowerCase().endsWith('.mp4') || url.toLowerCase().endsWith('.webm')) {
             const html = newsMediaVideoAutoplay.value 
                ? `<video src="${url}" autoplay loop muted playsinline style="max-width:100%;"></video>` 
                : `<video src="${url}" controls style="max-width:100%;"></video>`
             document.execCommand('insertHTML', false, html)
          } else {
             document.execCommand('insertImage', false, url)
          }
        }
      }'''
)

# Update form cover rendering in template
text = text.replace(
'''<img v-if="form.cover_image" :src="form.cover_image" style="max-width:140px; border-radius:4px; margin-top:8px; border:1px solid #e2e8f0;" />''', 
'''<video v-if="form.cover_image && (form.cover_image.toLowerCase().endsWith('.mp4') || form.cover_image.toLowerCase().endsWith('.webm'))" :src="form.cover_image" style="max-width:140px; border-radius:4px; margin-top:8px; border:1px solid #e2e8f0;" autoplay loop muted playsinline></video>
              <img v-else-if="form.cover_image" :src="form.cover_image" style="max-width:140px; border-radius:4px; margin-top:8px; border:1px solid #e2e8f0;" />'''
)

with io.open(filepath, 'w', encoding='utf-8') as f:
    f.write(text)
print('Updated News.vue')
