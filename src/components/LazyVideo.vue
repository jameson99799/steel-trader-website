<template>
  <!--
    Lazy <video>: the src is only attached once the element approaches the
    viewport. Off-screen videos download nothing; cover videos load metadata so
    the first frame and the centered play button appear; autoplay videos start
    playing when they enter the viewport.
  -->
  <video
    ref="videoEl"
    :src="activeSrc"
    :poster="poster"
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
const videoStyle = {
  width: '100%',
  height: '100%',
  objectFit: 'contain',
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
watch(() => props.src, next => {
  failed = false
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
})
</script>
