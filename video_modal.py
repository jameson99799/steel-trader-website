import sys

with open('src/views/Factory.vue', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update the video loop
video_loop_old = """                  <template v-if="video.media_url && (video.media_url.toLowerCase().endsWith('.mp4') || video.media_url.toLowerCase().endsWith('.webm'))">
                    <video v-if="activeVideoId === video.id || video.autoplay" :src="video.media_url" :autoplay="video.autoplay === 1" :controls="video.autoplay !== 1" :muted="video.autoplay === 1" :loop="video.autoplay === 1" playsinline style="width:100%;height:100%;object-fit:contain;background-color:#000;"></video>
                    <div v-else class="yt-video-cover" @click="playVideo(video.id)">
                      <video :src="video.media_url" preload="metadata" style="width:100%;height:100%;object-fit:contain;background-color:#000;"></video>
                      <div class="yt-play-button"><svg viewBox="0 0 68 48"><path class="yt-play-bg" d="M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,.13,34,0,34,0S12.21,.13,6.9,1.55 C3.97,2.33,2.27,4.81,1.48,7.74C0.06,13.05,0,24,0,24s0.06,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19 C12.21,47.87,34,48,34,48s21.79-0.13,27.1-1.55c2.93-0.78,4.64-3.26,5.42-6.19C67.94,34.95,68,24,68,24S67.94,13.05,66.52,7.74z" fill="#f00"></path><path d="M 45,24 27,14 27,34" fill="#fff"></path></svg></div>
                    </div>
                  </template>
                  <template v-else>
                    <div v-if="activeVideoId === video.id" class="yt-video-active">
                      <iframe 
                        :src="getYoutubeEmbedUrl(video.media_url, true, isAutoPlaying)" 
                        width="100%" 
                        height="100%" 
                        style="border:0;" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                        allowfullscreen>
                      </iframe>
                      <div style="text-align: right; margin-top: 8px; font-size: 13px;">
                        <a :href="video.media_url" target="_blank" style="color: var(--primary); text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
                          <svg viewBox="0 0 24 24" fill="currentColor" style="width: 16px; height: 16px;"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                          Watch on YouTube App (If Sign-In Fails)
                        </a>
                      </div>
                    </div>
                    <div v-else class="yt-video-cover" @click="playVideo(video.id)">
                      <img v-if="getYoutubeThumbnail(video.media_url)" :src="getYoutubeThumbnail(video.media_url)" class="yt-thumbnail" />
                      <div v-else class="yt-thumbnail-fallback"></div>
                      <div class="yt-play-button">
                        <svg viewBox="0 0 68 48"><path class="yt-play-bg" d="M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,.13,34,0,34,0S12.21,.13,6.9,1.55 C3.97,2.33,2.27,4.81,1.48,7.74C0.06,13.05,0,24,0,24s0.06,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19 C12.21,47.87,34,48,34,48s21.79-0.13,27.1-1.55c2.93-0.78,4.64-3.26,5.42-6.19C67.94,34.95,68,24,68,24S67.94,13.05,66.52,7.74z" fill="#f00"></path><path d="M 45,24 27,14 27,34" fill="#fff"></path></svg>
                      </div>
                    </div>
                  </template>"""

video_loop_new = """                  <template v-if="video.media_url && (video.media_url.toLowerCase().endsWith('.mp4') || video.media_url.toLowerCase().endsWith('.webm'))">
                    <video v-if="video.autoplay === 1" :src="video.media_url" autoplay controls muted loop playsinline style="width:100%;height:100%;object-fit:contain;background-color:#000;"></video>
                    <div v-else class="yt-video-cover" @click="openVideoLightbox(video)">
                      <video :src="video.media_url" preload="metadata" style="width:100%;height:100%;object-fit:contain;background-color:#000;pointer-events:none;"></video>
                      <div class="yt-play-button"><svg viewBox="0 0 68 48"><path class="yt-play-bg" d="M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,.13,34,0,34,0S12.21,.13,6.9,1.55 C3.97,2.33,2.27,4.81,1.48,7.74C0.06,13.05,0,24,0,24s0.06,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19 C12.21,47.87,34,48,34,48s21.79-0.13,27.1-1.55c2.93-0.78,4.64-3.26,5.42-6.19C67.94,34.95,68,24,68,24S67.94,13.05,66.52,7.74z" fill="#f00"></path><path d="M 45,24 27,14 27,34" fill="#fff"></path></svg></div>
                    </div>
                  </template>
                  <template v-else>
                    <div v-if="video.autoplay === 1" class="yt-video-active">
                      <iframe 
                        :src="getYoutubeEmbedUrl(video.media_url, true, true)" 
                        width="100%" 
                        height="100%" 
                        style="border:0;" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                        allowfullscreen>
                      </iframe>
                    </div>
                    <div v-else class="yt-video-cover" @click="openVideoLightbox(video)">
                      <img v-if="getYoutubeThumbnail(video.media_url)" :src="getYoutubeThumbnail(video.media_url)" class="yt-thumbnail" />
                      <div v-else class="yt-thumbnail-fallback"></div>
                      <div class="yt-play-button">
                        <svg viewBox="0 0 68 48"><path class="yt-play-bg" d="M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,.13,34,0,34,0S12.21,.13,6.9,1.55 C3.97,2.33,2.27,4.81,1.48,7.74C0.06,13.05,0,24,0,24s0.06,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19 C12.21,47.87,34,48,34,48s21.79-0.13,27.1-1.55c2.93-0.78,4.64-3.26,5.42-6.19C67.94,34.95,68,24,68,24S67.94,13.05,66.52,7.74z" fill="#f00"></path><path d="M 45,24 27,14 27,34" fill="#fff"></path></svg>
                      </div>
                    </div>
                  </template>"""

content = content.replace(video_loop_old, video_loop_new)

# 2. Add Video Lightbox HTML below Image Lightbox
lightbox_old = """    <div class="lightbox" :class="{ 'active': lightboxActive }" @click="closeLightbox">"""
lightbox_new = """    <!-- Video Lightbox -->
    <div class="video-lightbox" :class="{ 'active': videoLightboxActive }" @click.self="closeVideoLightbox">
      <div class="video-lightbox-top-bar" @click.stop v-if="videoLightboxActive">
        <button class="video-lightbox-close" @click="closeVideoLightbox">&times;</button>
      </div>
      <div class="video-lightbox-content" @click.stop v-if="videoLightboxActive">
        <video v-if="videoLightboxIsMp4" :src="videoLightboxUrl" controls autoplay style="width:100%;max-height:85vh;object-fit:contain;border-radius:8px;box-shadow: 0 10px 30px rgba(0,0,0,0.5);"></video>
        <iframe v-else :src="getYoutubeEmbedUrl(videoLightboxUrl, true, false)" style="width:100%;height:80vh;max-width:1100px;border:none;border-radius:8px;box-shadow: 0 10px 30px rgba(0,0,0,0.5);" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>
      </div>
    </div>

    <!-- Image Lightbox -->
    <div class="lightbox" :class="{ 'active': lightboxActive }" @click="closeLightbox">"""

content = content.replace(lightbox_old, lightbox_new)


# 3. Add script variables
script_vars_old = """const carousels = {} // track intervals

const activeVideoId = ref(null)
const isAutoPlaying = ref(false)

const playVideo = (id) => {
  activeVideoId.value = id
  isAutoPlaying.value = false // manual click, so not auto-playing on load
}"""

script_vars_new = """const carousels = {} // track intervals

const videoLightboxActive = ref(false)
const videoLightboxUrl = ref('')
const videoLightboxIsMp4 = ref(false)

const openVideoLightbox = (video) => {
  videoLightboxUrl.value = video.media_url
  videoLightboxIsMp4.value = video.media_url.toLowerCase().endsWith('.mp4') || video.media_url.toLowerCase().endsWith('.webm')
  videoLightboxActive.value = true
}

const closeVideoLightbox = () => {
  videoLightboxActive.value = false
  setTimeout(() => {
    videoLightboxUrl.value = ''
  }, 300)
}"""

content = content.replace(script_vars_old, script_vars_new)

# 4. Remove activeVideoId loops in loadData
loaddata_old = """    // Automatically play the first video marked as autoplay
    for (const group of data) {
      const autoVideo = group.items?.find(item => item.type === 'video' && item.autoplay === 1)
      if (autoVideo) {
        activeVideoId.value = autoVideo.id
        isAutoPlaying.value = true // set flag so we can mute it
        break
      }
    }"""
loaddata_new = """"""

content = content.replace(loaddata_old, loaddata_new)

# 5. Fix YouTube Embed Url logic for simpler iframe
yt_logic_old = """  } else if (url.includes('youtube.com/embed/')) {
    videoId = url.split('embed/')[1];
    const questionPosition = videoId.indexOf('?');
    if(questionPosition !== -1) videoId = videoId.substring(0, questionPosition);
  } else {
    return url + (url.includes('?') ? '&' : '?') + (autoplay ? `autoplay=1${mute ? '&mute=1' : ''}&` : '') + 'enablejsapi=1&playsinline=1&vq=hd1080';
  }
  return `https://www.youtube.com/embed/${videoId}?vq=hd1080&enablejsapi=1&playsinline=1${autoplay ? `&autoplay=1${mute ? '&mute=1' : ''}` : ''}`;"""
  
yt_logic_new = """  } else if (url.includes('youtube.com/embed/')) {
    videoId = url.split('embed/')[1];
    const questionPosition = videoId.indexOf('?');
    if(questionPosition !== -1) videoId = videoId.substring(0, questionPosition);
  } else {
    return url;
  }
  return `https://www.youtube.com/embed/${videoId}?rel=0${autoplay ? `&autoplay=1${mute ? '&mute=1' : ''}` : ''}`;"""

content = content.replace(yt_logic_old, yt_logic_new)

# 6. Add CSS
css_old = """.lightbox.active {
  opacity: 1;
  pointer-events: auto;
}"""
css_new = """.lightbox.active {
  opacity: 1;
  pointer-events: auto;
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
}"""

content = content.replace(css_old, css_new)

with open('src/views/Factory.vue', 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated Factory.vue")
