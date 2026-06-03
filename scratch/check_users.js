import Database from 'better-sqlite3'
import { join } from 'path'
import { fileURLToPath } from 'url'
import bcrypt from 'bcryptjs'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const dbPath = join(__dirname, '..', 'data', 'database.db')
const db = new Database(dbPath)

const users = db.prepare('SELECT * FROM users').all()
console.log('Current users:', users)

// Let's reset admin password to admin123
const hashedPassword = bcrypt.hashSync('admin123', 10)
db.prepare('UPDATE users SET password = ? WHERE username = ?').run(hashedPassword, 'admin')
console.log('Password reset to admin123 completed!')
