import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbPath = path.resolve(__dirname, '../data/database.db')
const db = new Database(dbPath)

console.log('--- Starting Article Anchor Fixer ---')

const newsList = db.prepare('SELECT id, title, content FROM news').all()

let updatedCount = 0

for (const news of newsList) {
    if (!news.content) continue

    let updatedContent = news.content
    let changed = false

    // We will standardize all TOC links and related headings
    // 1. Find the TOC block
    const tocMatch = updatedContent.match(/<div class=["']table-of-contents["'][^>]*>([\s\S]*?)<\/div>/i)
    if (!tocMatch) continue // no standard AI TOC

    let tocInnerHtml = tocMatch[1]
    
    // Find all anchors in TOC
    const anchors = [...tocInnerHtml.matchAll(/<a[^>]*href=["'](#.*?)["'][^>]*>/gi)]
    if (anchors.length === 0) continue

    const anchorIds = anchors.map(m => m[1].replace('#', ''))
    
    // Check if the body actually has these IDs in H1~H6 tags
    // If we just blindly replace them, the IDs will definitely align
    for (let i = 0; i < anchorIds.length; i++) {
        const oldId = anchorIds[i]
        const newId = `toc-sec-${i+1}`

        // Only do it if it's not already toc-sec
        if (oldId === newId || oldId.startsWith('toc-sec-')) continue

        // Replace the href in TOC
        // Need to be careful to only replace exact hash match
        const hrefRegex = new RegExp(`href=["']#${oldId}["']`, 'gi')
        tocInnerHtml = tocInnerHtml.replace(hrefRegex, `href="#${newId}"`)

        // Replace the id in the body tag (e.g., <h2 id="oldId">)
        const idRegex = new RegExp(`id=["']${oldId}["']`, 'gi')
        updatedContent = updatedContent.replace(idRegex, `id="${newId}"`)
        changed = true
    }

    if (changed) {
        // Re-inject the fixed TOC
        updatedContent = updatedContent.replace(
            /<div class=["']table-of-contents["'][^>]*>[\s\S]*?<\/div>/i, 
            `<div class="table-of-contents">${tocInnerHtml}</div>`
        )

        // Make sure no dark backgrounds are hard-coded in the TOC logic
        updatedContent = updatedContent.replace(/<div class=["']table-of-contents["'][^>]*style=["'][^>]*background[^>]*>([\s\S]*?)<\/div>/ig, '<div class="table-of-contents">$1</div>')

        db.prepare('UPDATE news SET content = ? WHERE id = ?').run(updatedContent, news.id)
        console.log(`[Success] Re-wired anchors for Article ID ${news.id}: ${news.title.substring(0, 30)}...`)
        updatedCount++
    }
}

console.log(`\n--- Finished! Updated ${updatedCount} articles. ---`)
db.close()
