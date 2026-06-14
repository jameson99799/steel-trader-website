import io

filepath = 'src/views/admin/MediaLibrary.vue'
with io.open(filepath, 'r', encoding='utf-8') as f:
    text = f.read()

# Update upload modal input
text = text.replace('accept="image/*"', 'accept="image/*,video/mp4,video/webm"')
text = text.replace('<h3>📤 上传图片</h3>', '<h3>📤 上传图片/视频</h3>')

# Update image thumbnails to support video
# <img :src="item.filepath" :alt="item.alt || item.original_filename" loading="lazy" />
vid_tag = '''<video v-if="item.filepath.toLowerCase().endsWith('.mp4') || item.filepath.toLowerCase().endsWith('.webm')" :src="item.filepath" style="width:100%;height:100%;object-fit:cover;" preload="metadata"></video>
          <img v-else :src="item.filepath" :alt="item.alt || item.original_filename" loading="lazy" />'''
text = text.replace('''<img :src="item.filepath" :alt="item.alt || item.original_filename" loading="lazy" />''', vid_tag)

# Update detail panel to support video
# <img :src="detailItem.filepath" style="max-width:100%;border-radius:8px;margin-bottom:16px;" />
vid_detail = '''<video v-if="detailItem.filepath.toLowerCase().endsWith('.mp4') || detailItem.filepath.toLowerCase().endsWith('.webm')" :src="detailItem.filepath" controls style="max-width:100%;border-radius:8px;margin-bottom:16px;"></video>
          <img v-else :src="detailItem.filepath" style="max-width:100%;border-radius:8px;margin-bottom:16px;" />'''
text = text.replace('''<img :src="detailItem.filepath" style="max-width:100%;border-radius:8px;margin-bottom:16px;" />''', vid_detail)

with io.open(filepath, 'w', encoding='utf-8') as f:
    f.write(text)
print('Updated MediaLibrary.vue')
