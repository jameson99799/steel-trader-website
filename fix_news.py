import re

path = 'src/views/NewsDetail.vue'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

new_logic = '''const sanitizedContent = computed(() => {
    const raw = localizedHtml(article.value, 'content') || ''
    if (!raw) return ''
    let html = resolveTemplateVars(raw)
    html = formatMailtoLinks(html)
    
    html = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    html = html.replace(/<span\s+class=["'](?:hero-tip|replace-tip)["'][^>]*>.*?<\/span>/gi, '')
    
    // Extract <style> tags and scope them to .article-body-direct
    html = html.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (match, css) => {
      const scoped = css.replace(/([^{}]+)\{/g, (m, selector) => {
        const trimmed = selector.trim()
        if (!trimmed || trimmed.startsWith('@') || trimmed.startsWith('from') || trimmed.startsWith('to') || /^\d+%/.test(trimmed)) return m
        const scopedSelectors = trimmed.split(',').map(s => {
          s = s.trim()
          if (s.startsWith('.article-body-direct') || s === 'body' || s === 'html' || s === '*') return s
          return '.article-body-direct ' + s
        }).join(', ')
        return scopedSelectors + ' {'
      })
      return `<style>${scoped}</style>`
    })

    // Strip raw full-page HTML tags that might leak from AI generated content
    html = html.replace(/<!DOCTYPE[^>]*>/gi, '')
    html = html.replace(/<html[^>]*>/gi, '').replace(/<\/html>/gi, '')
    html = html.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, (match) => {
      // Keep <style> tags from head
      const styles = match.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || []
      return styles.join('')
    })
    html = html.replace(/<body[^>]*>/gi, '').replace(/<\/body>/gi, '')
    html = html.replace(/<meta[^>]*>/gi, '')
    html = html.replace(/<title[^>]*>[\s\S]*?<\/title>/gi, '')

    return html
  })'''

old_logic_pattern = r"const sanitizedContent = computed\(\(\) => \{[^}]*return html\s*\.replace\([^\}]*\}\)"

replaced = re.sub(old_logic_pattern, new_logic, content, flags=re.DOTALL)
if replaced != content:
    with open(path, 'w', encoding='utf-8') as f:
        f.write(replaced)
    print("Replaced successfully.")
else:
    print("No match found!")
