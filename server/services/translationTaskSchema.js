export function initializeTranslationTaskSchema(db) {
  if (!db || typeof db.exec !== 'function') {
    throw new TypeError('translation task schema requires a database instance')
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS translation_tasks (
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

    CREATE INDEX IF NOT EXISTS idx_translation_tasks_status_id
      ON translation_tasks(status, id);

    CREATE INDEX IF NOT EXISTS idx_translation_tasks_target_item
      ON translation_tasks(target_lang, item_type, item_id);
  `)
}
