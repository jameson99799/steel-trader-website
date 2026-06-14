import io
import re

filepath = 'src/views/Factory.vue'
with io.open(filepath, 'r', encoding='utf-8') as f:
    text = f.read()

# Update the video render logic
text = text.replace(
'''<div class="youtube-container" @mouseenter="hoverVideo(video.id)" @mouseleave="leaveVideo(video.id)">
                    <div v-if="activeVideoId === video.id || video.autoplay" class="yt-iframe-wrapper">
                      <iframe v-if="iframeLoaded[video.id]" 
                        :src="getYoutubeEmbedUrl(video.media_url, true, isAutoPlaying)" 
                        width="100%" 
                        height="100%" 
                        style="border:0;" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                        allowfullscreen>
                      </iframe>
                      <!-- Fallback Mobile link -->
                      <div class="mobile-yt-link">
                        <a :href="video.media_url" target="_blank" style="color: var(--primary); text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
                          <svg viewBox="0 0 24 24" fill="currentColor" style="width: 16px; height: 16px;"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                          Watch on YouTube App (If Sign-In Fails)
                        </a>
                      </div>
                    </div>
                    <div v-else class="yt-preview" @click="activateVideo(video.id)">
                      <img v-if="getYoutubeThumbnail(video.media_url)" :src="getYoutubeThumbnail(video.media_url)" class="yt-thumbnail" />
                      <div v-else class="yt-thumbnail-fallback"></div>
                      <div class="yt-play-button">
                        <svg viewBox="0 0 68 48"><path class="yt-play-bg" d="M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,.13,34,0,34,0S12.21,.13,6.9,1.55 C3.97,2.33,2.27,4.81,1.48,7.74C0.06,13.05,0,24,0,24s0.06,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19 C12.21,47.87,34,48,34,48s21.79-0.13,27.1-1.55c2.93-0.78,4.64-3.26,5.42-6.19C67.94,34.95,68,24,68,24S67.94,13.05,66.52,7.74z" fill="#f00"></path><path d="M 45,24 27,14 27,34" fill="#fff"></path></svg>
                      </div>
                    </div>
                  </div>''',
'''<div class="youtube-container" @mouseenter="hoverVideo(video.id)" @mouseleave="leaveVideo(video.id)">
                    <template v-if="video.media_url && (video.media_url.toLowerCase().endsWith('.mp4') || video.media_url.toLowerCase().endsWith('.webm'))">
                      <video v-if="activeVideoId === video.id || video.autoplay" :src="video.media_url" :autoplay="video.autoplay === 1" :controls="video.autoplay !== 1" :muted="video.autoplay === 1" :loop="video.autoplay === 1" playsinline style="width:100%;height:100%;object-fit:cover;"></video>
                      <div v-else class="yt-preview" @click="activateVideo(video.id)">
                        <video :src="video.media_url" preload="metadata" style="width:100%;height:100%;object-fit:cover;"></video>
                        <div class="yt-play-button"><svg viewBox="0 0 68 48"><path class="yt-play-bg" d="M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,.13,34,0,34,0S12.21,.13,6.9,1.55 C3.97,2.33,2.27,4.81,1.48,7.74C0.06,13.05,0,24,0,24s0.06,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19 C12.21,47.87,34,48,34,48s21.79-0.13,27.1-1.55c2.93-0.78,4.64-3.26,5.42-6.19C67.94,34.95,68,24,68,24S67.94,13.05,66.52,7.74z" fill="#f00"></path><path d="M 45,24 27,14 27,34" fill="#fff"></path></svg></div>
                      </div>
                    </template>
                    <template v-else>
                        <div v-if="activeVideoId === video.id || video.autoplay" class="yt-iframe-wrapper">
                          <iframe v-if="iframeLoaded[video.id]" 
                            :src="getYoutubeEmbedUrl(video.media_url, true, isAutoPlaying)" 
                            width="100%" 
                            height="100%" 
                            style="border:0;" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                            allowfullscreen>
                          </iframe>
                          <!-- Fallback Mobile link -->
                          <div class="mobile-yt-link">
                            <a :href="video.media_url" target="_blank" style="color: var(--primary); text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
                              <svg viewBox="0 0 24 24" fill="currentColor" style="width: 16px; height: 16px;"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                              Watch on YouTube App (If Sign-In Fails)
                            </a>
                          </div>
                        </div>
                        <div v-else class="yt-preview" @click="activateVideo(video.id)">
                          <img v-if="getYoutubeThumbnail(video.media_url)" :src="getYoutubeThumbnail(video.media_url)" class="yt-thumbnail" />
                          <div v-else class="yt-thumbnail-fallback"></div>
                          <div class="yt-play-button">
                            <svg viewBox="0 0 68 48"><path class="yt-play-bg" d="M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,.13,34,0,34,0S12.21,.13,6.9,1.55 C3.97,2.33,2.27,4.81,1.48,7.74C0.06,13.05,0,24,0,24s0.06,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19 C12.21,47.87,34,48,34,48s21.79-0.13,27.1-1.55c2.93-0.78,4.64-3.26,5.42-6.19C67.94,34.95,68,24,68,24S67.94,13.05,66.52,7.74z" fill="#f00"></path><path d="M 45,24 27,14 27,34" fill="#fff"></path></svg>
                          </div>
                        </div>
                    </template>
                  </div>'''
)

with io.open(filepath, 'w', encoding='utf-8') as f:
    f.write(text)
print('Updated web Factory.vue')
