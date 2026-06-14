import io

with io.open('src/views/NewsDetail.vue', 'r', encoding='utf-8') as f:
    text = f.read()

target = '''  const anchor = e.target.closest('a')
  if (!anchor) return

  const href = anchor.getAttribute('href') || ''
  if (href.startsWith('mailto:') || href === '{{email}}' || (href.includes('@') && !href.includes('/') && !href.toLowerCase().startsWith('http'))) {'''

replacement = '''  const anchor = e.target.closest('a')
  if (!anchor) return

  const href = anchor.getAttribute('href') || ''
  
  if (href.startsWith('#') && href.length > 1) {
    e.preventDefault()
    const targetId = href.substring(1)
    const targetEl = document.getElementById(targetId) || document.getElementById(decodeURIComponent(targetId))
    if (targetEl) {
      const topPos = targetEl.getBoundingClientRect().top + window.scrollY - 90
      window.scrollTo({
        top: topPos,
        behavior: 'smooth'
      })
      if (history && history.replaceState) {
        history.replaceState(null, '', href)
      }
    }
    return
  }

  if (href.startsWith('mailto:') || href === '{{email}}' || (href.includes('@') && !href.includes('/') && !href.toLowerCase().startsWith('http'))) {'''

if target in text:
    with io.open('src/views/NewsDetail.vue', 'w', encoding='utf-8') as f:
        f.write(text.replace(target, replacement))
    print("Successfully replaced in NewsDetail.vue")
else:
    print("Target not found in NewsDetail.vue!!")
