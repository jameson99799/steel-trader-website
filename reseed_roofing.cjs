const fs = require('fs')
const path = require('path')
const sqlite3 = require('better-sqlite3')

const dbPath = path.resolve(__dirname, 'data/database.db')
const db = sqlite3(dbPath)

// Clear existing
db.exec('DELETE FROM roofing_profiles')

// Insert new data
const profiles = [
  { model: 'YX25-210-840', type: 'trapezoidal', eff: 840, coil: 1000, h: 25, p: 210, surf: 'ppgi', color: '#1e40af' },
  { model: 'YX25-205-820', type: 'trapezoidal', eff: 820, coil: 1000, h: 25, p: 205, surf: 'gi', color: '' },
  { model: 'YX28-207-828', type: 'trapezoidal', eff: 828, coil: 1000, h: 28, p: 207, surf: 'ppgi', color: '#b91c1c' },
  { model: 'YX15-225-900', type: 'trapezoidal', eff: 900, coil: 1000, h: 15, p: 225, surf: 'gl', color: '' },
  { model: 'YX35-125-750', type: 'trapezoidal', eff: 750, coil: 1000, h: 35, p: 125, surf: 'ppgi', color: '#047857' },
  { model: 'YX18-76-836', type: 'corrugated', eff: 836, coil: 1000, h: 18, p: 76, surf: 'gi', color: '' },
  { model: 'YX18-76-900', type: 'corrugated', eff: 900, coil: 1000, h: 18, p: 76, surf: 'gl', color: '' },
  { model: 'YX65-400', type: 'standing_seam', eff: 400, coil: 500, h: 65, p: 400, surf: 'ppgi', color: '#374151' },
  { model: 'YX65-430', type: 'standing_seam', eff: 430, coil: 500, h: 65, p: 430, surf: 'gl', color: '' },
  { model: 'YX25-200-800 Glazed Tile', type: 'glazed_tile', eff: 800, coil: 1000, h: 25, p: 200, surf: 'ppgi', color: '#991b1b' },
]

const stmt = db.prepare('INSERT INTO roofing_profiles (model, profile_type, effective_width, coil_width, rib_height, pitch, surface, color, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')

let sort = 100
for (const p of profiles) {
  stmt.run(p.model, p.type, p.eff, p.coil, p.h, p.p, p.surf, p.color, sort)
  sort -= 10
}

console.log('Seeded 10 realistic roofing profiles.')
