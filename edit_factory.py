import io
import re

filepath = 'src/views/admin/Factory.vue'
with io.open(filepath, 'r', encoding='utf-8') as f:
    text = f.read()

# Add Video Autoplay select
text = text.replace(
'''<select v-model="mediaPickerWatermark" class="form-control" style="max-width:140px;">
                <option value="">不添加水印</option>
                <option v-for="t in watermarkTemplates" :key="t.id" :value="t.id">{{ t.name }}</option>
              </select>''',
'''<select v-model="mediaPickerWatermark" class="form-control" style="max-width:140px;">
                <option value="">不添加水印</option>
                <option v-for="t in watermarkTemplates" :key="t.id" :value="t.id">{{ t.name }}</option>
              </select>
              <select v-model="mediaPickerVideoAutoplay" class="form-control" style="max-width:130px;">
                <option :value="true">自动静音循环</option>
                <option :value="false">手动控件播放</option>
              </select>'''
)

text = text.replace(
'''const mediaPickerWatermark = ref('')''',
'''const mediaPickerWatermark = ref('')
const mediaPickerVideoAutoplay = ref(true)'''
)

# Fix doAddSelectedMedia
text = text.replace(
'''        body: JSON.stringify({
          group_id: currentGroupIdForMedia.value,
          type: 'image',
          media_url: url,
          apply_watermark: false
        })''',
'''        body: JSON.stringify({
          group_id: currentGroupIdForMedia.value,
          type: (url.toLowerCase().endsWith('.mp4') || url.toLowerCase().endsWith('.webm')) ? 'video' : 'image',
          media_url: url,
          autoplay: mediaPickerVideoAutoplay.value ? 1 : 0,
          apply_watermark: false
        })'''
)

# Fix picker grid thumbnail
text = text.replace(
'''<img :src="item.filepath" @error="item.filepath='/placeholder.png'" />''',
'''<video v-if="item.filepath && (item.filepath.toLowerCase().endsWith('.mp4') || item.filepath.toLowerCase().endsWith('.webm'))" :src="item.filepath" style="width:100%;height:100%;object-fit:cover;" preload="metadata"></video>
                <img v-else :src="item.filepath" @error="item.filepath='/placeholder.png'" />'''
)

# Fix getYoutubeThumbnail and admin render to support internal videos
text = text.replace(
'''<div v-if="item.type === 'video'" class="media-thumb-container">
                <div class="video-icon">🎥</div>
                <img :src="getYoutubeThumbnail(item.media_url)" />
                <div class="check-icon">✓</div>
              </div>''',
'''<div v-if="item.type === 'video'" class="media-thumb-container">
                <video v-if="item.media_url.toLowerCase().endsWith('.mp4') || item.media_url.toLowerCase().endsWith('.webm')" :src="item.media_url" style="width:100%;height:100%;object-fit:cover;" preload="metadata"></video>
                <template v-else>
                    <div class="video-icon">🎥</div>
                    <img :src="getYoutubeThumbnail(item.media_url)" />
                </template>
                <div class="check-icon">✓</div>
              </div>'''
)

# Admin preview
text = text.replace(
'''<div v-else-if="adminPreviewItem.type === 'video'" style="width: 100%; max-width: 800px; aspect-ratio: 16/9; background: #000; border-radius: 8px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
            <iframe :src="getYoutubeEmbedUrl(adminPreviewItem.media_url)" style="width: 100%; height: 100%; border: none;" allow="autoplay; encrypted-media" allowfullscreen></iframe>
          </div>''',
'''<div v-else-if="adminPreviewItem.type === 'video'" style="width: 100%; max-width: 800px; aspect-ratio: 16/9; background: #000; border-radius: 8px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
            <video v-if="adminPreviewItem.media_url.toLowerCase().endsWith('.mp4') || adminPreviewItem.media_url.toLowerCase().endsWith('.webm')" :src="adminPreviewItem.media_url" controls autoplay style="width:100%;height:100%;"></video>
            <iframe v-else :src="getYoutubeEmbedUrl(adminPreviewItem.media_url)" style="width: 100%; height: 100%; border: none;" allow="autoplay; encrypted-media" allowfullscreen></iframe>
          </div>'''
)

with io.open(filepath, 'w', encoding='utf-8') as f:
    f.write(text)
print('Updated Factory.vue')
