import { watchEffect } from 'vue'

export function useTitle(title) {
  watchEffect(() => {
    document.title = typeof title === 'function' ? title() : title.value || title
  })
}
