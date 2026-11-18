// ─────────────────────────────────────────────────────────────────────────────
// AI translation artifact cleaner.
//
// Some AI providers wrap their output in markdown code fences (```html … ```)
// or leave dangling backtick fragments behind. When such debris lands in the
// translations table it leaks straight into the rendered footer/labels as
// visible code (e.g. "`html`" at the start of /hi/, /ru/ footer text).
//
// cleanTranslationText() strips this debris conservatively — only at the very
// start/end of the string, and the backtick-wrapped tag word must be a known
// code-fence language token, so legitimate inline code spans (e.g. `Z275`)
// mid-sentence are never touched.
// ─────────────────────────────────────────────────────────────────────────────

const FENCE_TAG_WORDS = new Set([
  'html', 'json', 'text', 'txt', 'plaintext', 'markdown', 'md',
  'xml', 'javascript', 'js', 'css', 'yaml', 'yml', 'bash', 'sh'
])

function stripOpeningFence(text) {
  // Leading ``` / ```html with optional newline right after it
  return text.replace(/^\s*`{3,}[a-zA-Z0-9_-]*[ \t]*(?:\r?\n)?/, '')
}

function stripClosingFence(text) {
  // Trailing ``` (optionally preceded by a newline)
  return text.replace(/(?:\r?\n)?[ \t]*`{3,}\s*$/, '')
}

function stripLeadingFenceTagToken(text) {
  // Leading dangling tag token like `html` / ```html / `json` (fence debris),
  // optionally followed by whitespace or a stray separator.
  return text.replace(
    new RegExp(`^\\s*\`{1,3}(?:${[...FENCE_TAG_WORDS].join('|')})\`{1,3}[ \\t]*(?:\\r?\\n)?`, 'i'),
    ''
  )
}

function stripStrayBacktickRuns(text) {
  // Bare backtick runs at the very end of the string only — a leading backtick
  // run may legitimately open an inline code span (e.g. `Z275` zinc coating).
  return text.replace(/[ \t]*`+[ \t\r\n]*$/, '')
}

export function cleanTranslationText(value) {
  let text = String(value ?? '')
  if (!text.includes('`')) return text
  // Iterate until stable: fences can arrive doubled or nested.
  for (let pass = 0; pass < 6; pass++) {
    const before = text
    // 1. Consume fence pairs completely first — the stray-run stripper below
    //    must never see a leading ``` or it would leave "html\n" behind.
    let prev
    do {
      prev = text
      text = stripOpeningFence(text)
      text = stripClosingFence(text)
    } while (text !== prev)
    // 2. Dangling backtick-wrapped fence tag (e.g. `html`) at the very start
    text = stripLeadingFenceTagToken(text)
    // 3. Bare stray backtick runs at the string edges
    text = stripStrayBacktickRuns(text)
    if (text === before) break
  }
  return text.trim()
}

export function hasTranslationArtifacts(value) {
  const text = String(value ?? '')
  if (!text.includes('`')) return false
  return cleanTranslationText(text) !== text.trim()
}
