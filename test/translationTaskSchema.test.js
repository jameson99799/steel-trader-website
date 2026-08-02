import test from 'node:test'
import assert from 'node:assert/strict'
import Database from 'better-sqlite3'

import { initializeTranslationTaskSchema } from '../server/services/translationTaskSchema.js'

test('creates the translation queue schema required by the worker', () => {
  const db = new Database(':memory:')

  initializeTranslationTaskSchema(db)

  assert.deepEqual(
    db.prepare('PRAGMA table_info(translation_tasks)').all().map(row => row.name),
    [
      'id',
      'target_lang',
      'item_type',
      'item_id',
      'item_name',
      'status',
      'retry_count',
      'error_message',
      'created_at',
      'updated_at'
    ]
  )

  const indexes = db.prepare("PRAGMA index_list('translation_tasks')").all().map(row => row.name)
  assert.ok(indexes.includes('idx_translation_tasks_status_id'))
  assert.ok(indexes.includes('idx_translation_tasks_target_item'))
  db.close()
})

test('is idempotent and preserves existing queue rows', () => {
  const db = new Database(':memory:')
  initializeTranslationTaskSchema(db)
  db.prepare(`
    INSERT INTO translation_tasks (target_lang, item_type, item_id, item_name)
    VALUES ('zh', 'news', 7, 'News 7')
  `).run()

  initializeTranslationTaskSchema(db)

  assert.deepEqual(
    db.prepare(`
      SELECT target_lang, item_type, item_id, item_name, status, retry_count
      FROM translation_tasks
    `).get(),
    {
      target_lang: 'zh',
      item_type: 'news',
      item_id: 7,
      item_name: 'News 7',
      status: 'pending',
      retry_count: 0
    }
  )
  db.close()
})

test('upgrades an existing compatible queue without replacing rows', () => {
  const db = new Database(':memory:')
  db.exec(`
    CREATE TABLE translation_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_lang TEXT NOT NULL,
      item_type TEXT NOT NULL,
      item_id INTEGER NOT NULL,
      item_name TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      retry_count INTEGER NOT NULL DEFAULT 0,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    INSERT INTO translation_tasks (target_lang, item_type, item_id)
    VALUES ('hi', 'product', 12);
  `)

  initializeTranslationTaskSchema(db)

  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM translation_tasks').get().count, 1)
  assert.equal(db.prepare('SELECT target_lang FROM translation_tasks').get().target_lang, 'hi')
  db.close()
})
