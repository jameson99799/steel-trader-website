<template>
  <!--
    Lazy <video>: by default the src is attached once the element approaches
    the viewport. Use eager for above-the-fold covers so paused covers paint
    their first frame immediately and autoplay videos are ready to start as
    soon as they enter the viewport. Off-screen autoplay videos only fetch
    metadata, so a page with several large videos does not download them all.
  -->
  <div class="lazy-video-shell">
    <video
      ref="videoEl"
      :src="activeSrc"
      :poster="poster"
      :preload="activeSrc ? (autoplay && wantsPlayback ? 'auto' : 'metadata') : 'none'"
      :loop="loop"
      :muted="muted"
      :controls="controls"
      controlsList="nodownload"
      disablePictureInPicture
      playsinline
      :style="videoStyle"
      @error="handleError"
      @playing="isPlaying = true"
      @pause="isPlaying = false"
      @loadedmetadata="handleLoadedMetadata"
    ></video>
    <button
      v-if="showPlayButton && !isPlaying"
      type="button"
      class="lazy-video-play"
      aria-label="Play video"
      @click.stop="emit('open')"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 5v14l11-7z" fill="currentColor"></path>
      </svg>
    </button>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  src: { type: String, default: '' },
  autoplay: { type: Boolean, default: false },
  loop: { type: Boolean, default: true },
  muted: { type: Boolean, default: true },
  controls: { type: Boolean, default: false },
  poster: { type: String, default: '' },
  // Attach the source immediately instead of waiting for the viewport.
  eager: { type: Boolean, default: false },
  // Show a centered play button while an autoplay video is not playing.
  showPlayButton: { type: Boolean, default: false },
  // How far before entering the viewport the video starts loading.
  rootMargin: { type: String, default: '300px' }
})

const emit = defineEmits(['error', 'open'])

const videoEl = ref(null)
const activeSrc = ref('')
const isPlaying = ref(false)
const wantsPlayback = ref(false)
const videoStyle = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  background: 'linear-gradient(135deg, #0f172a, #1e293b)',
  pointerEvents: 'none'
}

let observer = null
let failed = false

function activate() {
  if (!props.src || activeSrc.value || failed) return
  activeSrc.value = props.src
}

// The src attribute is applied by Vue on the next tick — play() before that
// runs against a source-less element and silently fails.
function startPlayback() {
  if (!props.autoplay) return
  wantsPlayback.value = true
  nextTick(() => videoEl.value?.play?.().catch(() => {}))
}

function handleError() {
  // Do not retry: a timed-out media request must not keep hammering the
  // server (and the parent keeps its cover/play-button UI in place).
  failed = true
  isPlaying.value = false
  wantsPlayback.value = false
  activeSrc.value = ''
  emit('error')
}

// Force the browser to decode and paint an early frame for paused cover
// videos. With metadata-only preload some browsers keep the element black
// until playback starts; seeking to 0.1s makes the video visible as a video.
function handleLoadedMetadata() {
  const el = videoEl.value
  if (!el || props.autoplay || el.currentTime > 0) return
  const duration = Number(el.duration)
  try {
    el.currentTime = Number.isFinite(duration) && duration > 0
      ? Math.min(0.1, duration / 2)
      : 0.1
  } catch {}
}

// A mounted, already-activated video may be pointed at a different source
// (e.g. the product gallery switching the selected media).
watch(() => props.src, next => {
  failed = false
  isPlaying.value = false
  wantsPlayback.value = false
  if (!next) {
    activeSrc.value = ''
    return
  }
  if (activeSrc.value) {
    activeSrc.value = next
    startPlayback()
  }
})

onMounted(() => {
  const el = videoEl.value
  if (!el || !props.src) return
  if (props.eager) activate()
  if (typeof IntersectionObserver === 'undefined') {
    activate()
    startPlayback()
    return
  }
  observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        activate()
        startPlayback()
      } else if (props.autoplay) {
        wantsPlayback.value = false
        if (!el.paused) el.pause()
      }
    }
  }, { rootMargin: props.rootMargin })
  observer.observe(el)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
  if (!videoEl.value?.paused) videoEl.value?.pause?.()
})
</script>

<style scoped>
.lazy-video-shell {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #0f172a;
}

.lazy-video-play {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 64px;
  height: 64px;
  border: none;
  border-radius: 50%;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.62);
  color: #fff;
  cursor: pointer;
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.32);
  backdrop-filter: blur(2px);
  transition: transform 0.2s ease, background 0.2s ease;
  z-index: 2;
}

.lazy-video-play:hover {
  transform: scale(1.06);
  background: rgba(37, 99, 235, 0.92);
}

.lazy-video-play svg {
  width: 30px;
  height: 30px;
  margin-left: 2px;
}
</style>
