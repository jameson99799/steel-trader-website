<template>
  <!--
    Lazy <video>: the src is only attached once the element approaches the
    viewport. Without this, every video on a page (factory gallery, product
    covers, article covers) starts downloading at page load — many concurrent
    multi-MB media requests, which on slow connections make Chrome abort the
    queued ones with net::ERR_TIMED_OUT and waste bandwidth for content the
    visitor never sees.

    - Off-screen: no src, no bytes downloaded.
    - Near viewport: cover videos load metadata (first frame), autoplay videos
      load and start playing.
    - Scrolled away: autoplay videos pause again.
    - A failed request is never retried in a loop.
  -->
  <video
    ref="videoEl"
    :src="activeSrc"
    :poster="posterUrl"
    :preload="activeSrc ? (autoplay ? 'auto' : 'metadata') : 'none'"
    :loop="loop"
    :muted="muted"
    :controls="controls"
    controlsList="nodownload"
    disablePictureInPicture
    playsinline
    :style="videoStyle"
    @error="handleError"
  ></video>
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
  // How far before entering the viewport the video starts loading.
  rootMargin: { type: String, default: '300px' }
})

const emit = defineEmits(['error'])

const videoEl = ref(null)
const activeSrc = ref('')
const posterUrl = ref(props.poster || '')
const videoStyle = {
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  background: 'linear-gradient(135deg, #0f172a, #1e293b)',
  pointerEvents: 'none'
}

let observer = null
let failed = false
let posterProbe = null
let posterGenerating = false
let posterTimer = null

function cleanupPosterProbe() {
  if (posterTimer) {
    clearTimeout(posterTimer)
    posterTimer = null
  }
  if (posterProbe) {
    try {
      posterProbe.pause()
      posterProbe.removeAttribute('src')
      posterProbe.load()
    } catch {}
    posterProbe = null
  }
  posterGenerating = false
}

// Generate a still thumbnail from the video itself when the parent did not
// provide a poster. This restores the visible "video thumbnail" for uploaded
// MP4/WebM covers without downloading the whole file: only metadata and one
// early frame are requested.
function generatePoster() {
  if (posterUrl.value || posterGenerating || !props.src || typeof document === 'undefined') return
  posterGenerating = true
  const probe = document.createElement('video')
  posterProbe = probe
  probe.preload = 'metadata'
  probe.muted = true
  probe.playsInline = true
  let done = false

  const finish = () => {
    if (done) return
    done = true
    cleanupPosterProbe()
  }

  probe.addEventListener('loadedmetadata', () => {
    const duration = Number(probe.duration)
    const target = Number.isFinite(duration) && duration > 0
      ? Math.min(0.1, duration / 2)
      : 0.1
    try {
      probe.currentTime = target
    } catch {
      finish()
    }
  })
  probe.addEventListener('seeked', () => {
    try {
      const width = probe.videoWidth || 640
      const height = probe.videoHeight || 360
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')
      if (context) {
        context.drawImage(probe, 0, 0, width, height)
        posterUrl.value = canvas.toDataURL('image/jpeg', 0.82)
      }
    } catch {}
    finish()
  })
  probe.addEventListener('error', finish)
  posterTimer = setTimeout(finish, 5000)
  probe.src = props.src
  probe.load()
}

function activate() {
  if (!props.src || activeSrc.value || failed) return
  activeSrc.value = props.src
}

// The src attribute is applied by Vue on the next tick — play() before that
// runs against a source-less element and silently fails.
function startPlayback() {
  if (!props.autoplay) return
  nextTick(() => videoEl.value?.play?.().catch(() => {}))
}

function handleError() {
  // Do not retry: a timed-out media request must not keep hammering the
  // server (and the parent keeps its cover/play-button UI in place).
  failed = true
  activeSrc.value = ''
  emit('error')
}

// A mounted, already-activated video may be pointed at a different source
// (e.g. the product gallery switching the selected media).
watch(() => props.poster, next => {
  if (next) posterUrl.value = next
})

watch(() => props.src, next => {
  failed = false
  cleanupPosterProbe()
  posterUrl.value = props.poster || ''
  if (!next) {
    activeSrc.value = ''
    return
  }
  if (activeSrc.value) {
    activeSrc.value = next
    startPlayback()
    if (!props.poster) generatePoster()
  }
})

onMounted(() => {
  const el = videoEl.value
  if (!el || !props.src) return
  if (typeof IntersectionObserver === 'undefined') {
    generatePoster()
    activate()
    startPlayback()
    return
  }
  observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        if (!posterUrl.value) generatePoster()
        activate()
        startPlayback()
      } else if (props.autoplay && !el.paused) {
        el.pause()
      }
    }
  }, { rootMargin: props.rootMargin })
  observer.observe(el)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
  cleanupPosterProbe()
})
</script>
