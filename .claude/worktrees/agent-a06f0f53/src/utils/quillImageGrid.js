/**
 * Quill Image Grid — adds 2/3/4-column grid layout buttons to Quill toolbar.
 * Usage:
 *   1. Add ['image-grid-2','image-grid-3','image-grid-4'] to toolbar container config
 *   2. After `new Quill(...)`, call `setupImageGrid(quill)`
 *   3. Call `injectGridStyles()` once to add CSS
 */

/**
 * Set up image grid buttons after Quill is created.
 * Registers click handlers on the actual toolbar button DOM elements.
 */
export function setupImageGrid(quill) {
  if (!quill) return
  const toolbar = quill.getModule('toolbar')
  if (!toolbar || !toolbar.container) return

  // Find buttons by class name and bind click handlers
  const btns2 = toolbar.container.querySelector('.ql-image-grid-2')
  const btns3 = toolbar.container.querySelector('.ql-image-grid-3')
  const btns4 = toolbar.container.querySelector('.ql-image-grid-4')

  if (btns2) btns2.addEventListener('click', () => insertGrid(quill, 2))
  if (btns3) btns3.addEventListener('click', () => insertGrid(quill, 3))
  if (btns4) btns4.addEventListener('click', () => insertGrid(quill, 4))

  enableDragDrop(quill)
}

function insertGrid(quill, cols) {
  const range = quill.getSelection(true)
  const idx = range ? range.index : quill.getLength()

  const cells = Array.from({ length: cols }, (_, i) =>
    `<div class="ql-grid-cell" draggable="true">` +
    `<div class="ql-grid-cell-inner">` +
    `<span class="ql-grid-placeholder">📷 Image ${i + 1}</span>` +
    `</div></div>`
  ).join('')

  const html =
    `<div class="ql-img-grid ql-grid-cols-${cols}" style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:10px;margin:14px 0;">` +
    cells + `</div><p><br></p>`

  quill.clipboard.dangerouslyPasteHTML(idx, html)
  quill.setSelection(idx + 1)
  setTimeout(() => enableDragDrop(quill), 100)
}

function enableDragDrop(quill) {
  const root = quill.root
  let src = null
  root.addEventListener('dragstart', e => {
    const c = e.target.closest('.ql-grid-cell')
    if (!c) return
    src = c; c.classList.add('ql-grid-dragging')
    e.dataTransfer.effectAllowed = 'move'
  }, true)
  root.addEventListener('dragover', e => {
    const c = e.target.closest('.ql-grid-cell')
    if (!c || c === src) return
    e.preventDefault()
    root.querySelectorAll('.ql-grid-cell').forEach(x => x.classList.remove('ql-grid-drag-over'))
    c.classList.add('ql-grid-drag-over')
  }, true)
  root.addEventListener('drop', e => {
    e.preventDefault()
    const c = e.target.closest('.ql-grid-cell')
    if (!c || !src || c === src) return
    const si = src.querySelector('.ql-grid-cell-inner')
    const di = c.querySelector('.ql-grid-cell-inner')
    if (si && di) { const t = si.innerHTML; si.innerHTML = di.innerHTML; di.innerHTML = t }
    c.classList.remove('ql-grid-drag-over')
    src.classList.remove('ql-grid-dragging')
    src = null
  }, true)
  root.addEventListener('dragend', () => {
    root.querySelectorAll('.ql-grid-cell').forEach(x => x.classList.remove('ql-grid-dragging', 'ql-grid-drag-over'))
    src = null
  }, true)
}

/**
 * Inject global CSS for grid rendering (both editor and frontend).
 */
export function injectGridStyles() {
  if (document.getElementById('ql-grid-css')) return
  const s = document.createElement('style')
  s.id = 'ql-grid-css'
  s.textContent = `
.ql-img-grid{display:grid!important;gap:10px;margin:14px 0;width:100%}
.ql-grid-cols-2{grid-template-columns:repeat(2,1fr)!important}
.ql-grid-cols-3{grid-template-columns:repeat(3,1fr)!important}
.ql-grid-cols-4{grid-template-columns:repeat(4,1fr)!important}
.ql-grid-cell{position:relative;min-height:60px;border-radius:6px;overflow:hidden;cursor:grab}
.ql-grid-cell-inner{width:100%;min-height:60px}
.ql-grid-cell img{width:100%;height:auto;display:block;border-radius:4px}
.ql-editor .ql-grid-cell{border:2px dashed #cbd5e1;background:#f8fafc;transition:.2s}
.ql-editor .ql-grid-cell:hover{border-color:#3b82f6;background:#eff6ff}
.ql-editor .ql-grid-cell.ql-grid-dragging{opacity:.4;border-color:#f59e0b}
.ql-editor .ql-grid-cell.ql-grid-drag-over{border-color:#22c55e;background:#f0fdf4}
.ql-grid-placeholder{display:block;padding:16px 8px;text-align:center;font-size:12px;color:#94a3b8}
.ql-editor .ql-grid-cell::after{content:'⠿';position:absolute;top:4px;right:6px;font-size:14px;color:#94a3b8;cursor:grab}
@media(max-width:640px){.ql-grid-cols-3,.ql-grid-cols-4{grid-template-columns:repeat(2,1fr)!important}}
@media(max-width:400px){.ql-grid-cols-2,.ql-grid-cols-3,.ql-grid-cols-4{grid-template-columns:1fr!important}}
`
  document.head.appendChild(s)
}
