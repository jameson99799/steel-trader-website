import io

with io.open('src/router/index.js', 'r', encoding='utf-8') as f:
    text = f.read()

target = '''    scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    return new Promise((resolve) => {
      // Delay scrolling until after browser paints to prevent Forced Synchronous Layout
      setTimeout(() => {
        resolve({ top: 0 })
      }, 10) // 10ms is enough to let the rendering pipeline flush
    })
  }'''

insert = '''    scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    if (to.hash) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const id = to.hash.slice(1);
          const el = document.getElementById(id) || document.getElementById(decodeURIComponent(id));
          if (el) {
            resolve({
              el: to.hash,
              top: 90,
              behavior: 'smooth'
            })
          } else {
            resolve({ top: 0 })
          }
        }, 50) 
      })
    }
    return new Promise((resolve) => {
      // Delay scrolling until after browser paints to prevent Forced Synchronous Layout
      setTimeout(() => {
        resolve({ top: 0 })
      }, 10) // 10ms is enough to let the rendering pipeline flush
    })
  }'''

text = text.replace(target, insert)

with io.open('src/router/index.js', 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated Vue Router scrollBehavior!")
