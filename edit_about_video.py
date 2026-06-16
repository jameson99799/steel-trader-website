import sys

with open('src/views/About.vue', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace the wrapper in About.vue
wrapper_old = """            <div class="intro-image" v-if="company?.company_video_embed && company?.about_show_video">
              <iframe 
                :src="getYoutubeEmbedUrl(company.company_video_embed, company.about_video_autoplay)" 
                width="100%" 
                height="500" 
                style="border:0; border-radius:var(--radius-lg); box-shadow:var(--shadow-lg); margin-bottom: 8px;" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                referrerpolicy="strict-origin-when-cross-origin"
                allowfullscreen>
              </iframe>
              <div style="text-align: right; font-size: 13px;">
                <a :href="company.company_video_embed" target="_blank" style="color: var(--primary); text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
                  <svg viewBox="0 0 24 24" fill="currentColor" style="width: 16px; height: 16px;"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                  Watch on YouTube App
                </a>
              </div>
            </div>"""

wrapper_new = """            <!-- Modern Video Component -->
            <div class="intro-image" v-if="company?.company_video_embed && company?.about_show_video">
              <template v-if="company.company_video_embed.toLowerCase().endsWith('.mp4') || company.company_video_embed.toLowerCase().endsWith('.webm')">
                <div class="yt-video-active" v-if="company.about_video_autoplay === 1" @click="openVideoLightbox(company.company_video_embed)" style="cursor: pointer;">
                  <video :src="company.company_video_embed" autoplay controlsList="nodownload" disablePictureInPicture muted loop playsinline style="width:100%;height:100%;object-fit:contain;background-color:#000;pointer-events:none;"></video>
                </div>
                <div v-else class="yt-video-cover" @click="openVideoLightbox(company.company_video_embed)">
                  <video :src="company.company_video_embed" preload="metadata" style="width:100%;height:100%;object-fit:contain;background-color:#000;pointer-events:none;"></video>
                  <div class="yt-play-button"><svg viewBox="0 0 68 48"><path class="yt-play-bg" d="M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,.13,34,0,34,0S12.21,.13,6.9,1.55 C3.97,2.33,2.27,4.81,1.48,7.74C0.06,13.05,0,24,0,24s0.06,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19 C12.21,47.87,34,48,34,48s21.79-0.13,27.1-1.55c2.93-0.78,4.64-3.26,5.42-6.19C67.94,34.95,68,24,68,24S67.94,13.05,66.52,7.74z" fill="#f00"></path><path d="M 45,24 27,14 27,34" fill="#fff"></path></svg></div>
                </div>
              </template>
              <template v-else>
                <div v-if="company.about_video_autoplay === 1" class="yt-video-active" @click="openVideoLightbox(company.company_video_embed)" style="cursor: pointer;">
                  <iframe 
                    :src="getYoutubeEmbedUrl(company.company_video_embed, true, true)" 
                    style="width:100%;height:100%;border:none;pointer-events:none;" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                    allowfullscreen>
                  </iframe>
                </div>
                <div v-else class="yt-video-cover" @click="openVideoLightbox(company.company_video_embed)">
                  <img v-if="getYoutubeThumbnail(company.company_video_embed)" :src="getYoutubeThumbnail(company.company_video_embed)" class="yt-thumbnail" />
                  <div v-else class="yt-thumbnail-fallback"></div>
                  <div class="yt-play-button">
                    <svg viewBox="0 0 68 48"><path class="yt-play-bg" d="M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,.13,34,0,34,0S12.21,.13,6.9,1.55 C3.97,2.33,2.27,4.81,1.48,7.74C0.06,13.05,0,24,0,24s0.06,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19 C12.21,47.87,34,48,34,48s21.79-0.13,27.1-1.55c2.93-0.78,4.64-3.26,5.42-6.19C67.94,34.95,68,24,68,24S67.94,13.05,66.52,7.74z" fill="#f00"></path><path d="M 45,24 27,14 27,34" fill="#fff"></path></svg>
                  </div>
                </div>
              </template>
            </div>"""

if wrapper_old in content:
    content = content.replace(wrapper_old, wrapper_new)
else:
    print("Warning: wrapper_old not found!")


# 2. Add Lightbox HTML before </template>
lightbox_html = """
    <!-- Video Lightbox -->
    <div class="video-lightbox" :class="{ 'active': videoLightboxActive }" @click.self="closeVideoLightbox">
      <div class="video-lightbox-top-bar" @click.stop v-if="videoLightboxActive">
        <button class="video-lightbox-close" @click="closeVideoLightbox">&times;</button>
      </div>
      <div class="video-lightbox-content" @click.stop v-if="videoLightboxActive">
        <video v-if="videoLightboxIsMp4" :src="videoLightboxUrl" controls controlsList="nodownload" disablePictureInPicture autoplay style="width:100%;max-height:85vh;object-fit:contain;border-radius:8px;box-shadow: 0 10px 30px rgba(0,0,0,0.5);"></video>
        <div v-else style="width:100%; display:flex; flex-direction:column; align-items:center;">
          <iframe :src="getYoutubeEmbedUrl(videoLightboxUrl, true, false)" style="width:100%;height:80vh;max-width:1100px;border:none;border-radius:8px;box-shadow: 0 10px 30px rgba(0,0,0,0.5);" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
        </div>
      </div>
    </div>
  </div>
</template>"""

if "  </div>\n</template>" in content:
    content = content.replace("  </div>\n</template>", lightbox_html)
else:
    print("Warning: </template> not found!")

# 3. Add Script Logic right inside <script setup> (below pageTexts)
script_logic = """
const videoLightboxActive = ref(false)
const videoLightboxUrl = ref('')
const videoLightboxIsMp4 = ref(false)

const openVideoLightbox = (url) => {
  videoLightboxUrl.value = url
  videoLightboxIsMp4.value = url.toLowerCase().endsWith('.mp4') || url.toLowerCase().endsWith('.webm')
  videoLightboxActive.value = true
}

const closeVideoLightbox = () => {
  videoLightboxActive.value = false
  setTimeout(() => {
    videoLightboxUrl.value = ''
  }, 300)
}

const getYoutubeThumbnail = (url) => {
  if (!url) return '';
  let videoId = '';
  if (url.includes('youtube.com/watch?v=')) {
    videoId = url.split('v=')[1];
    const ampersandPosition = videoId.indexOf('&');
    if(ampersandPosition !== -1) videoId = videoId.substring(0, ampersandPosition);
  } else if (url.includes('youtube.com/shorts/')) {
    videoId = url.split('shorts/')[1];
    const questionPosition = videoId.indexOf('?');
    if(questionPosition !== -1) videoId = videoId.substring(0, questionPosition);
  } else if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1];
    const questionPosition = videoId.indexOf('?');
    if(questionPosition !== -1) videoId = videoId.substring(0, questionPosition);
  } else if (url.includes('youtube.com/embed/')) {
    videoId = url.split('embed/')[1];
    const questionPosition = videoId.indexOf('?');
    if(questionPosition !== -1) videoId = videoId.substring(0, questionPosition);
  } else {
    return '';
  }
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}
"""

if "const company = ref({})" in content:
    content = content.replace("const company = ref({})", "const company = ref({})\n" + script_logic)

# Replace old getYoutubeEmbedUrl with the fully featured one from Factory.vue
old_yt_func="""const getYoutubeEmbedUrl = (url, autoplay) => {
  if (!url) return '';
  let videoId = '';
  if (url.includes('youtube.com/watch?v=')) {
    videoId = url.split('v=')[1];
    const ampersandPosition = videoId.indexOf('&');
    if(ampersandPosition !== -1) videoId = videoId.substring(0, ampersandPosition);
  } else if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1];
    const questionPosition = videoId.indexOf('?');
    if(questionPosition !== -1) videoId = videoId.substring(0, questionPosition);
  } else if (url.includes('youtube.com/embed/')) {
    videoId = url.split('embed/')[1];
    const questionPosition = videoId.indexOf('?');
    if(questionPosition !== -1) videoId = videoId.substring(0, questionPosition);
  } else {
    return url + (autoplay ? '?autoplay=1&mute=1' : '');
  }
  return `https://www.youtube.com/embed/${videoId}?vq=hd1080${autoplay ? '&autoplay=1&mute=1' : ''}`;
}"""

new_yt_func="""const getYoutubeEmbedUrl = (url, autoplay, mute = false) => {
  if (!url) return '';
  let videoId = '';
  if (url.includes('youtube.com/watch?v=')) {
    videoId = url.split('v=')[1];
    const ampersandPosition = videoId.indexOf('&');
    if(ampersandPosition !== -1) videoId = videoId.substring(0, ampersandPosition);
  } else if (url.includes('youtube.com/shorts/')) {
    videoId = url.split('shorts/')[1];
    const questionPosition = videoId.indexOf('?');
    if(questionPosition !== -1) videoId = videoId.substring(0, questionPosition);
  } else if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1];
    const questionPosition = videoId.indexOf('?');
    if(questionPosition !== -1) videoId = videoId.substring(0, questionPosition);
  } else if (url.includes('youtube.com/embed/')) {
    videoId = url.split('embed/')[1];
    const questionPosition = videoId.indexOf('?');
    if(questionPosition !== -1) videoId = videoId.substring(0, questionPosition);
  } else {
    return url + (url.includes('?') ? '&' : '?') + (autoplay ? `autoplay=1${mute ? '&mute=1' : ''}&` : '') + 'enablejsapi=1&playsinline=1&vq=hd1080';
  }
  return `https://www.youtube.com/embed/${videoId}?vq=hd1080&enablejsapi=1&playsinline=1${autoplay ? `&autoplay=1${mute ? '&mute=1' : ''}` : ''}`;
}"""

if old_yt_func in content:
    content = content.replace(old_yt_func, new_yt_func)
else:
    print("Warning: old yt func not found exactly.")


# 4. Add CSS styles
css_styles = """
/* Video Cover System */
.yt-video-active, .yt-video-cover {
  width: 100%;
  height: 500px;
  position: relative;
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-lg);
  background: #000;
}

@media (max-width: 768px) {
  .yt-video-active, .yt-video-cover {
    height: 300px;
  }
}

.yt-video-cover {
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.yt-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.8;
  transition: opacity 0.3s;
}

.yt-video-cover:hover .yt-thumbnail {
  opacity: 1;
}

.yt-thumbnail-fallback {
  width: 100%;
  height: 100%;
  background: #222;
}

.yt-play-button {
  position: absolute;
  width: 68px;
  height: 48px;
  transition: transform 0.2s;
  z-index: 2;
}

.yt-video-cover:hover .yt-play-button {
  transform: scale(1.1);
}

.yt-play-bg {
  transition: fill 0.2s;
}

.yt-video-cover:hover .yt-play-bg {
  fill: #ff0000;
}

/* Video Lightbox */
.video-lightbox {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
  backdrop-filter: blur(5px);
}
.video-lightbox.active {
  opacity: 1;
  pointer-events: auto;
}
.video-lightbox-top-bar {
  position: absolute;
  top: 0;
  right: 0;
  padding: 20px;
  z-index: 10001;
}
.video-lightbox-close {
  background: none;
  border: none;
  color: white;
  font-size: 40px;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s;
}
.video-lightbox-close:hover {
  opacity: 1;
}
.video-lightbox-content {
  width: 100%;
  max-width: 1200px;
  padding: 0 20px;
  display: flex;
  justify-content: center;
  align-items: center;
}
"""

if "/* Video Cover System */" not in content:
    content = content.replace("</style>", css_styles + "\n</style>")

with open('src/views/About.vue', 'w', encoding='utf-8') as f:
    f.write(content)

print("About.vue updated successfully!")
