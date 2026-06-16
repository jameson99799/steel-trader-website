import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('src/views/About.vue', 'r', encoding='utf-8') as f:
    content = f.read()

# ============================================================
# 1. Replace image lightbox with Factory-style (no changes to structure,
#    but add bottom-bar with close button for single image)
# ============================================================
old_image_lightbox = """    <!-- Image Lightbox -->
    <div class="lightbox" :class="{ 'active': imageLightboxActive }" @click="closeImageLightbox">
      <div class="lightbox-top-bar" @click.stop v-if="imageLightboxActive">
        <div class="lightbox-center-controls">
          <div class="lightbox-title">{{ localizedValue(company, 'name') }}</div>
        </div>
        <button class="lightbox-close" @click="closeImageLightbox">&times;</button>
      </div>

      <div class="lightbox-content" @click.stop v-if="imageLightboxActive">
        <img :src="company.about_image" @click="closeImageLightbox" />
      </div>
    </div>"""

new_image_lightbox = """    <!-- Image Lightbox (Factory-style) -->
    <div class="lightbox" :class="{ 'active': imageLightboxActive }" @click="closeImageLightbox">
      <div class="lightbox-top-bar" @click.stop v-if="imageLightboxActive">
        <div class="lightbox-center-controls">
          <div class="lightbox-title">{{ localizedValue(company, 'name') }}</div>
        </div>
        <button class="lightbox-close" @click="closeImageLightbox">&times;</button>
      </div>

      <div class="lightbox-content" @click.stop v-if="imageLightboxActive">
        <img :src="company.about_image" @click="closeImageLightbox" />
      </div>

      <div class="lightbox-bottom-bar" @click.stop v-if="imageLightboxActive">
        <button class="lightbox-bottom-nav" @click="closeImageLightbox">&times;</button>
      </div>
    </div>"""

if old_image_lightbox in content:
    content = content.replace(old_image_lightbox, new_image_lightbox)
    print("Image lightbox updated")
else:
    print("Image lightbox not found exactly")

# ============================================================
# 2. Replace intro-image v-else-if block to add zoom overlay + cursor
# ============================================================
old_intro_image = """            <div class="intro-image" v-else-if="company?.about_image">
              <img :src="company.about_image" :alt="localizedValue(company, 'name')" @click="openImageLightbox" style="cursor: zoom-in;" />
              <div class="image-overlay">
                <div class="overlay-content">
                  <h3>{{ localizedValue(company, 'name') }}</h3>
                  <p>{{ localizedValue(pageTexts, 'about_overlay_text') }}</p>
                </div>
              </div>
            </div>"""

new_intro_image = """            <div class="intro-image about-clickable-image" v-else-if="company?.about_image" @click="openImageLightbox">
              <img :src="company.about_image" :alt="localizedValue(company, 'name')" />
              <div class="image-overlay">
                <div class="overlay-content">
                  <h3>{{ localizedValue(company, 'name') }}</h3>
                  <p>{{ localizedValue(pageTexts, 'about_overlay_text') }}</p>
                </div>
              </div>
              <div class="image-overlay-hover">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
              </div>
            </div>"""

if old_intro_image in content:
    content = content.replace(old_intro_image, new_intro_image)
    print("intro-image updated")
else:
    print("intro-image not found exactly")

# ============================================================
# 3. Fix YouTube iframe in video lightbox to use aspect-ratio
# ============================================================
old_yt_iframe = 'style="width:100%;height:80vh;max-width:1100px;border:none;border-radius:8px;box-shadow: 0 10px 30px rgba(0,0,0,0.5);"'
new_yt_iframe = 'style="width:100%;aspect-ratio:16/9;max-height:85vh;height:auto;max-width:1100px;border:none;border-radius:8px;box-shadow: 0 10px 30px rgba(0,0,0,0.5);"'

if old_yt_iframe in content:
    content = content.replace(old_yt_iframe, new_yt_iframe)
    print("YouTube iframe fixed with aspect-ratio")
elif 'aspect-ratio:16/9' in content:
    print("aspect-ratio already applied")
else:
    print("YouTube iframe style not found")

# ============================================================
# 4. Replace old lightbox mobile CSS with Factory-style (side buttons on mobile)
#    AND add missing bottom-bar + bottom-nav + zoom hover CSS
# ============================================================
old_lightbox_mobile_css = """@media (max-width: 768px) {
  .lightbox-top-bar { padding: 0; height: 60px; }
  .lightbox-center-controls { padding: 0 60px; }
  .lightbox-title { font-size: 24px; }
  .lightbox-close { right: 10px; font-size: 36px; z-index: 20; }
  .lightbox-content { padding: 60px 10px; }
}"""

new_lightbox_css = """.lightbox-bottom-bar {
  position: absolute;
  bottom: 20px;
  left: 0;
  width: 100%;
  height: auto;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 80px;
  z-index: 1000;
  padding-bottom: env(safe-area-inset-bottom);
}

.lightbox-bottom-nav {
  background: rgba(0, 0, 0, 0.7);
  border: 2px solid rgba(255, 255, 255, 0.6);
  color: white;
  font-size: 32px;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
}

.lightbox-bottom-nav:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.about-clickable-image {
  cursor: zoom-in;
  position: relative;
}

.image-overlay-hover {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 2;
  pointer-events: none;
}

.about-clickable-image:hover .image-overlay-hover {
  opacity: 1;
}

.image-overlay-hover svg {
  width: 48px;
  height: 48px;
  color: var(--white);
}

@media (max-width: 768px) {
  .lightbox-top-bar { padding: 0; height: 60px; }
  .lightbox-center-controls { padding: 0 60px; }
  .lightbox-title { font-size: 24px; }
  .lightbox-close { right: 10px; font-size: 36px; z-index: 20; }
  .lightbox-content { padding: 60px 10px; }
  .lightbox-bottom-bar { bottom: 30px; }
}"""

if old_lightbox_mobile_css in content:
    content = content.replace(old_lightbox_mobile_css, new_lightbox_css)
    print("Lightbox CSS updated with bottom-bar and mobile styles")
else:
    if '.lightbox-bottom-bar' not in content:
        content = content.replace('</style>', new_lightbox_css + '\n</style>')
        print("Appended new lightbox CSS")
    else:
        print("Lightbox CSS partially present already")

with open('src/views/About.vue', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done!")
