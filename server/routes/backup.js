import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import fs from 'fs'
import path from 'path'
import archiver from 'archiver'
import AdmZip from 'adm-zip'
import multer from 'multer'
import { closeDb, backupDb } from '../db.js'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.join(__dirname, '../../')

const router = Router()

const upload = multer({ dest: path.join(ROOT_DIR, 'data/temp_upload') })

router.get('/export', authMiddleware, async (req, res) => {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        res.attachment(`site-backup-${timestamp}.zip`)

        const archive = archiver('zip', { zlib: { level: 9 } })
        
        archive.on('error', (err) => {
            console.error('[Backup] Archive error:', err)
            if (!res.headersSent) {
                res.status(500).json({ error: 'Archive creation failed' })
            }
        })

        archive.pipe(res)

        const snapshotPath = path.join(ROOT_DIR, 'data/database.snapshot.db')
        await backupDb(snapshotPath)

        archive.file(snapshotPath, { name: 'data/database.db' })

        const dataDir = path.join(ROOT_DIR, 'data')
        if (fs.existsSync(dataDir)) {
            const files = fs.readdirSync(dataDir)
            for (const file of files) {
                const fullPath = path.join(dataDir, file)
                if (file.endsWith('.db') || file.endsWith('-wal') || file.endsWith('-shm') || file.includes('temp') || file.includes('snapshot')) {
                    continue
                }
                const stat = fs.statSync(fullPath)
                if (stat.isDirectory()) {
                    archive.directory(fullPath, `data/${file}`)
                } else {
                    archive.file(fullPath, { name: `data/${file}` })
                }
            }
        }

        const uploadsDir = path.join(ROOT_DIR, 'uploads')
        if (fs.existsSync(uploadsDir)) {
            archive.directory(uploadsDir, 'uploads')
        }

        const envPath = path.join(ROOT_DIR, '.env')
        if (fs.existsSync(envPath)) {
            archive.file(envPath, { name: '.env' })
        }

        await archive.finalize()

        fs.unlink(snapshotPath, () => {})
    } catch (e) {
        console.error('[Backup Export Error]', e)
        if (!res.headersSent) res.status(500).json({ error: e.message })
    }
})

router.post('/import', authMiddleware, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' })

        const zipPath = req.file.path
        const zip = new AdmZip(zipPath)

        const restoreDir = path.join(ROOT_DIR, 'data/temp_restore')
        if (fs.existsSync(restoreDir)) {
            fs.rmSync(restoreDir, { recursive: true, force: true })
        }
        fs.mkdirSync(restoreDir, { recursive: true })

        zip.extractAllTo(restoreDir, true)

        if (!fs.existsSync(path.join(restoreDir, 'data')) && !fs.existsSync(path.join(restoreDir, 'uploads'))) {
            fs.rmSync(restoreDir, { recursive: true, force: true })
            return res.status(400).json({ error: 'Invalid backup file format' })
        }

        res.json({ success: true, message: 'Restore successful. Server is restarting...' })

        setTimeout(() => {
            console.log('[Backup Import] Shutting down database...')
            closeDb()

            const targetDataDir = path.join(ROOT_DIR, 'data')
            const targetUploadsDir = path.join(ROOT_DIR, 'uploads')
            const targetEnv = path.join(ROOT_DIR, '.env')

            const extractedData = path.join(restoreDir, 'data')
            const extractedUploads = path.join(restoreDir, 'uploads')
            const extractedEnv = path.join(restoreDir, '.env')

            try {
                if (fs.existsSync(extractedData)) {
                    const copyRecursiveSync = function(src, dest) {
                        const exists = fs.existsSync(src);
                        const stats = exists && fs.statSync(src);
                        const isDirectory = exists && stats.isDirectory();
                        if (isDirectory) {
                            if (!fs.existsSync(dest)) fs.mkdirSync(dest);
                            fs.readdirSync(src).forEach(childItemName => {
                                copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
                            });
                        } else {
                            fs.copyFileSync(src, dest);
                        }
                    };
                    
                    if (fs.existsSync(path.join(targetDataDir, 'database.db'))) fs.unlinkSync(path.join(targetDataDir, 'database.db'))
                    if (fs.existsSync(path.join(targetDataDir, 'database.db-wal'))) fs.unlinkSync(path.join(targetDataDir, 'database.db-wal'))
                    if (fs.existsSync(path.join(targetDataDir, 'database.db-shm'))) fs.unlinkSync(path.join(targetDataDir, 'database.db-shm'))
                    
                    copyRecursiveSync(extractedData, targetDataDir)
                }

                if (fs.existsSync(extractedUploads)) {
                    const copyRecursiveSync = function(src, dest) {
                        const exists = fs.existsSync(src);
                        const stats = exists && fs.statSync(src);
                        const isDirectory = exists && stats.isDirectory();
                        if (isDirectory) {
                            if (!fs.existsSync(dest)) fs.mkdirSync(dest);
                            fs.readdirSync(src).forEach(childItemName => {
                                copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
                            });
                        } else {
                            fs.copyFileSync(src, dest);
                        }
                    };
                    copyRecursiveSync(extractedUploads, targetUploadsDir)
                }

                if (fs.existsSync(extractedEnv)) {
                    fs.copyFileSync(extractedEnv, targetEnv)
                }

                fs.rmSync(restoreDir, { recursive: true, force: true })
                fs.unlinkSync(zipPath)

                console.log('[Backup Import] Files swapped successfully. Triggering restart.')
            } catch (swapErr) {
                console.error('[Backup Import] Fatal error during swap:', swapErr)
            } finally {
                process.exit(0)
            }
        }, 1000)

    } catch (e) {
        console.error('[Backup Import Error]', e)
        res.status(500).json({ error: e.message })
    }
})

router.delete('/clear', authMiddleware, async (req, res) => {
    try {
        console.log('[Backup Clear] Shutting down database and clearing all data...')
        
        res.json({ success: true, message: 'All site local data wiped successfully. Server will restart in a moment...' })
        
        // Wait for response to be sent before shutting down
        setTimeout(() => {
            closeDb()
            
            const targetDataDir = path.join(ROOT_DIR, 'data')
            const targetUploadsDir = path.join(ROOT_DIR, 'uploads')
            
            // Delete all files in data/
            if (fs.existsSync(targetDataDir)) {
                fs.readdirSync(targetDataDir).forEach(file => {
                    const fullPath = path.join(targetDataDir, file)
                    if (fs.statSync(fullPath).isFile() && (file.endsWith('.db') || file.endsWith('.sqlite') || file.endsWith('-wal') || file.endsWith('-shm'))) {
                        try { fs.unlinkSync(fullPath) } catch (e) {}
                    }
                })
            }
            
            // Delete all files in uploads/
            if (fs.existsSync(targetUploadsDir)) {
                fs.readdirSync(targetUploadsDir).forEach(file => {
                    const fullPath = path.join(targetUploadsDir, file)
                    if (fs.statSync(fullPath).isFile() && file !== '.gitkeep') {
                        try { fs.unlinkSync(fullPath) } catch (e) {}
                    }
                })
            }
            
            console.log('[Backup Clear] Local data wiped. Exiting process to trigger auto-restart...')
            process.exit(0)
        }, 1000)
    } catch (e) {
        console.error('[Backup Clear Error]', e)
        res.status(500).json({ error: e.message })
    }
})

export default router
